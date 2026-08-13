"""Manufacturing store workflow: stock in, material request/issue, return, consume."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.inventory import (
    InventoryItem,
    StockLevel,
    StockMovement,
    StoreIssueRequest,
    Warehouse,
)
from app.models.procurement import MaterialRequest, MaterialRequestLine
from app.schemas.inventory import StockMovementCreate
from app.schemas.store_workflow import (
    PurchaseRequisitionCreated,
    PurchaseRequisitionFromLowStock,
    StoreConsumeCreate,
    StoreDashboardRead,
    StoreIssueRequestCreate,
    StoreIssueRequestRead,
    StoreReturnCreate,
    StoreReturnRead,
    StoreStockInCreate,
    StoreStockInRead,
)
from app.services.inventory_service import get_total_stock, record_stock_movement


def _next_number(db: Session, tenant_id: int, prefix: str, model, field) -> str:
    """Year-scoped sequential label. Prefer max(request_number) when available."""
    year = date.today().year
    pattern = f"{prefix}-{year}-%"
    if hasattr(model, "request_number"):
        col = model.request_number
        values = list(
            db.scalars(
                select(col).where(model.tenant_id == tenant_id, col.like(pattern))
            ).all()
        )
        next_n = 1
        for val in values:
            try:
                next_n = max(next_n, int(str(val).rsplit("-", 1)[-1]) + 1)
            except ValueError:
                continue
        return f"{prefix}-{year}-{next_n:04d}"
    # StockMovement and similar: count-based within tenant (legacy; still flush-safe in one txn)
    count = int(
        db.scalar(select(func.count()).select_from(model).where(model.tenant_id == tenant_id))
        or 0
    )
    return f"{prefix}-{year}-{count + 1:04d}"


def _item_stock(db: Session, warehouse_id: int, item_id: int) -> int:
    sl = db.scalars(
        select(StockLevel).where(
            StockLevel.warehouse_id == warehouse_id,
            StockLevel.item_id == item_id,
        )
    ).first()
    return int(sl.quantity) if sl else 0


def _to_request_read(db: Session, row: StoreIssueRequest) -> StoreIssueRequestRead:
    wh = db.get(Warehouse, row.warehouse_id)
    item = db.get(InventoryItem, row.item_id)
    return StoreIssueRequestRead(
        id=row.id,
        request_number=row.request_number,
        warehouse_id=row.warehouse_id,
        warehouse_name=wh.name if wh else "—",
        item_id=row.item_id,
        item_name=item.name if item else "—",
        quantity=row.quantity,
        operator_name=row.operator_name,
        employee_id=row.employee_id,
        machine=row.machine,
        shift=row.shift,
        reason=row.reason,
        status=row.status,
        approved_by=row.approved_by,
        issued_by=row.issued_by,
        issued_qty=row.issued_qty,
        used_qty=row.used_qty,
        waste_qty=row.waste_qty,
        returned_qty=row.returned_qty,
        notes=row.notes,
        current_stock=_item_stock(db, row.warehouse_id, row.item_id),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def create_stock_in(
    db: Session, tenant_id: int, payload: StoreStockInCreate, received_by: str | None
) -> StoreStockInRead:
    item = db.get(InventoryItem, payload.item_id)
    wh = db.get(Warehouse, payload.warehouse_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(404, "Product not found")
    if not wh or wh.tenant_id != tenant_id:
        raise HTTPException(404, "Warehouse not found")

    previous = _item_stock(db, payload.warehouse_id, payload.item_id)
    txn = _next_number(db, tenant_id, "SIN", StockMovement, StockMovement.id)
    ref_parts = [txn]
    if payload.supplier_name:
        ref_parts.append(f"SUP:{payload.supplier_name}")
    if payload.notes:
        ref_parts.append(payload.notes[:60])

    mov = record_stock_movement(
        db,
        StockMovementCreate(
            tenant_id=tenant_id,
            warehouse_id=payload.warehouse_id,
            item_id=payload.item_id,
            quantity=payload.quantity,
            movement_type="in",
            reference=" | ".join(ref_parts),
            batch_number=payload.batch_number,
            created_by=received_by or "Store",
        ),
    )
    current = _item_stock(db, payload.warehouse_id, payload.item_id)
    return StoreStockInRead(
        transaction_number=txn,
        movement_id=mov.id,
        warehouse_id=wh.id,
        warehouse_name=wh.name,
        item_id=item.id,
        item_name=item.name,
        quantity=payload.quantity,
        previous_stock=previous,
        current_stock=current,
        received_by=received_by,
        created_at=mov.created_at,
    )


def create_issue_request(
    db: Session, tenant_id: int, payload: StoreIssueRequestCreate
) -> StoreIssueRequestRead:
    item = db.get(InventoryItem, payload.item_id)
    wh = db.get(Warehouse, payload.warehouse_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(404, "Product not found")
    if not wh or wh.tenant_id != tenant_id:
        raise HTTPException(404, "Warehouse not found")

    req_no = _next_number(db, tenant_id, "SMR", StoreIssueRequest, StoreIssueRequest.id)
    row = StoreIssueRequest(
        tenant_id=tenant_id,
        request_number=req_no,
        warehouse_id=payload.warehouse_id,
        item_id=payload.item_id,
        quantity=payload.quantity,
        operator_name=payload.operator_name.strip(),
        employee_id=payload.employee_id,
        machine=payload.machine,
        shift=payload.shift,
        reason=payload.reason,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_request_read(db, row)


def list_issue_requests(
    db: Session, tenant_id: int, status: str | None = None
) -> list[StoreIssueRequestRead]:
    stmt = select(StoreIssueRequest).where(StoreIssueRequest.tenant_id == tenant_id)
    if status:
        stmt = stmt.where(StoreIssueRequest.status == status)
    stmt = stmt.order_by(StoreIssueRequest.id.desc())
    return [_to_request_read(db, r) for r in db.scalars(stmt).all()]


def approve_issue_request(
    db: Session, tenant_id: int, request_id: int, approved_by: str, notes: str | None = None
) -> StoreIssueRequestRead:
    row = db.scalars(
        select(StoreIssueRequest).where(
            StoreIssueRequest.id == request_id,
            StoreIssueRequest.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(404, "Material request not found")
    if row.status != "pending":
        raise HTTPException(400, f"Cannot approve request in status '{row.status}'")
    row.status = "approved"
    row.approved_by = approved_by
    if notes:
        row.notes = notes
    db.commit()
    db.refresh(row)
    return _to_request_read(db, row)


def reject_issue_request(
    db: Session, tenant_id: int, request_id: int, rejected_by: str, notes: str | None = None
) -> StoreIssueRequestRead:
    row = db.scalars(
        select(StoreIssueRequest).where(
            StoreIssueRequest.id == request_id,
            StoreIssueRequest.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(404, "Material request not found")
    if row.status not in ("pending", "approved"):
        raise HTTPException(400, f"Cannot reject request in status '{row.status}'")
    row.status = "rejected"
    row.approved_by = rejected_by
    if notes:
        row.notes = notes
    db.commit()
    db.refresh(row)
    return _to_request_read(db, row)


def issue_material(
    db: Session,
    tenant_id: int,
    request_id: int,
    issued_by: str,
    issued_qty: int | None = None,
    notes: str | None = None,
) -> StoreIssueRequestRead:
    row = db.scalars(
        select(StoreIssueRequest).where(
            StoreIssueRequest.id == request_id,
            StoreIssueRequest.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(404, "Material request not found")
    if row.status not in ("approved", "pending"):
        raise HTTPException(400, f"Cannot issue material for status '{row.status}'")

    qty = int(issued_qty or row.quantity)
    if qty <= 0:
        raise HTTPException(400, "Issue quantity must be greater than zero")
    if qty > row.quantity:
        raise HTTPException(400, "Issue quantity cannot exceed requested quantity")

    if row.status == "pending":
        row.status = "approved"
        row.approved_by = issued_by

    record_stock_movement(
        db,
        StockMovementCreate(
            tenant_id=tenant_id,
            warehouse_id=row.warehouse_id,
            item_id=row.item_id,
            quantity=qty,
            movement_type="out",
            reference=f"{row.request_number} | OP:{row.operator_name}"
            + (f" | MACHINE:{row.machine}" if row.machine else ""),
            created_by=issued_by,
        ),
        commit=False,
    )
    row.status = "issued"
    row.issued_by = issued_by
    row.issued_qty = qty
    if notes:
        row.notes = notes
    db.commit()
    db.refresh(row)
    return _to_request_read(db, row)


def confirm_received(
    db: Session, tenant_id: int, request_id: int, operator_name: str | None = None
) -> StoreIssueRequestRead:
    row = db.scalars(
        select(StoreIssueRequest).where(
            StoreIssueRequest.id == request_id,
            StoreIssueRequest.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(404, "Material request not found")
    if row.status != "issued":
        raise HTTPException(400, "Only issued requests can be confirmed as received")
    row.status = "received"
    if operator_name:
        row.notes = ((row.notes or "") + f" | Received by {operator_name}").strip(" |")
    db.commit()
    db.refresh(row)
    return _to_request_read(db, row)


def record_consumption(
    db: Session, tenant_id: int, request_id: int, payload: StoreConsumeCreate, user_name: str
) -> StoreIssueRequestRead:
    row = db.scalars(
        select(StoreIssueRequest).where(
            StoreIssueRequest.id == request_id,
            StoreIssueRequest.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(404, "Material request not found")
    if row.status not in ("issued", "received"):
        raise HTTPException(400, "Consumption allowed only after material is issued")

    issued = int(row.issued_qty or row.quantity)
    total = payload.used_qty + payload.waste_qty + payload.returned_qty
    if total > issued:
        raise HTTPException(
            400,
            f"Used + waste + returned ({total}) cannot exceed issued quantity ({issued})",
        )

    if payload.returned_qty > 0:
        record_stock_movement(
            db,
            StockMovementCreate(
                tenant_id=tenant_id,
                warehouse_id=row.warehouse_id,
                item_id=row.item_id,
                quantity=payload.returned_qty,
                movement_type="return",
                reference=f"{row.request_number} | RETURN",
                created_by=user_name,
            ),
            commit=False,
        )
    if payload.waste_qty > 0:
        # Waste already issued (OUT); log scrap for history without double-deducting
        mov = StockMovement(
            tenant_id=tenant_id,
            warehouse_id=row.warehouse_id,
            item_id=row.item_id,
            quantity=payload.waste_qty,
            movement_type="scrap",
            reference=f"{row.request_number} | WASTE (already issued)",
            created_by=user_name,
        )
        db.add(mov)

    row.used_qty = payload.used_qty
    row.waste_qty = payload.waste_qty
    row.returned_qty = payload.returned_qty
    row.status = "closed"
    if payload.notes:
        row.notes = payload.notes
    db.commit()
    db.refresh(row)
    return _to_request_read(db, row)


def create_stock_return(
    db: Session, tenant_id: int, payload: StoreReturnCreate, created_by: str | None
) -> StoreReturnRead:
    item = db.get(InventoryItem, payload.item_id)
    wh = db.get(Warehouse, payload.warehouse_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(404, "Product not found")
    if not wh or wh.tenant_id != tenant_id:
        raise HTTPException(404, "Warehouse not found")

    previous = _item_stock(db, payload.warehouse_id, payload.item_id)
    txn = _next_number(db, tenant_id, "SRT", StockMovement, StockMovement.id)
    ref = txn
    if payload.operator_name:
        ref += f" | OP:{payload.operator_name}"
    if payload.machine:
        ref += f" | MACHINE:{payload.machine}"
    if payload.request_id:
        ref += f" | REQ:{payload.request_id}"

    mov = record_stock_movement(
        db,
        StockMovementCreate(
            tenant_id=tenant_id,
            warehouse_id=payload.warehouse_id,
            item_id=payload.item_id,
            quantity=payload.quantity,
            movement_type="return",
            reference=ref,
            created_by=created_by or "Store",
        ),
    )
    current = _item_stock(db, payload.warehouse_id, payload.item_id)
    return StoreReturnRead(
        transaction_number=txn,
        movement_id=mov.id,
        warehouse_name=wh.name,
        item_name=item.name,
        quantity=payload.quantity,
        previous_stock=previous,
        current_stock=current,
        created_by=created_by,
    )


def get_store_dashboard(db: Session, tenant_id: int) -> StoreDashboardRead:
    items = list(
        db.scalars(
            select(InventoryItem).where(
                InventoryItem.tenant_id == tenant_id,
                InventoryItem.is_active.is_(True),
            )
        ).all()
    )
    total_products = len(items)
    current_qty = 0
    low = 0
    out = 0
    for item in items:
        qty = get_total_stock(db, item.id)
        reserved = int(getattr(item, "reserved", 0) or 0)
        available = max(0, qty - reserved)
        current_qty += qty
        if qty <= 0:
            out += 1
        elif item.reorder_level and available <= item.reorder_level:
            low += 1

    today = date.today()
    todays_in = int(
        db.scalar(
            select(func.count(StockMovement.id)).where(
                StockMovement.tenant_id == tenant_id,
                StockMovement.movement_type.in_(["in", "return", "purchase"]),
                func.date(StockMovement.created_at) == today,
            )
        )
        or 0
    )
    todays_out = int(
        db.scalar(
            select(func.count(StockMovement.id)).where(
                StockMovement.tenant_id == tenant_id,
                StockMovement.movement_type.in_(["out", "issue", "material_issue"]),
                func.date(StockMovement.created_at) == today,
            )
        )
        or 0
    )
    pending_req = int(
        db.scalar(
            select(func.count(StoreIssueRequest.id)).where(
                StoreIssueRequest.tenant_id == tenant_id,
                StoreIssueRequest.status == "pending",
            )
        )
        or 0
    )
    pending_pr = int(
        db.scalar(
            select(func.count(MaterialRequest.id)).where(
                MaterialRequest.tenant_id == tenant_id,
                MaterialRequest.approval_status == "pending",
            )
        )
        or 0
    )

    warehouses = list(db.scalars(select(Warehouse).where(Warehouse.tenant_id == tenant_id)).all())
    util = 0.0
    if warehouses:
        caps = [w.capacity or 0 for w in warehouses]
        used = [w.used_capacity or 0 for w in warehouses]
        total_cap = sum(caps)
        if total_cap > 0:
            util = round(100.0 * sum(used) / total_cap, 1)

    return StoreDashboardRead(
        total_products=total_products,
        current_inventory_qty=current_qty,
        low_stock_items=low,
        out_of_stock_items=out,
        todays_stock_in=todays_in,
        todays_material_issues=todays_out,
        pending_material_requests=pending_req,
        pending_purchase_requisitions=pending_pr,
        warehouse_utilization_pct=util,
    )


def create_pr_from_low_stock(
    db: Session, tenant_id: int, payload: PurchaseRequisitionFromLowStock, requested_by: str
) -> PurchaseRequisitionCreated:
    item = db.get(InventoryItem, payload.item_id)
    if not item or item.tenant_id != tenant_id:
        raise HTTPException(404, "Product not found")

    current = get_total_stock(db, item.id)
    min_stock = int(item.reorder_level or 0)
    recommended = payload.recommended_qty
    if recommended is None:
        recommended = max(min_stock * 2 - current, min_stock or 1, 1)

    year = date.today().year
    count = int(
        db.scalar(
            select(func.count(MaterialRequest.id)).where(MaterialRequest.tenant_id == tenant_id)
        )
        or 0
    )
    mr_number = f"PR-{year}-{count + 1:04d}"
    mr = MaterialRequest(
        tenant_id=tenant_id,
        mr_number=mr_number,
        request_date=date.today(),
        required_date=None,
        requested_by=requested_by,
        status="pending",
        notes=payload.notes
        or f"Auto PR from low stock. Current={current}, Min={min_stock}",
    )
    db.add(mr)
    db.flush()
    db.add(
        MaterialRequestLine(
            material_request_id=mr.id,
            item_id=item.id,
            quantity=float(recommended),
            notes=f"Current stock: {current}; Min: {min_stock}",
        )
    )
    db.commit()
    db.refresh(mr)
    return PurchaseRequisitionCreated(
        id=mr.id,
        mr_number=mr.mr_number,
        item_id=item.id,
        item_name=item.name,
        quantity=int(recommended),
        current_stock=current,
        min_stock=min_stock,
    )


def list_enriched_movements(
    db: Session,
    tenant_id: int,
    *,
    item_id: int | None = None,
    warehouse_id: int | None = None,
    movement_type: str | None = None,
    user_name: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 200,
) -> list[dict]:
    stmt = select(StockMovement).where(StockMovement.tenant_id == tenant_id)
    if item_id:
        stmt = stmt.where(StockMovement.item_id == item_id)
    if warehouse_id:
        stmt = stmt.where(StockMovement.warehouse_id == warehouse_id)
    if movement_type:
        stmt = stmt.where(StockMovement.movement_type == movement_type)
    if user_name:
        stmt = stmt.where(StockMovement.created_by.ilike(f"%{user_name}%"))
    if date_from:
        stmt = stmt.where(func.date(StockMovement.created_at) >= date_from)
    if date_to:
        stmt = stmt.where(func.date(StockMovement.created_at) <= date_to)
    stmt = stmt.order_by(StockMovement.id.desc()).limit(limit)
    rows = list(db.scalars(stmt).all())
    wh_map = {
        w.id: w.name
        for w in db.scalars(select(Warehouse).where(Warehouse.tenant_id == tenant_id)).all()
    }
    item_map = {
        i.id: i.name
        for i in db.scalars(select(InventoryItem).where(InventoryItem.tenant_id == tenant_id)).all()
    }
    out = []
    for m in rows:
        ref = m.reference or ""
        machine = None
        if "MACHINE:" in ref:
            try:
                machine = ref.split("MACHINE:")[1].split("|")[0].strip()
            except Exception:
                machine = None
        out.append(
            {
                "id": m.id,
                "date": m.created_at.isoformat() if m.created_at else None,
                "transaction": m.movement_type,
                "product": item_map.get(m.item_id, "—"),
                "item_id": m.item_id,
                "quantity": m.quantity,
                "user": m.created_by or "System",
                "machine": machine,
                "warehouse": wh_map.get(m.warehouse_id, "—"),
                "warehouse_id": m.warehouse_id,
                "reference": m.reference,
                "batch_number": m.batch_number,
            }
        )
    return out

"""Job Card = Work Order shop-floor document.

Aggregates Production Order, BOM materials, QC, dispatch, and invoice
from existing tables — no separate job_cards table.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.production import ProductionOrder, WorkOrder
from app.models.quality import QualityInspection
from app.models.sales import DispatchShipment, Invoice, SalesOrder
from app.models.user import User
from app.services.manufacturing_workflow_service import get_bom_requirements
from app.services.work_order_service import (
    COMPLETED_STATUSES,
    RUNNING_STATUSES,
    _to_list_read,
    _wo_context,
    get_work_order_detail,
    list_work_orders_enriched,
)


def _fmt_dt(value: datetime | None) -> str | None:
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone().strftime("%d-%b-%Y %I:%M %p")


def _fmt_date(value) -> str | None:
    if not value:
        return None
    if hasattr(value, "strftime"):
        return value.strftime("%d-%b-%Y")
    return str(value)


def _stage(id_: str, number: int, title: str, description: str, status: str) -> dict[str, Any]:
    # status: completed | current | pending | blocked
    return {
        "id": id_,
        "number": number,
        "title": title,
        "description": description,
        "status": status,
    }


def _derive_workflow(
    *,
    has_sales_order: bool,
    has_production_order: bool,
    materials_issued: bool,
    has_shortage: bool,
    wo_status: str,
    qc_result: str | None,
    packing_done: bool,
    dispatched: bool,
    invoiced: bool,
) -> list[dict[str, Any]]:
    """8-stage ribbon matching Job Card Workflow reference."""
    st = (wo_status or "").lower()
    completed = st in COMPLETED_STATUSES or st in {"done", "closed"}
    qc_pass = (qc_result or "").lower() in {"pass", "passed", "approved"}
    qc_fail = (qc_result or "").lower() in {"fail", "failed", "rejected"}
    qc_rework = (qc_result or "").lower() in {"rework", "conditional"}

    sales_done = True  # confirmed or N/A once a job card exists
    pr_done = bool(has_production_order)
    jc_done = True
    mat_done = materials_issued
    prod_done = completed
    qc_done = qc_pass
    pack_ship_done = bool(dispatched)  # dispatch implies packing path complete enough
    if packing_done and dispatched:
        pack_ship_done = True
    elif packing_done and not dispatched:
        pack_ship_done = False
    bill_done = invoiced

    # silence unused — has_sales_order reserved for future strict SO gating
    _ = has_sales_order

    order = [
        "sales_order",
        "production_request",
        "job_card",
        "material_issue",
        "production",
        "quality",
        "packing_dispatch",
        "billing",
    ]
    done_map = {
        "sales_order": sales_done,
        "production_request": pr_done,
        "job_card": jc_done,
        "material_issue": mat_done,
        "production": prod_done,
        "quality": qc_done,
        "packing_dispatch": pack_ship_done,
        "billing": bill_done,
    }
    blocked_map = {
        "material_issue": (not mat_done) and has_shortage,
        "quality": qc_fail or qc_rework,
    }

    current = None
    for key in order:
        if blocked_map.get(key) and not done_map[key]:
            current = key
            break
        if not done_map[key]:
            current = key
            break
    if current is None:
        current = "closed" if bill_done else "billing"

    def status_for(key: str) -> str:
        if blocked_map.get(key) and not done_map[key]:
            return "blocked"
        if done_map[key]:
            return "completed"
        if key == current:
            return "current"
        return "pending"

    return [
        _stage(
            "sales_order",
            1,
            "Sales Order Created",
            "Sales Team creates customer order.",
            status_for("sales_order"),
        ),
        _stage(
            "production_request",
            2,
            "Production Request",
            "Production request created from Sales Order.",
            status_for("production_request"),
        ),
        _stage(
            "job_card",
            3,
            "Job Card Created",
            "Production Manager reviews and creates Job Card.",
            status_for("job_card"),
        ),
        _stage(
            "material_issue",
            4,
            "Material Issued",
            "Store issues required materials for production.",
            status_for("material_issue"),
        ),
        _stage(
            "production",
            5,
            "Production Execution",
            "Operator starts production and updates progress.",
            status_for("production"),
        ),
        _stage(
            "quality",
            6,
            "Quality Check",
            "Quality team inspects and approves.",
            status_for("quality"),
        ),
        _stage(
            "packing_dispatch",
            7,
            "Packing & Dispatch",
            "Packing completed and goods dispatched.",
            status_for("packing_dispatch"),
        ),
        _stage(
            "billing",
            8,
            "Invoice & Billing",
            "Invoice generated and accounting completed.",
            status_for("billing"),
        ),
    ]



def build_job_card(
    db: Session, tenant_id: int, work_order_id: int, user: User | None = None
) -> dict[str, Any] | None:
    detail = get_work_order_detail(db, tenant_id, work_order_id, user=user)
    if not detail:
        return None

    wo = db.scalars(
        select(WorkOrder).where(WorkOrder.id == work_order_id, WorkOrder.tenant_id == tenant_id)
    ).first()
    if not wo:
        return None

    ctx = _wo_context(db, tenant_id, wo)
    po: ProductionOrder | None = ctx.get("po")
    product = ctx.get("product")
    machine = ctx.get("machine")

    so: SalesOrder | None = None
    customer_name = detail.customer_name or (po.customer_name if po else None)
    if po and po.sales_order_id:
        so = db.scalars(
            select(SalesOrder).where(
                SalesOrder.id == po.sales_order_id, SalesOrder.tenant_id == tenant_id
            )
        ).first()
        if so and so.customer_id and not customer_name:
            from app.models.sales import Customer

            cust = db.get(Customer, so.customer_id)
            if cust:
                customer_name = cust.name

    # Materials with available / shortage from live stock
    materials: list[dict[str, Any]] = []
    has_shortage = False
    if po and po.product_id:
        for req in get_bom_requirements(
            db, tenant_id, po.product_id, float(wo.planned_quantity or 0)
        ):
            required = float(req["required_qty"])
            available = float(req["available_qty"])
            shortage = float(req["shortage_qty"])
            issued = required if wo.materials_issued else 0.0
            to_issue = max(required - issued, 0.0)
            if shortage > 0:
                has_shortage = True
            status = "available" if shortage <= 0 else "shortage"
            materials.append(
                {
                    "item_id": req["item_id"],
                    "material": req["component_name"],
                    "sku": req.get("sku"),
                    "required": required,
                    "available": available,
                    "to_issue": to_issue,
                    "issued": issued,
                    "shortage": shortage,
                    "unit": req.get("unit") or "pcs",
                    "status": status,
                    "status_label": (
                        "Available"
                        if shortage <= 0
                        else f"Shortage {shortage:g} {req.get('unit') or ''}".strip()
                    ),
                }
            )

    # Quality by work_order_number
    qc_rows = list(
        db.scalars(
            select(QualityInspection)
            .where(
                QualityInspection.tenant_id == tenant_id,
                QualityInspection.work_order_number == wo.work_order_number,
            )
            .order_by(QualityInspection.id.desc())
        ).all()
    )
    if not qc_rows and so and so.order_number:
        qc_rows = list(
            db.scalars(
                select(QualityInspection)
                .where(
                    QualityInspection.tenant_id == tenant_id,
                    QualityInspection.sales_order_number == so.order_number,
                    QualityInspection.inspection_type == "final",
                )
                .order_by(QualityInspection.id.desc())
            ).all()
        )

    final_qc = next(
        (q for q in qc_rows if (q.inspection_type or "") == "final"),
        qc_rows[0] if qc_rows else None,
    )
    packing_done = False
    if final_qc and (getattr(final_qc, "packing_status", None) or "").lower() in {
        "packed",
        "ready_for_pack",
        "completed",
    }:
        packing_done = True
    if so and getattr(so, "packed", False):
        packing_done = True

    dispatch = None
    if so:
        dispatch = db.scalars(
            select(DispatchShipment)
            .where(
                DispatchShipment.tenant_id == tenant_id,
                DispatchShipment.sales_order_id == so.id,
            )
            .order_by(DispatchShipment.id.desc())
        ).first()
    dispatched = bool(
        (so and getattr(so, "shipped", False))
        or (dispatch and (dispatch.status or "").lower() in {"shipped", "delivered", "completed"})
    )

    invoice = None
    if so:
        invoice = db.scalars(
            select(Invoice)
            .where(Invoice.tenant_id == tenant_id, Invoice.sales_order_id == so.id)
            .order_by(Invoice.id.desc())
        ).first()
    invoiced = bool((so and getattr(so, "invoiced", False)) or invoice)

    target = float(wo.planned_quantity or 0)
    produced = float(detail.produced_quantity or wo.actual_quantity or 0)
    rejected = float(detail.scrap_quantity or 0)
    rework = float(detail.rework_quantity or 0)
    good = max(produced - rejected - rework, 0.0)
    balance = max(target - good, 0.0)

    display_status = (wo.status or "planned").replace("_", " ").upper()
    if display_status in {"RUNNING", "IN PROGRESS"}:
        display_status = "IN PROGRESS"
    elif display_status in {"COMPLETED", "DONE", "CLOSED"}:
        display_status = "COMPLETED"

    workflow = _derive_workflow(
        has_sales_order=bool(so or (po and (po.sales_order_id or po.sales_order_number))),
        has_production_order=bool(po),
        materials_issued=bool(wo.materials_issued),
        has_shortage=has_shortage,
        wo_status=wo.status or "",
        qc_result=final_qc.result if final_qc else None,
        packing_done=packing_done,
        dispatched=dispatched,
        invoiced=invoiced,
    )

    closed = invoiced and dispatched and packing_done and (
        (wo.status or "").lower() in COMPLETED_STATUSES
    )

    status_timeline = [
        {"label": "Sales Order Confirmed", "done": bool(so or (po and (po.sales_order_id or po.sales_order_number))) or bool(wo.id)},
        {"label": "Production Planned", "done": bool(po)},
        {"label": "Material Issued", "done": bool(wo.materials_issued)},
        {"label": "Production Completed", "done": (wo.status or "").lower() in COMPLETED_STATUSES},
        {
            "label": "Quality Approved",
            "done": bool(final_qc and (final_qc.result or "").lower() in {"pass", "passed", "approved"}),
        },
        {"label": "Packing Completed", "done": packing_done},
        {"label": "Dispatch Completed", "done": dispatched},
        {"label": "Invoice Generated", "done": invoiced},
    ]

    approvals: list[dict[str, Any]] = [
        {
            "step": "Created By",
            "name": wo.supervisor or detail.supervisor or "Production",
            "at": _fmt_dt(wo.created_at),
            "role": "Production Manager",
        }
    ]
    if wo.materials_issued:
        approvals.append(
            {
                "step": "Material Issued",
                "name": "Store",
                "at": _fmt_dt(wo.updated_at),
                "role": "Store",
            }
        )
    if final_qc:
        approvals.append(
            {
                "step": "QC Approved" if (final_qc.result or "").lower() in {"pass", "passed"} else "QC Recorded",
                "name": final_qc.inspector or "QC",
                "at": _fmt_date(final_qc.inspection_date),
                "role": "Quality",
            }
        )
    if dispatch:
        approvals.append(
            {
                "step": "Dispatch Verified",
                "name": dispatch.driver_name or "Logistics",
                "at": _fmt_date(dispatch.dispatch_date),
                "role": "Dispatch",
            }
        )
    if invoice:
        approvals.append(
            {
                "step": "Invoice Verified",
                "name": "Accounts",
                "at": _fmt_date(invoice.issue_date),
                "role": "Accounts",
            }
        )

    return {
        "id": wo.id,
        "job_card_no": wo.work_order_number,
        "work_order_id": wo.id,
        "work_order_number": wo.work_order_number,
        "status": wo.status,
        "display_status": display_status,
        "priority": wo.priority or (po.priority if po else None) or "medium",
        "header": {
            "sales_order_id": so.id if so else (po.sales_order_id if po else None),
            "sales_order_no": (so.order_number if so else None)
            or (po.sales_order_number if po else None),
            "customer": customer_name,
            "product": detail.product_name or (product.name if product else None),
            "product_id": po.product_id if po else None,
            "order_qty": float(po.planned_quantity if po else wo.planned_quantity or 0),
            "uom": "Nos",
            "required_delivery": _fmt_date(so.delivery_date if so else None)
            or _fmt_date(po.due_date if po else None),
            "job_card_date": _fmt_dt(wo.created_at),
            "planned_start": _fmt_dt(wo.planned_start),
            "planned_end": _fmt_dt(wo.planned_end),
            "packing_time": None,
            "dispatch_date": _fmt_date(dispatch.dispatch_date) if dispatch else None,
            "delivery_date": _fmt_date(so.delivery_date if so else None)
            or _fmt_date(po.due_date if po else None),
            "production_manager": wo.supervisor or detail.supervisor,
            "department": wo.department or detail.department or (po.department if po else None),
            "production_type": "Manufacturing",
            "plant": wo.plant_code,
            "remarks": None,
            "production_order_id": wo.production_order_id,
            "production_order_no": detail.production_order_number,
        },
        "summary": {
            "target_qty": target,
            "produced_qty": produced,
            "rejected_qty": rejected,
            "rework_qty": rework,
            "good_qty": good,
            "balance_qty": balance,
            "progress_pct": float(detail.progress_pct or 0),
        },
        "materials": materials,
        "materials_issued": bool(wo.materials_issued),
        "has_shortage": has_shortage,
        "machine": {
            "machine_id": wo.machine_id,
            "machine_name": detail.machine_name or (machine.name if machine else None),
            "machine_code": detail.machine_code,
            "operation": None,
            "setup_time": None,
            "start_time": _fmt_dt(wo.planned_start),
            "end_time": _fmt_dt(wo.planned_end),
            "planned_hours": None,
        },
        "operator": {
            "assigned_user_id": wo.assigned_user_id,
            "operator_name": detail.operator_name or wo.operator_name,
            "assistant_name": None,
            "shift": wo.shift or detail.shift,
            "shift_start": None,
            "shift_end": None,
            "break_time": None,
        },
        "production": {
            "target_qty": target,
            "uom": "Nos",
            "produced_qty": produced,
            "rejected_qty": rejected,
            "rework_qty": rework,
            "good_qty": good,
            "balance_qty": balance,
            "production_start": _fmt_dt(detail.started_at or wo.planned_start),
            "production_end": _fmt_dt(detail.completed_at),
            "operator_remarks": None,
        },
        "quality": {
            "inspection_id": final_qc.id if final_qc else None,
            "checked_by": final_qc.inspector if final_qc else None,
            "checked_date": _fmt_date(final_qc.inspection_date) if final_qc else None,
            "checked_qty": float(final_qc.quantity) if final_qc and final_qc.quantity is not None else produced,
            "passed_qty": good if final_qc else None,
            "rejected_qty": rejected if final_qc else None,
            "rework_qty": rework if final_qc else None,
            "remarks": final_qc.notes if final_qc else None,
            "result": final_qc.result if final_qc else None,
            "status": (
                "Approved"
                if final_qc and (final_qc.result or "").lower() in {"pass", "passed", "approved"}
                else ("Rejected" if final_qc and (final_qc.result or "").lower() in {"fail", "failed", "rejected"} else "Pending")
            ),
            "packing_status": getattr(final_qc, "packing_status", None) if final_qc else None,
        },
        "packing": {
            "packing_type": None,
            "packed_qty": good if packing_done else None,
            "cartons": None,
            "packing_start": None,
            "packing_end": None,
            "packed_by": None,
            "done": packing_done,
        },
        "dispatch": {
            "id": dispatch.id if dispatch else None,
            "dispatch_date": _fmt_date(getattr(dispatch, "dispatch_date", None) or getattr(dispatch, "shipment_date", None))
            if dispatch
            else None,
            "vehicle_no": dispatch.vehicle_number if dispatch else None,
            "transporter": dispatch.courier if dispatch else None,
            "dc_no": dispatch.lr_number if dispatch else None,
            "dispatched_qty": good if dispatched else None,
            "status": dispatch.status if dispatch else None,
            "done": dispatched,
        },
        "billing": {
            "invoice_id": invoice.id if invoice else None,
            "invoice_no": invoice.invoice_number if invoice else None,
            "invoice_date": _fmt_date(invoice.issue_date) if invoice else None,
            "invoice_amount": float(invoice.grand_total) if invoice else None,
            "payment_terms": so.payment_terms if so else None,
            "billed_by": None,
            "status": (
                (invoice.invoice_status if invoice else None)
                or ("Completed" if invoiced else "Pending")
            ),
            "done": invoiced,
        },
        "approvals": approvals,
        "notes": [
            "Use only issued material for this job card. Do not mix batches.",
            "Record rejected and rework quantities immediately on the shop floor.",
            "Any rejection above limit must be escalated to Production Manager.",
            "Packing and dispatch only after QC approval.",
        ],
        "workflow": workflow,
        "status_timeline": status_timeline,
        "closed": closed,
        "can_issue_materials": not bool(wo.materials_issued),
        "can_start_production": bool(wo.materials_issued)
        and (wo.status or "").lower()
        in {"planned", "released", "material_ready", "draft", "ready", "paused"},
        "can_complete_production": (wo.status or "").lower() in RUNNING_STATUSES
        or (wo.status or "").lower() in {"in_progress", "running", "started"},
        "list": _to_list_read(db, tenant_id, wo).model_dump(),
    }


def list_job_cards(
    db: Session, tenant_id: int, user: User | None = None
) -> list[dict[str, Any]]:
    rows = list_work_orders_enriched(db, tenant_id, user=user)
    out = []
    for r in rows:
        out.append(
            {
                "id": r.id,
                "job_card_no": r.work_order_number,
                "work_order_number": r.work_order_number,
                "status": r.status,
                "display_status": (r.status or "").replace("_", " ").title(),
                "priority": r.priority,
                "product_name": r.product_name,
                "customer_name": r.customer_name,
                "production_order_number": r.production_order_number,
                "planned_quantity": r.planned_quantity,
                "produced_quantity": r.produced_quantity,
                "progress_pct": r.progress_pct,
                "machine_name": r.machine_name,
                "operator_name": r.operator_name,
                "materials_issued": r.materials_issued,
                "planned_start": r.planned_start.isoformat() if r.planned_start else None,
                "planned_end": r.planned_end.isoformat() if r.planned_end else None,
            }
        )
    return out

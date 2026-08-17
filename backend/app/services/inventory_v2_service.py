"""Inventory V2 service — product items, categories, add/remove stock + timeline."""

from __future__ import annotations

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.product import InventoryCategory, Product, ProductStockEvent
from app.schemas.inventory_v2 import (
    InventoryItemV2Create,
    InventoryItemV2Update,
    StockAdjustRequest,
)


def _f(value, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _today_label() -> str:
    d = date.today()
    return f"{d.day:02d}-{d.month:02d}-{d.year}"


def serialize_item(p: Product) -> dict:
    stock = _f(p.current_stock)
    sale = _f(p.unit_price)
    purchase = _f(p.unit_cost)
    return {
        "id": p.id,
        "sku": p.sku,
        "product_code": p.sku,
        "name": p.name,
        "description": p.description or "",
        "unit": p.unit or "Pcs",
        "hsn_code": p.hsn_code or "",
        "category": p.category or "No Category",
        "purchase_price": purchase,
        "selling_price": sale,
        "unit_cost": purchase,
        "unit_price": sale,
        "wholesale_price": _f(p.wholesale_price),
        "gst_percent": _f(p.gst_percent),
        "cess_percent": _f(p.cess_percent),
        "min_stock": _f(p.min_stock),
        "max_stock": _f(p.max_stock) if p.max_stock is not None else None,
        "current_stock": stock,
        "stock_value": round(stock * sale, 3),
    }


def list_items(
    db: Session,
    tenant_id: int,
    q: str | None = None,
    *,
    limit: int = 500,
    offset: int = 0,
) -> list[dict]:
    from sqlalchemy import or_

    stmt = select(Product).where(Product.tenant_id == tenant_id)
    if q and q.strip():
        needle = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(needle),
                Product.sku.ilike(needle),
                Product.hsn_code.ilike(needle),
                Product.category.ilike(needle),
            )
        )
    stmt = (
        stmt.order_by(Product.name)
        .offset(max(0, offset))
        .limit(max(1, min(limit, 2000)))
    )
    rows = list(db.scalars(stmt).all())
    return [serialize_item(p) for p in rows]


def get_item(db: Session, tenant_id: int, product_id: int) -> dict | None:
    p = db.scalars(
        select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
    ).first()
    if not p:
        return None
    data = serialize_item(p)
    data["timeline"] = list_timeline(db, tenant_id, product_id)
    return data


def create_item(db: Session, tenant_id: int, payload: InventoryItemV2Create) -> dict:
    try:
        item_name = (payload.name or "").strip()
        if not item_name:
            raise ValueError("Item name is required")
        sku = (payload.sku or "").strip() or f"PRD-{item_name[:12].upper().replace(' ', '-')}"
        existing = db.scalars(
            select(Product).where(Product.tenant_id == tenant_id, Product.sku == sku)
        ).first()
        if existing:
            raise ValueError("SKU already exists")

        stock = _f(payload.current_stock)
        product = Product(
            tenant_id=tenant_id,
            sku=sku,
            name=item_name,
            description=payload.description,
            unit=payload.unit or "Pcs",
            unit_cost=payload.purchase_price,
            unit_price=payload.selling_price,
            wholesale_price=payload.wholesale_price,
            hsn_code=payload.hsn_code,
            category=payload.category or "No Category",
            gst_percent=payload.gst_percent or 0,
            cess_percent=payload.cess_percent or 0,
            min_stock=int(payload.min_stock or 0),
            max_stock=int(payload.max_stock) if payload.max_stock is not None else 100,
            current_stock=stock,
        )
        db.add(product)
        db.flush()
        db.add(
            ProductStockEvent(
                tenant_id=tenant_id,
                product_id=product.id,
                activity="First Stock",
                subtitle="Opening Stock",
                change_qty=stock,
                final_qty=stock,
                unit=product.unit,
                event_date=_today_label(),
            )
        )
        db.commit()
        db.refresh(product)
        return serialize_item(product)
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


def update_item(
    db: Session, tenant_id: int, product_id: int, payload: InventoryItemV2Update
) -> dict | None:
    try:
        product = db.scalars(
            select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
        ).first()
        if not product:
            return None
        data = payload.model_dump(exclude_unset=True)
        mapping = {
            "purchase_price": "unit_cost",
            "selling_price": "unit_price",
        }
        for key, value in data.items():
            attr = mapping.get(key, key)
            if key == "min_stock" and value is not None:
                value = int(value)
            if key == "max_stock" and value is not None:
                value = int(value)
            setattr(product, attr, value)
        db.commit()
        db.refresh(product)
        return serialize_item(product)
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


def delete_item(db: Session, tenant_id: int, product_id: int) -> bool:
    from app.services.product_service import delete_product

    return delete_product(db, tenant_id, product_id)


def list_timeline(db: Session, tenant_id: int, product_id: int) -> list[dict]:
    rows = list(
        db.scalars(
            select(ProductStockEvent)
            .where(
                ProductStockEvent.tenant_id == tenant_id,
                ProductStockEvent.product_id == product_id,
            )
            .order_by(ProductStockEvent.id.desc())
        ).all()
    )
    if not rows:
        return [
            {
                "id": "opening",
                "activity": "First Stock",
                "subtitle": "Opening Stock",
                "date": _today_label(),
                "change": 0.0,
                "final": 0.0,
                "unit": None,
            }
        ]
    return [
        {
            "id": r.id,
            "activity": r.activity,
            "subtitle": r.subtitle or r.remark,
            "date": r.event_date or (r.created_at.strftime("%d-%m-%Y") if r.created_at else None),
            "change": _f(r.change_qty),
            "final": _f(r.final_qty),
            "unit": r.unit,
        }
        for r in rows
    ]


def _adjust_stock(
    db: Session,
    tenant_id: int,
    product_id: int,
    payload: StockAdjustRequest,
    *,
    adding: bool,
) -> dict:
    try:
        product = db.scalars(
            select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
        ).first()
        if not product:
            raise ValueError("Item not found")

        previous = _f(product.current_stock)
        qty = float(payload.quantity)
        if qty <= 0:
            raise ValueError("Quantity must be greater than zero")
        if not adding and qty > previous:
            raise ValueError("Cannot remove more than available stock")

        next_stock = previous + qty if adding else max(0.0, previous - qty)
        product.current_stock = next_stock
        entry = ProductStockEvent(
            tenant_id=tenant_id,
            product_id=product.id,
            activity="Stock Added" if adding else "Stock Removed",
            subtitle=payload.remark or ("Manual Add" if adding else "Manual Reduce"),
            change_qty=qty if adding else -qty,
            final_qty=next_stock,
            unit=payload.unit or product.unit or "PCS",
            remark=payload.remark,
            event_date=_today_label(),
        )
        db.add(entry)
        db.commit()
        db.refresh(product)
        db.refresh(entry)
        timeline_entry = {
            "id": entry.id,
            "activity": entry.activity,
            "subtitle": entry.subtitle,
            "date": entry.event_date,
            "change": _f(entry.change_qty),
            "final": _f(entry.final_qty),
            "unit": entry.unit,
        }
        return {
            "product_id": product.id,
            "previous_stock": previous,
            "current_stock": next_stock,
            "change": qty if adding else -qty,
            "item": serialize_item(product),
            "timeline_entry": timeline_entry,
        }
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


def add_stock(
    db: Session, tenant_id: int, product_id: int, payload: StockAdjustRequest
) -> dict:
    return _adjust_stock(db, tenant_id, product_id, payload, adding=True)


def remove_stock(
    db: Session, tenant_id: int, product_id: int, payload: StockAdjustRequest
) -> dict:
    return _adjust_stock(db, tenant_id, product_id, payload, adding=False)


def list_categories(db: Session, tenant_id: int) -> list[dict]:
    cats = list(
        db.scalars(
            select(InventoryCategory)
            .where(InventoryCategory.tenant_id == tenant_id)
            .order_by(InventoryCategory.name)
        ).all()
    )
    # Ensure defaults exist
    names = {c.name for c in cats}
    if "No Category" not in names:
        row = InventoryCategory(tenant_id=tenant_id, name="No Category")
        db.add(row)
        db.commit()
        db.refresh(row)
        cats.insert(0, row)

    counts = dict(
        db.execute(
            select(Product.category, func.count(Product.id))
            .where(Product.tenant_id == tenant_id)
            .group_by(Product.category)
        ).all()
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "stock": int(counts.get(c.name) or 0),
        }
        for c in cats
    ]


def category_wise(db: Session, tenant_id: int) -> list[dict]:
    cats = list_categories(db, tenant_id)
    return [{"category": c["name"], "stock": c["stock"]} for c in cats]


def create_category(db: Session, tenant_id: int, name: str) -> dict:
    try:
        clean = (name or "").strip()
        if not clean:
            raise ValueError("Category name is required")
        exists = db.scalars(
            select(InventoryCategory).where(
                InventoryCategory.tenant_id == tenant_id,
                func.lower(InventoryCategory.name) == clean.lower(),
            )
        ).first()
        if exists:
            raise ValueError("Category already exists")
        row = InventoryCategory(tenant_id=tenant_id, name=clean)
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"id": row.id, "name": row.name, "stock": 0}
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


def delete_category(db: Session, tenant_id: int, category_id: int) -> bool:
    try:
        row = db.scalars(
            select(InventoryCategory).where(
                InventoryCategory.id == category_id,
                InventoryCategory.tenant_id == tenant_id,
            )
        ).first()
        if not row:
            return False
        if row.name.lower() == "no category":
            raise ValueError("Cannot delete default category")
        db.delete(row)
        db.commit()
        return True
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

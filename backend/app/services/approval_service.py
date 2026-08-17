import logging

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.inventory import Supplier
from app.models.procurement import PurchaseOrder
from app.models.production import ProductionOrder


def get_pending_approvals(db: Session, tenant_id: int) -> dict:
    purchase_orders = db.scalar(
        select(func.count(PurchaseOrder.id)).where(
            PurchaseOrder.tenant_id == tenant_id,
            PurchaseOrder.status == "draft",
        )
    ) or 0
    vendors = db.scalar(
        select(func.count(Supplier.id)).where(
            Supplier.tenant_id == tenant_id,
            Supplier.approval_status == "pending",
        )
    ) or 0
    production_orders = db.scalar(
        select(func.count(ProductionOrder.id)).where(
            ProductionOrder.tenant_id == tenant_id,
            ProductionOrder.status.in_(("planned", "pending")),
        )
    ) or 0
    return {
        "purchase_orders": int(purchase_orders),
        "vendors": int(vendors),
        "production_orders": int(production_orders),
        "total": int(purchase_orders + vendors + production_orders),
    }

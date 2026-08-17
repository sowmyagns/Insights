import logging

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.hr import LeaveRequest

logger = logging.getLogger(__name__)
from app.models.inventory import Supplier
from app.models.procurement import PurchaseOrder
from app.models.production import ProductionOrder


def get_pending_approvals(db: Session, tenant_id: int) -> dict:
    try:
        leave_requests = db.scalar(
            select(func.count(LeaveRequest.id)).where(
                LeaveRequest.tenant_id == tenant_id,
                LeaveRequest.status == "pending",
            )
        ) or 0
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
            "leave_requests": int(leave_requests),
            "purchase_orders": int(purchase_orders),
            "vendors": int(vendors),
            "production_orders": int(production_orders),
            "total": int(
                leave_requests + purchase_orders + vendors + production_orders
            ),
        }
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in get_pending_approvals for tenant {tenant_id}: {str(e)}"
        )
        return {
            "leave_requests": 0,
            "purchase_orders": 0,
            "vendors": 0,
            "production_orders": 0,
            "total": 0,
        }
    except Exception as e:
        logger.error(
            f"Unexpected error in get_pending_approvals for tenant {tenant_id}: {str(e)}"
        )
        return {
            "leave_requests": 0,
            "purchase_orders": 0,
            "vendors": 0,
            "production_orders": 0,
            "total": 0,
        }

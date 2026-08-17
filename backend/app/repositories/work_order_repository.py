"""Work order data access."""

import logging
from datetime import date, timezone

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import InvalidRequestError, OperationalError, SQLAlchemyError
from sqlalchemy.orm.exc import UnmappedInstanceError

from app.models.production import WorkOrder
from app.models.user import User
from app.repositories.base_repository import BaseRepository
from app.services.data_scope import scope_work_orders

logger = logging.getLogger(__name__)

logger = logging.getLogger(__name__)


class WorkOrderRepository(BaseRepository):
    def _base_stmt(self, user: User | None = None):
        stmt = select(WorkOrder).where(WorkOrder.tenant_id == self.tenant_id)
        if user is not None:
            stmt = scope_work_orders(stmt, user)
        return stmt

    def list_all(self, user: User | None = None) -> list[WorkOrder]:
        try:
            stmt = self._base_stmt(user).order_by(WorkOrder.id.desc())
            return list(self.db.scalars(stmt).all())
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error listing work orders for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            logger.exception("Unexpected error listing work orders for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def list_today(self, user: User | None = None) -> list[WorkOrder]:
        try:
            today = date.today()
            orders = self.list_all(user=user)
            result = []
            for wo in orders:
                if getattr(wo, "planned_start", None) is not None:
                    try:
                        planned_start = wo.planned_start
                        if planned_start.tzinfo is None:
                            planned_start = planned_start.replace(tzinfo=timezone.utc)
                        if planned_start.date() == today:
                            result.append(wo)
                            continue
                    except (AttributeError, TypeError, ValueError):
                        pass
                if wo.status in ("in_progress", "running", "paused"):
                    result.append(wo)
            return result
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error listing today's work orders for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except (TypeError, ValueError) as exc:
            logger.exception("Data conversion error listing today's work orders for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(400, "Invalid work order data") from exc
        except Exception as exc:
            logger.exception("Unexpected error listing today's work orders for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def list_assigned(self, user: User) -> list[WorkOrder]:
        if user is None or not hasattr(user, "id") or user.id is None:
            raise HTTPException(400, "Invalid user")
        try:
            conditions = [WorkOrder.assigned_user_id == user.id]
            if getattr(user, "assigned_machine_id", None):
                conditions.append(WorkOrder.machine_id == user.assigned_machine_id)
            stmt = select(WorkOrder).where(
                WorkOrder.tenant_id == self.tenant_id,
                or_(*conditions),
            )
            stmt = scope_work_orders(stmt, user)
            return list(self.db.scalars(stmt.order_by(WorkOrder.id.desc())).all())
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error listing assigned work orders for user_id=%s, tenant_id=%s: %s", user.id, self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            logger.exception("Unexpected error listing assigned work orders for user_id=%s, tenant_id=%s: %s", user.id, self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def list_pending(self, user: User | None = None) -> list[WorkOrder]:
        try:
            pending_statuses = ("planned", "pending", "released", "material_ready", "machine_ready")
            stmt = self._base_stmt(user).where(WorkOrder.status.in_(pending_statuses))
            return list(self.db.scalars(stmt).all())
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error listing pending work orders for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            logger.exception("Unexpected error listing pending work orders for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def get_by_id(self, work_order_id: int) -> WorkOrder | None:
        if work_order_id is None or not isinstance(work_order_id, int) or isinstance(work_order_id, bool) or work_order_id <= 0:
            raise HTTPException(400, "Invalid work order ID")
        try:
            return self.db.scalars(
                select(WorkOrder).where(
                    WorkOrder.id == work_order_id,
                    WorkOrder.tenant_id == self.tenant_id,
                )
            ).first()
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error getting work order by id %s for tenant_id=%s: %s", work_order_id, self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            logger.exception("Unexpected error getting work order by id %s for tenant_id=%s: %s", work_order_id, self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def get_by_number(self, number: str, user: User | None = None) -> WorkOrder | None:
        if number is None or not isinstance(number, str) or not number.strip():
            raise HTTPException(400, "Invalid work order number")
        try:
            normalized = number.strip().upper()
            stmt = select(WorkOrder).where(
                WorkOrder.tenant_id == self.tenant_id,
                func.upper(WorkOrder.work_order_number) == normalized,
            )
            if user is not None:
                stmt = scope_work_orders(stmt, user)
            return self.db.scalars(stmt).first()
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error getting work order by number %s for tenant_id=%s: %s", number, self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            logger.exception("Unexpected error getting work order by number %s for tenant_id=%s: %s", number, self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def save(self, work_order: WorkOrder) -> WorkOrder:
        if work_order is None:
            raise HTTPException(400, "Invalid work order data")
        try:
            self.db.add(work_order)
            self.db.commit()
            self.db.refresh(work_order)
            return work_order
        except (InvalidRequestError, UnmappedInstanceError) as exc:
            self.db.rollback()
            logger.exception("Invalid or detached work order save: %s", exc)
            raise HTTPException(400, "invalid or detached object") from exc
        except (OperationalError, SQLAlchemyError) as exc:
            self.db.rollback()
            logger.exception("Database commit failed for work order save: %s", exc)
            raise HTTPException(503, "Database commit failed. Transaction has been rolled back.") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Unexpected error for work order save: %s", exc)
            raise HTTPException(500, "Database commit failed. Transaction has been rolled back.") from exc

    def refresh(self, obj: WorkOrder) -> WorkOrder:
        if obj is None:
            raise HTTPException(400, "Invalid work order data")
        try:
            self.db.refresh(obj)
            return obj
        except (InvalidRequestError, UnmappedInstanceError) as exc:
            logger.exception("Invalid or detached object refresh: %s", exc)
            raise HTTPException(400, "invalid or detached object") from exc
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database connection error on refresh: %s", exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            logger.exception("Unexpected error on refresh: %s", exc)
            raise HTTPException(500, "Failed to refresh object.") from exc

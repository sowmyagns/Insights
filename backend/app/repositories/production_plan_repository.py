"""Production plan (production orders) data access."""

import logging
from datetime import date, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.models.production import ProductionOrder
from app.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)

logger = logging.getLogger(__name__)


class ProductionPlanRepository(BaseRepository):
    def list_all(self) -> list[ProductionOrder]:
        try:
            return list(
                self.db.scalars(
                    select(ProductionOrder)
                    .where(ProductionOrder.tenant_id == self.tenant_id)
                    .order_by(ProductionOrder.id.desc())
                ).all()
            )
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error listing production plans for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            logger.exception("Unexpected error listing production plans for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def get_by_id(self, plan_id: int) -> ProductionOrder | None:
        try:
            return self.db.scalars(
                select(ProductionOrder).where(
                    ProductionOrder.id == plan_id,
                    ProductionOrder.tenant_id == self.tenant_id,
                )
            ).first()
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error getting production plan by id %s for tenant_id=%s: %s", plan_id, self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            logger.exception("Unexpected error getting production plan by id %s for tenant_id=%s: %s", plan_id, self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def list_today(self) -> list[ProductionOrder]:
        try:
            today = date.today()
            orders = self.list_all()
            result = []
            for order in orders:
                if order.start_date:
                    start = order.start_date
                    if start.tzinfo is None:
                        start = start.replace(tzinfo=timezone.utc)
                    if start.date() == today:
                        result.append(order)
                        continue
                if order.status in ("in_progress", "running", "planned"):
                    result.append(order)
            return result[:20] if result else orders[:10]
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error listing today's production plans for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except (TypeError, ValueError) as exc:
            logger.exception("Data conversion error listing today's production plans for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(400, "Invalid production plan data") from exc
        except Exception as exc:
            logger.exception("Unexpected error listing today's production plans for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

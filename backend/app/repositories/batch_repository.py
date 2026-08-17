"""Production batch data access."""

import logging
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.models.production import Batch
from app.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class BatchRepository(BaseRepository):
    def list_all(self) -> list[Batch]:
        try:
            return list(
                self.db.scalars(
                    select(Batch)
                    .where(Batch.tenant_id == self.tenant_id)
                    .order_by(Batch.id.desc())
                ).all()
            )
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.exception("Database error fetching all batches for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Unexpected error fetching all batches for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def get_by_id(self, batch_id: int) -> Batch | None:
        try:
            return self.db.scalars(
                select(Batch).where(
                    Batch.id == batch_id,
                    Batch.tenant_id == self.tenant_id,
                )
            ).first()
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.exception("Database error fetching batch_id=%s for tenant_id=%s: %s", batch_id, self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Unexpected error fetching batch_id=%s for tenant_id=%s: %s", batch_id, self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def list_by_status(self, *statuses: str) -> list[Batch]:
        try:
            return list(
                self.db.scalars(
                    select(Batch).where(
                        Batch.tenant_id == self.tenant_id,
                        Batch.status.in_(statuses),
                    )
                ).all()
            )
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.exception("Database error fetching batches by status %s for tenant_id=%s: %s", statuses, self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Unexpected error fetching batches by status %s for tenant_id=%s: %s", statuses, self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def save(self, batch: Batch) -> Batch:
        try:
            self.db.add(batch)
            self.db.commit()
            self.db.refresh(batch)
            return batch
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.exception("Database commit failed saving batch for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(503, "Database commit failed. Transaction has been rolled back.") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Unexpected error saving batch for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(500, "Database commit failed. Transaction has been rolled back.") from exc

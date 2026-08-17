"""Machine data access."""

import logging
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import InvalidRequestError, OperationalError, SQLAlchemyError
from sqlalchemy.orm.exc import UnmappedInstanceError

from app.models.machine import Machine
from app.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class MachineRepository(BaseRepository):
    def list_all(self) -> list[Machine]:
        try:
            return list(
                self.db.scalars(
                    select(Machine)
                    .where(Machine.tenant_id == self.tenant_id)
                    .order_by(Machine.code)
                ).all()
            )
        except (OperationalError, SQLAlchemyError) as exc:
            self.db.rollback()
            logger.exception("Database connection error listing machines: %s", exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Error listing machines: %s", exc)
            raise HTTPException(500, "Database operation failed") from exc

    def get_by_id(self, machine_id: int) -> Machine | None:
        if machine_id is None or not isinstance(machine_id, int) or isinstance(machine_id, bool) or machine_id <= 0:
            raise HTTPException(400, "Invalid machine ID")
        try:
            return self.db.scalars(
                select(Machine).where(
                    Machine.id == machine_id,
                    Machine.tenant_id == self.tenant_id,
                )
            ).first()
        except (OperationalError, SQLAlchemyError) as exc:
            self.db.rollback()
            logger.exception("Database error getting machine by id %s: %s", machine_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Error getting machine by id %s: %s", machine_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def get_by_code(self, code: str) -> Machine | None:
        if not code or not isinstance(code, str) or not code.strip():
            raise HTTPException(400, "Invalid machine code")
        try:
            return self.db.scalars(
                select(Machine).where(
                    Machine.tenant_id == self.tenant_id,
                    Machine.code.ilike(code.strip()),
                )
            ).first()
        except (OperationalError, SQLAlchemyError) as exc:
            self.db.rollback()
            logger.exception("Database error getting machine by code %s: %s", code, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Error getting machine by code %s: %s", code, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def list_by_status(self, *statuses: str) -> list[Machine]:
        try:
            return list(
                self.db.scalars(
                    select(Machine).where(
                        Machine.tenant_id == self.tenant_id,
                        Machine.status.in_(statuses),
                    )
                ).all()
            )
        except (OperationalError, SQLAlchemyError) as exc:
            self.db.rollback()
            logger.exception("Database error listing machines by status: %s", exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Error listing machines by status: %s", exc)
            raise HTTPException(500, "Database operation failed") from exc

    def save(self, machine: Machine) -> Machine:
        try:
            self.db.add(machine)
            self.db.commit()
            self.db.refresh(machine)
            return machine
        except (OperationalError, SQLAlchemyError) as exc:
            self.db.rollback()
            logger.exception("Database commit failed for machine save: %s", exc)
            raise HTTPException(503, "Database commit failed. Transaction has been rolled back.") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Unexpected error for machine save: %s", exc)
            raise HTTPException(500, "Database commit failed. Transaction has been rolled back.") from exc

    def refresh(self, obj: Machine) -> Machine:
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

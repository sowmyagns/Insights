import logging

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger("gns_insights.maintenance_service")

from app.models.maintenance import (
    BreakdownReport,
    MaintenanceRecord,
    MaintenanceSchedule,
    PreventiveMaintenance,
)
from app.schemas.maintenance import (
    BreakdownReportCreate,
    MaintenanceRecordCreate,
    MaintenanceScheduleCreate,
    PreventiveMaintenanceCreate,
)


def create_maintenance_record(db: Session, payload: MaintenanceRecordCreate) -> MaintenanceRecord:
    try:
        mr = MaintenanceRecord(**payload.model_dump())
        db.add(mr)
        db.commit()
        db.refresh(mr)
        try:
            from app.services.alert_event_service import emit_alert

            emit_alert(
                db,
                tenant_id=mr.tenant_id,
                alert_type="machine_service_completed",
                title="Machine service recorded",
                message=getattr(mr, "notes", None) or f"Maintenance record #{mr.id}",
                severity="low",
                link="/maintenance",
                reference_type="maintenance_record",
                reference_id=mr.id,
                created_by="Maintenance",
            )
        except Exception:
            pass
        return mr
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while creating maintenance record")
        raise RuntimeError("Maintenance record creation failed: Database error") from exc
    except Exception:
        db.rollback()
        raise


def list_maintenance_records(db: Session, tenant_id: int) -> list[MaintenanceRecord]:
    stmt = select(MaintenanceRecord).where(MaintenanceRecord.tenant_id == tenant_id)
    return list(db.scalars(stmt).all())


def create_preventive_maintenance(db: Session, payload: PreventiveMaintenanceCreate) -> PreventiveMaintenance:
    try:
        pm = PreventiveMaintenance(**payload.model_dump())
        db.add(pm)
        db.commit()
        db.refresh(pm)
        try:
            from app.services.alert_event_service import emit_alert

            emit_alert(
                db,
                tenant_id=pm.tenant_id,
                alert_type="preventive_maintenance_due",
                title="Preventive maintenance scheduled",
                message=getattr(pm, "description", None) or f"PM record #{pm.id}",
                severity="medium",
                link="/maintenance/preventive",
                reference_type="preventive_maintenance",
                reference_id=pm.id,
                created_by="Maintenance",
            )
        except Exception:
            pass
        return pm
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while creating preventive maintenance")
        raise RuntimeError("Preventive maintenance creation failed: Database error") from exc
    except Exception:
        db.rollback()
        raise


def list_preventive_maintenance(db: Session, tenant_id: int) -> list[PreventiveMaintenance]:
    stmt = select(PreventiveMaintenance).where(PreventiveMaintenance.tenant_id == tenant_id)
    return list(db.scalars(stmt).all())


def create_breakdown_report(db: Session, payload: BreakdownReportCreate) -> BreakdownReport:
    try:
        br = BreakdownReport(**payload.model_dump())
        db.add(br)
        db.commit()
        db.refresh(br)
        try:
            from app.services.alert_event_service import emit_alert

            emit_alert(
                db,
                tenant_id=br.tenant_id,
                alert_type="machine_breakdown",
                title="Machine breakdown reported",
                message=getattr(br, "description", None) or f"Breakdown report #{br.id}",
                severity="critical",
                link="/alerts/machine-failure",
                reference_type="breakdown_report",
                reference_id=br.id,
                created_by="Maintenance",
            )
        except Exception:
            pass
        return br
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while creating breakdown report")
        raise RuntimeError("Breakdown report creation failed: Database error") from exc
    except Exception:
        db.rollback()
        raise


def list_breakdown_reports(db: Session, tenant_id: int) -> list[BreakdownReport]:
    stmt = select(BreakdownReport).where(BreakdownReport.tenant_id == tenant_id)
    return list(db.scalars(stmt).all())


def update_breakdown_status(
    db: Session, tenant_id: int, breakdown_id: int, status: str
) -> BreakdownReport | None:
    try:
        br = db.scalars(
            select(BreakdownReport).where(
                BreakdownReport.id == breakdown_id,
                BreakdownReport.tenant_id == tenant_id,
            )
        ).first()
        if not br:
            return None
        br.status = status
        db.commit()
        db.refresh(br)
        return br
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while updating breakdown status %s", breakdown_id)
        raise RuntimeError("Breakdown status update failed: Database error") from exc
    except Exception:
        db.rollback()
        raise


def create_maintenance_schedule(db: Session, payload: MaintenanceScheduleCreate) -> MaintenanceSchedule:
    try:
        ms = MaintenanceSchedule(**payload.model_dump())
        db.add(ms)
        db.commit()
        db.refresh(ms)
        return ms
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while creating maintenance schedule")
        raise RuntimeError("Maintenance schedule creation failed: Database error") from exc
    except Exception:
        db.rollback()
        raise


def list_maintenance_schedules(db: Session, tenant_id: int) -> list[MaintenanceSchedule]:
    stmt = select(MaintenanceSchedule).where(MaintenanceSchedule.tenant_id == tenant_id)
    return list(db.scalars(stmt).all())

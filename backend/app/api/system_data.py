"""System data management API: clear and undo/restore tenant operational data."""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.permissions import require_admin
from app.models.alert import Alert
from app.models.document import Document
from app.models.erp_notification import ErpNotification
from app.models.machine import Machine
from app.models.production import DailyProductionReport, ProductionOrder, WorkOrder
from app.models.task import Task
from app.models.user import User
from app.utils.api_response import success_response

router = APIRouter(prefix="/system", tags=["system-data"])

# In-memory snapshot cache keyed by tenant_id
_TENANT_SNAPSHOTS: dict[int, dict] = {}


def _require_dev_only() -> None:
    if get_settings().is_production:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This operation is not available in production.",
        )


def _serialize_model(obj) -> dict:
    d = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if hasattr(val, "isoformat"):
            val = val.isoformat()
        d[col.name] = val
    return d


@router.post("/clear-tenant-data")
def clear_tenant_data(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _require_dev_only()
    tenant_id = user.tenant_id

    # 1. Save exact snapshot before clearing
    snapshot = {
        "daily_reports": [_serialize_model(r) for r in db.query(DailyProductionReport).filter(DailyProductionReport.tenant_id == tenant_id).all()],
        "work_orders": [_serialize_model(r) for r in db.query(WorkOrder).filter(WorkOrder.tenant_id == tenant_id).all()],
        "production_orders": [_serialize_model(r) for r in db.query(ProductionOrder).filter(ProductionOrder.tenant_id == tenant_id).all()],
        "tasks": [_serialize_model(r) for r in db.query(Task).filter(Task.tenant_id == tenant_id).all()],
        "documents": [_serialize_model(r) for r in db.query(Document).filter(Document.tenant_id == tenant_id).all()],
        "notifications": [_serialize_model(r) for r in db.query(ErpNotification).filter(ErpNotification.tenant_id == tenant_id).all()],
        "alerts": [_serialize_model(r) for r in db.query(Alert).filter(Alert.tenant_id == tenant_id).all()],
        "machines": [_serialize_model(r) for r in db.query(Machine).filter(Machine.tenant_id == tenant_id).all()],
    }
    _TENANT_SNAPSHOTS[tenant_id] = snapshot

    # 2. Clear all operational data for tenant
    db.query(DailyProductionReport).filter(DailyProductionReport.tenant_id == tenant_id).delete()
    db.query(WorkOrder).filter(WorkOrder.tenant_id == tenant_id).delete()
    db.query(ProductionOrder).filter(ProductionOrder.tenant_id == tenant_id).delete()
    db.query(Task).filter(Task.tenant_id == tenant_id).delete()
    db.query(Document).filter(Document.tenant_id == tenant_id).delete()
    db.query(ErpNotification).filter(ErpNotification.tenant_id == tenant_id).delete()
    db.query(Alert).filter(Alert.tenant_id == tenant_id).delete()
    db.query(Machine).filter(Machine.tenant_id == tenant_id).delete()

    db.commit()
    return success_response("All tenant data cleared cleanly (snapshot saved for Undo)", {"cleared": True})


@router.post("/seed-tenant-data")
def seed_tenant_data(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _require_dev_only()
    tenant_id = user.tenant_id

    # If an exact snapshot exists from the recent Clear, restore that snapshot!
    snapshot = _TENANT_SNAPSHOTS.get(tenant_id)
    if snapshot:
        db.query(DailyProductionReport).filter(DailyProductionReport.tenant_id == tenant_id).delete()
        db.query(WorkOrder).filter(WorkOrder.tenant_id == tenant_id).delete()
        db.query(ProductionOrder).filter(ProductionOrder.tenant_id == tenant_id).delete()
        db.query(Task).filter(Task.tenant_id == tenant_id).delete()
        db.query(Document).filter(Document.tenant_id == tenant_id).delete()
        db.query(ErpNotification).filter(ErpNotification.tenant_id == tenant_id).delete()
        db.query(Alert).filter(Alert.tenant_id == tenant_id).delete()
        db.query(Machine).filter(Machine.tenant_id == tenant_id).delete()

        def _parse_dt(val):
            if not val or not isinstance(val, str):
                return val
            try:
                return datetime.fromisoformat(val)
            except Exception:
                try:
                    return date.fromisoformat(val)
                except Exception:
                    return val

        def _restore_rows(model_cls, rows):
            for row in rows:
                cleaned = {}
                for k, v in row.items():
                    if k in model_cls.__table__.columns:
                        col = model_cls.__table__.columns[k]
                        col_type_str = str(col.type).upper()
                        if "DATETIME" in col_type_str or "DATE" in col_type_str or "TIMESTAMP" in col_type_str:
                            cleaned[k] = _parse_dt(v)
                        else:
                            cleaned[k] = v
                db.add(model_cls(**cleaned))

        _restore_rows(DailyProductionReport, snapshot.get("daily_reports", []))
        _restore_rows(WorkOrder, snapshot.get("work_orders", []))
        _restore_rows(ProductionOrder, snapshot.get("production_orders", []))
        _restore_rows(Task, snapshot.get("tasks", []))
        _restore_rows(Document, snapshot.get("documents", []))
        _restore_rows(ErpNotification, snapshot.get("notifications", []))
        _restore_rows(Alert, snapshot.get("alerts", []))
        _restore_rows(Machine, snapshot.get("machines", []))

        db.commit()
        return success_response("Recently cleared data restored exactly", {"restored": True, "type": "snapshot"})

    # Fallback to initial seed if no snapshot exists
    from app.core.seed_dashboard import seed_dashboard_data
    from app.core.seed_notifications import seed_notifications
    from app.core.seed_products import seed_products

    seed_products(db, tenant_id)
    seed_notifications(db, tenant_id)
    seed_dashboard_data(db, tenant_id)

    return success_response("Tenant sample data restored successfully", {"restored": True, "type": "initial"})

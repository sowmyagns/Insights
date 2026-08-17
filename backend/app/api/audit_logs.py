import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.api.deps import get_db
from app.core.permissions import tenant_scope
from app.models.security import AccessLog
from app.models.user import User

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

MODULE = "admin"

CHANGE_ACTIONS = ("create", "update", "delete", "patch", "post", "put")


def _serialize(rows):
    return [
        {
            "id": log.id,
            "action": log.action,
            "resource": log.resource,
            "resource_id": log.resource_id,
            "user": full_name or email or "System",
            "ip_address": log.ip_address,
            "logged_at": log.logged_at.isoformat() if log.logged_at else None,
        }
        for log, full_name, email in rows
    ]


@router.get("/user-activity")
def get_user_activity_logs(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Recent access-log activity for the tenant, newest first."""
    try:
        rows = db.execute(
            select(AccessLog, User.full_name, User.email)
            .outerjoin(User, AccessLog.user_id == User.id)
            .where(AccessLog.tenant_id == tenant_id)
            .order_by(AccessLog.logged_at.desc())
            .limit(limit)
        ).all()
        return _serialize(rows)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving user activity logs: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve user activity logs: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve user activity logs") from exc


@router.get("/system-changes")
def get_system_changes_logs(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Access-log entries representing data mutations."""
    try:
        conditions = [AccessLog.action.ilike(f"%{a}%") for a in CHANGE_ACTIONS]
        rows = db.execute(
            select(AccessLog, User.full_name, User.email)
            .outerjoin(User, AccessLog.user_id == User.id)
            .where(AccessLog.tenant_id == tenant_id, or_(*conditions))
            .order_by(AccessLog.logged_at.desc())
            .limit(limit)
        ).all()
        return _serialize(rows)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving system changes logs: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve system changes logs: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve system changes logs") from exc


@router.get("/login-history")
def get_login_history_logs(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Authentication-related access-log entries."""
    try:
        rows = db.execute(
            select(AccessLog, User.full_name, User.email)
            .outerjoin(User, AccessLog.user_id == User.id)
            .where(
                AccessLog.tenant_id == tenant_id,
                or_(
                    AccessLog.action.ilike("%login%"),
                    AccessLog.action.ilike("%logout%"),
                    AccessLog.action.ilike("%auth%"),
                    AccessLog.resource.ilike("%auth%"),
                ),
            )
            .order_by(AccessLog.logged_at.desc())
            .limit(limit)
        ).all()
        return _serialize(rows)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving login history logs: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve login history logs: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve login history logs") from exc

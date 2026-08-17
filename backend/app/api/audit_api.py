"""Enterprise audit-log APIs."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.api.auth_deps import get_current_user
from app.api.deps import get_db
from app.core.permissions import require_admin, user_is_admin
from app.models.user import User
from app.services import audit_service as svc

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


@router.get("")
def list_audit_logs(
    request: Request,
    search: str | None = None,
    action: str | None = None,
    role: str | None = None,
    module_name: str | None = None,
    login_status: str | None = None,
    user_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort_by: str = "logged_at",
    sort_dir: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return svc.query_audit_logs(
            db,
            current_user,
            scope="visible",
            search=search,
            action=action,
            role=role,
            module_name=module_name,
            login_status=login_status,
            user_id=user_id,
            date_from=_parse_dt(date_from),
            date_to=_parse_dt(date_to),
            sort_by=sort_by,
            sort_dir=sort_dir,
            page=page,
            page_size=page_size,
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving audit logs: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve audit logs: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve audit logs") from exc


@router.get("/me")
def list_my_audit_logs(
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return svc.query_audit_logs(
            db,
            current_user,
            scope="me",
            search=search,
            page=page,
            page_size=page_size,
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving user audit logs: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve user audit logs: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve audit logs") from exc


@router.get("/company")
def list_company_audit_logs(
    search: str | None = None,
    action: str | None = None,
    role: str | None = None,
    module_name: str | None = None,
    login_status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return svc.query_audit_logs(
            db,
            admin,
            scope="company",
            search=search,
            action=action,
            role=role,
            module_name=module_name,
            login_status=login_status,
            page=page,
            page_size=page_size,
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving company audit logs: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve company audit logs: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve audit logs") from exc


@router.get("/recent-logins")
def recent_logins(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return {"items": svc.recent_login_activity(db, current_user, limit=limit)}
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving recent logins: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve recent logins: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve recent logins") from exc


@router.get("/export")
def export_audit_logs(
    format: str = Query("csv"),
    search: str | None = None,
    action: str | None = None,
    role: str | None = None,
    module_name: str | None = None,
    login_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        scope = "company" if user_is_admin(current_user) else "me"
        csv_data = svc.export_audit_logs_csv(
            db,
            current_user,
            scope=scope,
            search=search,
            action=action,
            role=role,
            module_name=module_name,
            login_status=login_status,
            date_from=_parse_dt(date_from),
            date_to=_parse_dt(date_to),
        )
        filename = f"audit-logs.{ 'csv' if format in ('csv', 'excel') else 'csv' }"
        media = "text/csv"
        return StreamingResponse(
            iter([csv_data]),
            media_type=media,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error exporting audit logs: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to export audit logs: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to export audit logs") from exc


@router.delete("/{log_id}")
def delete_audit_log(
    log_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        svc.delete_audit_log(db, log_id=log_id, admin=admin)
        return {"success": True, "message": "Audit log deleted."}
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error deleting audit log_id=%s: %s", log_id, exc)
        raise HTTPException(status_code=500, detail="Database error deleting audit log") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete audit log_id=%s: %s", log_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete audit log") from exc

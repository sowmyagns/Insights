"""Admin panel API: user & role management (RBAC), activity logs.

All endpoints require an authenticated administrator and are scoped to the
acting user's tenant. Other roles are rejected with 403.

Legacy flat JSON responses — see /api/settings/* for the standard envelope.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status as http_status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.api.deps import get_db
from app.core.permissions import require_admin
from app.models.user import User
from app.schemas.rbac import (
    RoleCreate,
    RolePermissionsUpdate,
    RoleUpdate,
    UserCreate,
    UserUpdate,
)
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/admin", tags=["admin"])


def _svc(db: Session, admin: User) -> SettingsService:
    return SettingsService(db, admin)


# ---------------------------------------------------------------------------
# Permission catalogue
# ---------------------------------------------------------------------------
@router.get("/permissions/modules")
def list_modules(_: User = Depends(require_admin)):
    return SettingsService.list_modules()


@router.get("/permissions/matrix")
def permission_matrix(_: User = Depends(require_admin)):
    return SettingsService.permission_matrix()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
@router.get("/users")
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return _svc(db, admin).list_users()


@router.get("/users/stats")
def user_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return _svc(db, admin).user_stats()


@router.get("/users/{user_id}")
def get_user(
    user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    return _svc(db, admin).get_user(user_id)


@router.post("/users", status_code=201)
def create_user(
    payload: UserCreate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return _svc(db, admin).create_user(payload, request)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error creating user in admin API: %s", exc)
        raise HTTPException(status_code=500, detail="Database error creating user") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create user in admin API: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create user") from exc


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return _svc(db, admin).update_user(user_id, payload, request)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error updating user_id=%s in admin API: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Database error updating user") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to update user_id=%s in admin API: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Failed to update user") from exc


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return _svc(db, admin).delete_user(user_id, request)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error deleting user_id=%s in admin API: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Database error deleting user") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete user_id=%s in admin API: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete user") from exc


# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------
@router.get("/roles")
def list_roles(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return _svc(db, admin).list_roles()


@router.get("/roles/{role_id}")
def get_role(
    role_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    return _svc(db, admin).get_role(role_id)


@router.post("/roles", status_code=201)
def create_role(
    payload: RoleCreate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return _svc(db, admin).create_role(payload, request)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error creating role in admin API: %s", exc)
        raise HTTPException(status_code=500, detail="Database error creating role") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create role in admin API: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create role") from exc


@router.put("/roles/{role_id}")
def update_role(
    role_id: int,
    payload: RoleUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return _svc(db, admin).update_role(role_id, payload, request)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error updating role_id=%s in admin API: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Database error updating role") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to update role_id=%s in admin API: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Failed to update role") from exc


@router.put("/roles/{role_id}/permissions")
def update_role_permissions(
    role_id: int,
    payload: RolePermissionsUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return _svc(db, admin).update_role_permissions(role_id, payload, request)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error updating role permissions for role_id=%s in admin API: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Database error updating role permissions") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to update role permissions for role_id=%s in admin API: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Failed to update role permissions") from exc


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return _svc(db, admin).delete_role(role_id, request)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error deleting role_id=%s in admin API: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Database error deleting role") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete role_id=%s in admin API: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete role") from exc


# ---------------------------------------------------------------------------
# Activity / access logs
# ---------------------------------------------------------------------------
@router.get("/access-logs")
def list_access_logs(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=500),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        data = _svc(db, admin).list_audit_logs(
            search=search, page=page, page_size=page_size
        )
        return data["items"]
    except SQLAlchemyError:
        logger.exception("list_access_logs: database error for tenant %s", admin.tenant_id)
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Access logs are temporarily unavailable due to a database error.",
        )
    except Exception:
        logger.exception("list_access_logs: unexpected error for tenant %s", admin.tenant_id)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while retrieving access logs.",
        )


# ---------------------------------------------------------------------------
# Pending approvals (admin dashboard)
# ---------------------------------------------------------------------------
@router.get("/approvals")
def pending_approvals(
    admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    from app.services.approval_service import get_pending_approvals

    try:
        return get_pending_approvals(db, admin.tenant_id)
    except SQLAlchemyError:
        logger.exception("pending_approvals: database error for tenant %s", admin.tenant_id)
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pending approvals are temporarily unavailable due to a database error.",
        )
    except Exception:
        logger.exception("pending_approvals: unexpected error for tenant %s", admin.tenant_id)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while retrieving pending approvals.",
        )

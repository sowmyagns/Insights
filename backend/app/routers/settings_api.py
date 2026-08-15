"""Settings API — Users, Roles, Permissions, Audit Logs.

Enterprise envelope at /api/settings/*. Legacy flat JSON remains at /admin/* for
existing frontend clients.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.api.deps import get_db
from app.core.permissions import require_admin
from app.models.user import User
from app.schemas.rbac import RoleCreate, RolePermissionsUpdate, RoleUpdate, UserCreate, UserUpdate
from app.services.settings_service import SettingsService
from app.utils.api_response import success_response

router = APIRouter(prefix="/api/settings", tags=["Settings"])


def _svc(db: Session, admin: User) -> SettingsService:
    return SettingsService(db, admin)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
@router.get("/users")
async def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return success_response("Users retrieved", _svc(db, admin).list_users())
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving users: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve users: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve users") from exc


@router.get("/users/stats")
async def user_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return success_response("User statistics retrieved", _svc(db, admin).user_stats())
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving user stats: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve user stats: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve user statistics") from exc


@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return success_response("User retrieved", _svc(db, admin).get_user(user_id))
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving user_id=%s: %s", user_id, exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve user_id=%s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve user") from exc


@router.post("/users", status_code=201)
async def create_user(
    payload: UserCreate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        user = _svc(db, admin).create_user(payload, request)
        return success_response("User created", user)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error creating user: %s", exc)
        raise HTTPException(status_code=500, detail="Database error creating user") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create user: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create user") from exc


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        user = _svc(db, admin).update_user(user_id, payload, request)
        return success_response("User updated", user)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error updating user_id=%s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Database error updating user") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to update user_id=%s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Failed to update user") from exc


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        data = _svc(db, admin).delete_user(user_id, request)
        return success_response("User deleted", data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error deleting user_id=%s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Database error deleting user") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete user_id=%s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete user") from exc


# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------
@router.get("/roles")
async def list_roles(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return success_response("Roles retrieved", _svc(db, admin).list_roles())
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving roles: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve roles: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve roles") from exc


@router.get("/roles/{role_id}")
async def get_role(
    role_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return success_response("Role retrieved", _svc(db, admin).get_role(role_id))
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving role_id=%s: %s", role_id, exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve role_id=%s: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve role") from exc


@router.post("/roles", status_code=201)
async def create_role(
    payload: RoleCreate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        role = _svc(db, admin).create_role(payload, request)
        return success_response("Role created", role)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error creating role: %s", exc)
        raise HTTPException(status_code=500, detail="Database error creating role") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create role: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create role") from exc


@router.put("/roles/{role_id}")
async def update_role(
    role_id: int,
    payload: RoleUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        role = _svc(db, admin).update_role(role_id, payload, request)
        return success_response("Role updated", role)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error updating role_id=%s: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Database error updating role") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to update role_id=%s: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Failed to update role") from exc


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        data = _svc(db, admin).delete_role(role_id, request)
        return success_response("Role deleted", data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error deleting role_id=%s: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Database error deleting role") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete role_id=%s: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete role") from exc


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------
@router.get("/permissions/modules")
async def list_modules(admin: User = Depends(require_admin)):
    return success_response("Permission modules retrieved", SettingsService.list_modules())


@router.get("/permissions/matrix")
async def permission_matrix(admin: User = Depends(require_admin)):
    return success_response(
        "Permission matrix retrieved", SettingsService.permission_matrix()
    )


@router.get("/permissions")
async def list_permissions(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return success_response(
            "Role permissions retrieved", _svc(db, admin).list_permissions_by_role()
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving role permissions: %s", exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve role permissions: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve role permissions") from exc


@router.put("/permissions/{role_id}")
async def update_permissions(
    role_id: int,
    payload: RolePermissionsUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        role = _svc(db, admin).update_role_permissions(role_id, payload, request)
        return success_response("Role permissions updated", role)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error updating permissions for role_id=%s: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Database error updating role permissions") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to update permissions for role_id=%s: %s", role_id, exc)
        raise HTTPException(status_code=500, detail="Failed to update role permissions") from exc


# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------
@router.get("/audit-logs")
async def audit_logs(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        data = _svc(db, admin).list_audit_logs(
            search=search, page=page, page_size=page_size
        )
        return success_response("Audit logs retrieved", data)
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

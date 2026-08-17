"""Login history / audit APIs."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.auth_deps import get_current_user
from app.api.deps import get_db
from app.core.permissions import require_admin
from app.models.user import User
from app.schemas.login_history import LoginHistoryRead
from app.services import login_history_service as svc

router = APIRouter(prefix="/login-history", tags=["login-history"])


@router.get("", response_model=list[LoginHistoryRead])
def list_login_history(
    limit: int = Query(200, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tenant-safe list: admins see company; users see own history."""
    try:
        return svc.list_visible(db, current_user, limit=limit)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load login history") from exc


@router.get("/me", response_model=list[LoginHistoryRead])
def list_my_login_history(
    limit: int = Query(200, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return svc.list_for_user(db, current_user.id, limit=limit)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load your login history") from exc


@router.get("/company", response_model=list[LoginHistoryRead])
def list_company_login_history(
    limit: int = Query(500, ge=1, le=1000),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return svc.list_for_company(db, admin.tenant_id, limit=limit)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load company login history") from exc


@router.delete("/{history_id}")
def delete_login_history(
    history_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        svc.delete_history(db, history_id=history_id, admin=admin)
        return {"success": True, "message": "Login history deleted."}
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete login history") from exc

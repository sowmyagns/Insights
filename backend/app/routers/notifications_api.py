"""ERP Notification Management API."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.auth_deps import get_current_user
from app.api.deps import get_db
from app.models.user import User
from app.services.notification_management_service import NotificationManagementService
from app.utils.api_response import success_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


def _svc(db: Session, user: User) -> NotificationManagementService:
    return NotificationManagementService(db, user)


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        data = _svc(db, user).list_notifications(page, page_size)
        return success_response("Notifications retrieved", data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error listing notifications for user_id=%s: %s", user.id, exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to list notifications for user_id=%s: %s", user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to list notifications") from exc


@router.get("/unread-count")
async def unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return success_response("Unread count retrieved", _svc(db, user).unread_count())
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving unread count for user_id=%s: %s", user.id, exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to get unread count for user_id=%s: %s", user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve unread count") from exc


@router.put("/read-all")
async def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        data = _svc(db, user).mark_all_read()
        return success_response("All notifications marked as read", data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error marking all notifications read for user_id=%s: %s", user.id, exc)
        raise HTTPException(status_code=500, detail="Database error marking all notifications as read") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to mark all notifications as read for user_id=%s: %s", user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to mark all notifications as read") from exc


@router.delete("/clear")
async def clear_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        data = _svc(db, user).clear_all()
        return success_response("All notifications cleared", data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error clearing notifications for user_id=%s: %s", user.id, exc)
        raise HTTPException(status_code=500, detail="Database error clearing notifications") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to clear notifications for user_id=%s: %s", user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to clear notifications") from exc


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        data = _svc(db, user).mark_read(notification_id)
        return success_response("Notification marked as read", data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error marking notification_id=%s read for user_id=%s: %s", notification_id, user.id, exc)
        raise HTTPException(status_code=500, detail="Database error marking notification as read") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to mark notification_id=%s as read for user_id=%s: %s", notification_id, user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to mark notification as read") from exc


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        data = _svc(db, user).delete_notification(notification_id)
        return success_response("Notification deleted", data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error deleting notification_id=%s for user_id=%s: %s", notification_id, user.id, exc)
        raise HTTPException(status_code=500, detail="Database error deleting notification") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete notification_id=%s for user_id=%s: %s", notification_id, user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete notification") from exc

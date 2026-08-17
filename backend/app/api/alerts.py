from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.api.auth_deps import get_current_user
from app.api.deps import get_db
from app.core.permissions import require_permission, tenant_scope, user_is_admin
from app.models.user import User
from app.schemas.alert import AlertCreate, AlertListResponse, AlertRead
from app.schemas.operator import NotificationReadRequest
from app.services.alert_service import (
    acknowledge_alert,
    create_alert,
    delete_alert,
    get_alert,
    list_alerts,
    mark_alert_read,
    mark_all_alerts_read,
    resolve_alert,
    sync_low_stock_alerts,
)
from app.services.notification_management_service import NotificationManagementService
from app.utils.api_response import success_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alerts", tags=["alerts"])

MODULE = "alerts"


@router.post("", response_model=AlertRead)
def create_alert_endpoint(
    payload: AlertCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> AlertRead:
    try:
        payload.tenant_id = user.tenant_id
        if not payload.created_by:
            payload.created_by = getattr(user, "full_name", None) or getattr(user, "name", None) or user.email or "HR Manager"
        alert = create_alert(db, payload)
        if alert is None:
            raise HTTPException(500, "Failed to create alert")
        return alert
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error creating alert: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error creating alert: {str(e)}")
        raise HTTPException(500, "Failed to create alert")


@router.get("", response_model=AlertListResponse)
def list_alerts_endpoint(
    user: User = Depends(require_permission(MODULE)),
    alert_type: str | None = Query(None),
    status: str | None = Query(None),
    module: str | None = Query(None),
    severity: str | None = Query(None),
    is_read: bool | None = Query(None),
    search: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sync_low_stock: bool = Query(False),
    db: Session = Depends(get_db),
) -> AlertListResponse:
    try:
        if sync_low_stock:
            sync_low_stock_alerts(db, user.tenant_id)
        items, total, unread = list_alerts(
            db,
            user.tenant_id,
            alert_type,
            status,
            module=module,
            severity=severity,
            is_read=is_read,
            search=search,
            date_from=date_from,
            date_to=date_to,
            user=user,
            page=page,
            page_size=page_size,
        )
        return AlertListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            unread_count=unread,
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error listing alerts for tenant {user.tenant_id}: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error listing alerts for tenant {user.tenant_id}: {str(e)}")
        raise HTTPException(500, "Failed to retrieve alerts")


@router.get("/notifications")
def notifications_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Legacy alias — prefer GET /api/notifications."""
    try:
        data = NotificationManagementService(db, user).list_notifications()
        return success_response("Notifications retrieved", data)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving notifications for user {user.id}: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error retrieving notifications for user {user.id}: {str(e)}")
        raise HTTPException(500, "Failed to retrieve notifications")


@router.post("/notifications/read")
def notifications_read_endpoint(
    payload: NotificationReadRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        from app.services.notification_management_service import mark_notifications_read

        data = mark_notifications_read(db, user, payload.notification_ids)
        return success_response("Notifications marked as read", data)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error marking notifications as read for user {user.id}: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error marking notifications as read for user {user.id}: {str(e)}")
        raise HTTPException(500, "Failed to mark notifications as read")


@router.delete("/notifications/clear")
def notifications_clear_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        data = NotificationManagementService(db, user).clear_all()
        return success_response("All notifications cleared", data)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error clearing notifications for user {user.id}: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error clearing notifications for user {user.id}: {str(e)}")
        raise HTTPException(500, "Failed to clear notifications")


@router.post("/sync-low-stock", response_model=list[AlertRead])
def sync_low_stock_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
) -> list[AlertRead]:
    try:
        return sync_low_stock_alerts(db, tenant_id)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error syncing low stock alerts for tenant {tenant_id}: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error syncing low stock alerts for tenant {tenant_id}: {str(e)}")
        raise HTTPException(500, "Failed to sync low stock alerts")


@router.post("/mark-all-read")
def mark_all_read_endpoint(
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    try:
        updated = mark_all_alerts_read(db, user.tenant_id, user)
        return {"updated": updated}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error marking all alerts as read for tenant {user.tenant_id}: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error marking all alerts as read for tenant {user.tenant_id}: {str(e)}")
        raise HTTPException(500, "Failed to mark alerts as read")


@router.put("/{alert_id}/read", response_model=AlertRead)
def mark_read_endpoint(
    alert_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> AlertRead:
    try:
        alert = mark_alert_read(db, alert_id, user.tenant_id)
        if not alert:
            raise HTTPException(404, "Alert not found")
        return alert
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error marking alert {alert_id} as read: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error marking alert {alert_id} as read: {str(e)}")
        raise HTTPException(500, "Failed to mark alert as read")


@router.get("/{alert_id}", response_model=AlertRead)
def get_alert_endpoint(
    alert_id: int,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
) -> AlertRead:
    try:
        alert = get_alert(db, alert_id, tenant_id)
        if not alert:
            raise HTTPException(404, "Alert not found")
        return alert
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving alert {alert_id}: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error retrieving alert {alert_id}: {str(e)}")
        raise HTTPException(500, "Failed to retrieve alert")


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert_endpoint(
    alert_id: int,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        userName = getattr(user, "full_name", None) or getattr(user, "name", None) or user.email
        alert = acknowledge_alert(db, alert_id, tenant_id, acknowledged_by=userName)
        if not alert:
            raise HTTPException(404, "Alert not found")
        return {"acknowledged": True, "id": alert.id}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error acknowledging alert {alert_id}: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error acknowledging alert {alert_id}: {str(e)}")
        raise HTTPException(500, "Failed to acknowledge alert")


@router.put("/{alert_id}/acknowledge", response_model=AlertRead)
def acknowledge_alert_put_endpoint(
    alert_id: int,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AlertRead:
    try:
        userName = getattr(user, "full_name", None) or getattr(user, "name", None) or user.email
        alert = acknowledge_alert(db, alert_id, tenant_id, acknowledged_by=userName)
        if not alert:
            raise HTTPException(404, "Alert not found")
        return alert
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error acknowledging alert {alert_id}: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error acknowledging alert {alert_id}: {str(e)}")
        raise HTTPException(500, "Failed to acknowledge alert")


@router.put("/{alert_id}/resolve", response_model=AlertRead)
def resolve_alert_endpoint(
    alert_id: int,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AlertRead:
    try:
        userName = getattr(user, "full_name", None) or getattr(user, "name", None) or user.email
        alert = resolve_alert(db, alert_id, tenant_id, resolved_by=userName)
        if not alert:
            raise HTTPException(404, "Alert not found")
        return alert
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error resolving alert {alert_id}: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error resolving alert {alert_id}: {str(e)}")
        raise HTTPException(500, "Failed to resolve alert")


@router.delete("/{alert_id}")
def delete_alert_endpoint(
    alert_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    try:
        if not user_is_admin(user):
            raise HTTPException(403, "Only administrators can delete alerts")
        if not delete_alert(db, alert_id, user.tenant_id):
            raise HTTPException(404, "Alert not found")
        return {"deleted": True, "id": alert_id}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error deleting alert {alert_id}: {str(e)}")
        raise HTTPException(503, "Database service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error deleting alert {alert_id}: {str(e)}")
        raise HTTPException(500, "Failed to delete alert")

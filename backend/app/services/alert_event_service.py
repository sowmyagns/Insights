"""Enterprise alert event emitter — single source for ERP notifications.

Creates an ``alerts`` row and fans out per-user ``erp_notifications`` for the bell.
Designed so a future WebSocket publisher can hook ``on_alert_emitted`` without
refactoring callers.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError

from app.models.alert import Alert
from app.models.user import User
from app.services.notification_management_service import NotificationManagementService

logger = logging.getLogger(__name__)

# Alert type → role names that should receive the bell notification.
# Admin always receives every alert (see _resolve_audience_user_ids).
ALERT_AUDIENCE: dict[str, list[str]] = {
    # Inventory
    "low_stock": ["Store Manager"],
    "out_of_stock": ["Store Manager"],
    "stock_adjustment": ["Store Manager"],
    "reorder_level": ["Store Manager"],
    # Production
    "work_order_created": ["Production Manager"],
    "work_order_started": ["Production Manager"],
    "work_order_completed": ["Production Manager", "Store Manager"],
    "production_delay": ["Production Manager"],
    "machine_breakdown": ["Production Manager"],
    "machine_failure": ["Production Manager"],
    # Quality
    "qc_passed": ["Production Manager"],
    "qc_failed": ["Production Manager"],
    "rework_required": ["Production Manager"],
    # Procurement
    "purchase_request": ["Store Manager"],
    "material_request": ["Store Manager"],
    "purchase_order_approved": ["Store Manager", "Accountant"],
    "purchase_order_created": ["Store Manager"],
    "vendor_delivery_delayed": ["Store Manager"],
    # Sales
    "sales_order": ["Accountant", "Production Manager"],
    "dispatch_completed": ["Accountant", "Store Manager"],
    "invoice_generated": ["Accountant"],
    "payment_overdue": ["Accountant"],
    # Maintenance
    "preventive_maintenance_due": ["Production Manager"],
    "machine_service_completed": ["Production Manager"],
    "maintenance_reminder": ["Production Manager"],
    # Finance
    "invoice_due": ["Accountant"],
    "payment_received": ["Accountant"],
    "outstanding_amount": ["Accountant"],
    # HR
    "leave_request": ["HR Manager"],
    "attendance_exception": ["HR Manager"],
    # System
    "login_failure": ["Admin"],
    "license_expiry": ["Admin"],
    "trial_expiry": ["Admin"],
    "backup_failed": ["Admin"],
}

# Map alert_type → notification bell `type` (must be in NOTIFICATION_TYPES)
_ALERT_TO_NOTIF_TYPE: dict[str, str] = {
    "low_stock": "inventory",
    "out_of_stock": "inventory",
    "stock_adjustment": "inventory",
    "reorder_level": "inventory",
    "work_order_created": "production",
    "work_order_started": "production",
    "work_order_completed": "production",
    "production_delay": "production",
    "machine_breakdown": "maintenance",
    "machine_failure": "maintenance",
    "qc_passed": "quality",
    "qc_failed": "quality",
    "rework_required": "quality",
    "purchase_request": "inventory",
    "material_request": "inventory",
    "purchase_order_approved": "inventory",
    "purchase_order_created": "inventory",
    "vendor_delivery_delayed": "inventory",
    "sales_order": "sales",
    "dispatch_completed": "sales",
    "invoice_generated": "finance",
    "payment_overdue": "finance",
    "invoice_due": "finance",
    "payment_received": "finance",
    "outstanding_amount": "finance",
    "preventive_maintenance_due": "maintenance",
    "machine_service_completed": "maintenance",
    "maintenance_reminder": "maintenance",
    "leave_request": "hr",
    "attendance_exception": "hr",
    "login_failure": "system",
    "license_expiry": "system",
    "trial_expiry": "system",
    "backup_failed": "system",
}

_MODULE_DEFAULTS: dict[str, str] = {
    "low_stock": "inventory",
    "out_of_stock": "inventory",
    "stock_adjustment": "inventory",
    "reorder_level": "inventory",
    "work_order_created": "production",
    "work_order_started": "production",
    "work_order_completed": "production",
    "production_delay": "production",
    "machine_breakdown": "maintenance",
    "machine_failure": "maintenance",
    "qc_passed": "quality",
    "qc_failed": "quality",
    "rework_required": "quality",
    "purchase_request": "procurement",
    "material_request": "procurement",
    "purchase_order_approved": "procurement",
    "purchase_order_created": "procurement",
    "vendor_delivery_delayed": "procurement",
    "sales_order": "sales",
    "dispatch_completed": "sales",
    "invoice_generated": "sales",
    "payment_overdue": "accounts",
    "invoice_due": "accounts",
    "payment_received": "accounts",
    "outstanding_amount": "accounts",
    "preventive_maintenance_due": "maintenance",
    "machine_service_completed": "maintenance",
    "maintenance_reminder": "maintenance",
    "leave_request": "hr",
    "attendance_exception": "hr",
    "login_failure": "admin",
    "license_expiry": "admin",
    "trial_expiry": "admin",
    "backup_failed": "admin",
}

DEFAULT_LINKS: dict[str, str] = {
    "low_stock": "/inventory/raw-materials",
    "out_of_stock": "/inventory/raw-materials",
    "stock_adjustment": "/inventory/stock-adjustment",
    "reorder_level": "/inventory/raw-materials",
    "work_order_created": "/production/work-orders",
    "work_order_started": "/production/work-orders",
    "work_order_completed": "/production/work-orders",
    "production_delay": "/alerts/production-delay",
    "machine_breakdown": "/maintenance",
    "machine_failure": "/alerts/machine-failure",
    "qc_passed": "/quality/final",
    "qc_failed": "/quality/inspection",
    "rework_required": "/quality/defects",
    "purchase_request": "/procurement/material-requests",
    "material_request": "/procurement/material-requests",
    "purchase_order_approved": "/procurement/purchase-orders",
    "purchase_order_created": "/procurement/purchase-orders",
    "vendor_delivery_delayed": "/procurement/goods-receipt",
    "sales_order": "/sales/orders",
    "dispatch_completed": "/sales/dispatch",
    "invoice_generated": "/sales/invoices",
    "payment_overdue": "/sales/payments",
    "invoice_due": "/finance/accounts-receivable",
    "payment_received": "/sales/payments",
    "outstanding_amount": "/finance/accounts-receivable",
    "preventive_maintenance_due": "/maintenance/preventive",
    "machine_service_completed": "/maintenance",
    "maintenance_reminder": "/alerts/maintenance",
    "leave_request": "/hr/employees",
    "attendance_exception": "/hr/attendance",
    "login_failure": "/admin/access-logs",
    "license_expiry": "/settings",
    "trial_expiry": "/settings",
    "backup_failed": "/admin",
}

# Optional hook for Phase-2 WebSocket / SSE publishers.
_on_alert_emitted: list[Callable[[Alert], None]] = []


def register_alert_listener(callback: Callable[[Alert], None]) -> None:
    """Register a listener invoked after an alert is persisted (WebSocket-ready)."""
    if callback not in _on_alert_emitted:
        _on_alert_emitted.append(callback)


def _notify_listeners(alert: Alert) -> None:
    for cb in _on_alert_emitted:
        try:
            cb(alert)
        except Exception:
            pass


def _severity_to_priority(severity: str) -> str:
    s = (severity or "medium").lower()
    if s in ("critical", "high", "medium", "low"):
        return s
    return "medium"


def _resolve_audience_user_ids(
    db: Session,
    tenant_id: int,
    alert_type: str,
    target_roles: list[str] | None = None,
) -> list[int]:
    """Resolve user IDs for alert audience based on roles. Returns empty list on failure."""
    try:
        roles = list(target_roles) if target_roles else list(ALERT_AUDIENCE.get(alert_type, []))
        if "Admin" not in roles:
            roles.append("Admin")

        users = list(
            db.scalars(
                select(User)
                .options(joinedload(User.roles))
                .where(User.tenant_id == tenant_id, User.is_active.is_(True))
            ).unique().all()
        )
        role_set = {r.lower() for r in roles}
        ids: list[int] = []
        for u in users:
            names = {r.name.lower() for r in (u.roles or [])}
            if names & role_set:
                ids.append(u.id)
        return ids
    except SQLAlchemyError as e:
        logger.error(f"Database error resolving audience for alert {alert_type} in tenant {tenant_id}: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error resolving audience for alert {alert_type} in tenant {tenant_id}: {str(e)}")
        return []


def fanout_alert_notifications(
    db: Session,
    alert: Alert,
    *,
    created_by_user_id: int | None = None,
) -> int:
    """Create per-user erp_notifications for an alert. Returns count created.
    
    Wraps each notification creation in try-except so individual failures
    do not prevent notifications from being sent to other users.
    """
    try:
        roles = None
        if alert.target_role:
            roles = [r.strip() for r in alert.target_role.split(",") if r.strip()]
        user_ids = _resolve_audience_user_ids(db, alert.tenant_id, alert.alert_type, roles)
        ntype = _ALERT_TO_NOTIF_TYPE.get(alert.alert_type, "information")
        priority = _severity_to_priority(alert.severity)
        module = alert.module or _MODULE_DEFAULTS.get(alert.alert_type, "system")
        link = alert.link or DEFAULT_LINKS.get(alert.alert_type, "/alerts")
        created = 0
        for uid in user_ids:
            try:
                NotificationManagementService.create_for_user(
                    db,
                    tenant_id=alert.tenant_id,
                    user_id=uid,
                    title=alert.title,
                    message=alert.message or alert.title,
                    type=ntype,
                    priority=priority,
                    module=module,
                    action_url=link,
                    created_by=alert.created_by or "System",
                    created_by_user_id=created_by_user_id,
                )
                created += 1
            except Exception as e:
                logger.error(f"Failed to create notification for user {uid} on alert {alert.id}: {str(e)}")
                continue
        return created
    except Exception as e:
        logger.error(f"Error fanning out notifications for alert {alert.id}: {str(e)}")
        return 0


def emit_alert(
    db: Session,
    *,
    tenant_id: int,
    alert_type: str,
    title: str,
    message: str | None = None,
    severity: str = "medium",
    module: str | None = None,
    link: str | None = None,
    reference_type: str | None = None,
    reference_id: int | None = None,
    target_roles: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    created_by: str | None = None,
    created_by_user_id: int | None = None,
    status: str = "active",
    fanout: bool = True,
    commit: bool = True,
) -> Alert | None:
    """Persist an Alert and fan out role-targeted bell notifications.
    
    Returns the created Alert on success. On failure, rolls back the transaction
    and returns None after logging the error. Wraps all database operations in
    try-except to ensure transaction consistency.
    """
    try:
        roles = target_roles if target_roles is not None else ALERT_AUDIENCE.get(alert_type, ["Admin"])
        target_role_str = ",".join(roles) if roles else None
        mod = module or _MODULE_DEFAULTS.get(alert_type, "system")
        action_link = link or DEFAULT_LINKS.get(alert_type, "/alerts")

        alert = Alert(
            tenant_id=tenant_id,
            alert_type=alert_type,
            title=title,
            message=message,
            severity=severity,
            status=status,
            triggered_at=datetime.now(timezone.utc),
            reference_type=reference_type,
            reference_id=reference_id,
            module=mod,
            link=action_link,
            target_role=target_role_str,
            metadata_json=json.dumps(metadata) if metadata else None,
            created_by=created_by or "System",
            is_read=False,
        )
        db.add(alert)
        db.flush()

        if fanout:
            fanout_alert_notifications(db, alert, created_by_user_id=created_by_user_id)

        if commit:
            db.commit()
            db.refresh(alert)
        else:
            db.flush()

        _notify_listeners(alert)
        return alert
    except SQLAlchemyError as e:
        logger.error(f"Database error emitting alert {alert_type} for tenant {tenant_id}: {str(e)}")
        db.rollback()
        return None
    except Exception as e:
        logger.error(f"Unexpected error emitting alert {alert_type} for tenant {tenant_id}: {str(e)}")
        db.rollback()
        return None

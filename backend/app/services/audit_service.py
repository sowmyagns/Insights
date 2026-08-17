"""Backward-compatible audit helpers — delegates to AuditLogService. """

from __future__ import annotations

import logging
from datetime import datetime
from fastapi import Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.security import AccessLog
from app.models.user import User
from app.services.audit_log_service import (
    AuditLogService,
    MODULE_MAP,
    delete_audit_log,
    export_audit_logs_csv,
    format_audit_row,
    query_audit_logs,
    recent_login_activity,
    resolve_module,
)

logger = logging.getLogger("gns_insights.audit")

__all__ = [
    "AuditLogService",
    "MODULE_MAP",
    "delete_audit_log",
    "export_audit_logs_csv",
    "format_audit_row",
    "log_audit",
    "mark_logout_audit",
    "query_audit_logs",
    "recent_login_activity",
    "record_login_audit",
    "resolve_module",
    "write_audit_log",
]


def write_audit_log(
    db: Session,
    *,
    tenant_id: int | None = None,
    action: str,
    user: User | None = None,
    user_id: int | None = None,
    full_name: str | None = None,
    email: str | None = None,
    role: str | None = None,
    company_name: str | None = None,
    company_id: int | None = None,
    resource: str | None = None,
    resource_id: int | None = None,
    module_name: str | None = None,
    login_status: str | None = None,
    request: Request | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    session_id: str | None = None,
    login_at: datetime | None = None,
    logout_at: datetime | None = None,
    details: str | None = None,
    commit: bool = True,
) -> AccessLog | None:
    """Compatibility wrapper around AuditLogService.log()."""
    try:
        current_user = user
        if current_user is None and user_id is not None:
            current_user = db.get(User, user_id)

        # If callers pass denormalized fields without a user object, still log via service
        # then patch any explicit overrides that were provided.
        row = AuditLogService.log(
            db=db,
            request=request,
            current_user=current_user,
            action=action,
            module_name=module_name,
            details=details,
            resource=resource,
            resource_id=resource_id,
            login_status=login_status,
            session_id=session_id,
            login_at=login_at,
            logout_at=logout_at,
            email_override=email,
            commit=False,
        )
        if row is None:
            if commit:
                db.rollback()
            return None

        # Apply any explicit overrides from legacy call sites
        dirty = False
        if company_id is not None and row.company_id != company_id:
            row.company_id = company_id
            dirty = True
        if company_name and row.company_name != company_name:
            row.company_name = company_name
            dirty = True
        if full_name and row.full_name != full_name:
            row.full_name = full_name
            dirty = True
        if role and row.role != role:
            row.role = role
            dirty = True
        if tenant_id is not None and row.tenant_id != tenant_id:
            row.tenant_id = tenant_id
            dirty = True
        if ip_address and not row.ip_address:
            row.ip_address = ip_address
            dirty = True
        if user_agent and not row.user_agent:
            row.user_agent = user_agent[:512]
            dirty = True
        if dirty:
            db.add(row)
        if commit:
            db.commit()
            db.refresh(row)
        else:
            db.flush()
        return row
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in write_audit_log - action={action}, tenant_id={tenant_id}: {str(e)}"
        )
        db.rollback()
        return None
    except Exception as e:
        logger.error(
            f"Unexpected error in write_audit_log - action={action}, tenant_id={tenant_id}: {str(e)}"
        )
        db.rollback()
        return None


def record_login_audit(
    db: Session,
    *,
    email: str,
    success: bool,
    user: User | None = None,
    request: Request | None = None,
    role: str | None = None,
) -> AccessLog | None:
    try:
        if success and user is not None:
            return AuditLogService.log_login_success(
                db, request=request, user=user, role=role
            )
        return AuditLogService.log_login_failed(
            db, request=request, email=email, user=user, role=role
        )
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in record_login_audit - email={email}, success={success}: {str(e)}"
        )
        db.rollback()
        return None
    except Exception as e:
        logger.error(
            f"Unexpected error in record_login_audit - email={email}, success={success}: {str(e)}"
        )
        db.rollback()
        return None


def mark_logout_audit(
    db: Session,
    *,
    user: User,
    request: Request | None = None,
) -> AccessLog | None:
    try:
        return AuditLogService.log_logout(db, request=request, user=user)
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in mark_logout_audit for user {user.id}: {str(e)}"
        )
        db.rollback()
        return None
    except Exception as e:
        logger.error(
            f"Unexpected error in mark_logout_audit for user {user.id}: {str(e)}"
        )
        db.rollback()
        return None


def log_audit(
    db: Session,
    *,
    tenant_id: int,
    user_id: int | None = None,
    action: str,
    resource: str,
    resource_id: int | None = None,
    ip_address: str | None = None,
    details: str | None = None,
) -> None:
    try:
        user = db.get(User, user_id) if user_id is not None else None
        row = AuditLogService.log(
            db=db,
            current_user=user,
            action=action,
            module_name=resolve_module(action, resource),
            details=details,
            resource=resource,
            resource_id=resource_id,
            email_override=user.email if user else None,
            commit=True,
        )
        if row is not None and ip_address and not row.ip_address:
            row.ip_address = ip_address
            db.commit()
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in log_audit - action={action}, tenant_id={tenant_id}: {str(e)}"
        )
        db.rollback()
    except Exception as e:
        logger.error(
            f"Unexpected error in log_audit - action={action}, tenant_id={tenant_id}: {str(e)}"
        )
        db.rollback()

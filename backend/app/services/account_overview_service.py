"""Account overview for the authenticated user (Settings)."""

from __future__ import annotations

import logging
import logging
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

logger = logging.getLogger(__name__)

from app.models.platform import CompanyLicense
from app.models.security import AccessLog
from app.models.tenant import Tenant
from app.models.user import User

logger = logging.getLogger(__name__)


def _as_aware(dt: datetime | str | int | float | None) -> datetime | None:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        try:
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return None
    if isinstance(dt, str):
        cleaned = dt.strip()
        if not cleaned:
            return None
        try:
            parsed = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed
        except Exception:
            return None
    if isinstance(dt, (int, float)):
        try:
            return datetime.fromtimestamp(dt, tz=timezone.utc)
        except Exception:
            return None
    return None


def _iso(dt: datetime | str | int | float | None) -> str | None:
    try:
        aware = _as_aware(dt)
        return aware.isoformat() if aware else None
    except Exception:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _iso(dt: datetime | None) -> str | None:
    try:
        aware = _as_aware(dt)
        return aware.isoformat() if aware else None
    except :
        # If datetime formatting fails, return None instead of raising
        return None


def _display_or_none(value) -> str | None:
    if value is None:
        return None
    try:
        text = str(value).strip()
        return text or None
    except Exception:
        return None
    try:
        text = str(value).strip()
        return text or None
    except :
        # If string conversion fails, return None instead of raising
        return None


def _normalize_plan(raw: str | None) -> str | None:
    if not raw:
        return None
    try:
        key = str(raw).strip().lower()
        mapping = {
            "trial": "Trial",
            "free": "Free",
            "growth": "Growth",
            "scale": "Scale",
            "dominate": "Dominate",
            "enterprise": "Enterprise",
            "basic": "Growth",
            "pro": "Scale",
            "professional": "Scale",
        }
        return mapping.get(key, str(raw).strip().title())
    except Exception:
        return None
    try:
        key = raw.strip().lower()
        mapping = {
            "trial": "Trial",
            "free": "Free",
            "growth": "Growth",
            "scale": "Scale",
            "dominate": "Dominate",
            "enterprise": "Enterprise",
            "basic": "Growth",
            "pro": "Scale",
            "professional": "Scale",
        }
        return mapping.get(key, raw.strip().title())
    except :
        # If normalization fails, return None to avoid corrupting the plan field
        return None


def _normalize_license_status(
    *,
    license_status: str | None,
    plan: str | None,
    trial_expires_at: datetime | str | int | float | None,
    license_expires_at: datetime | str | int | float | None,
) -> str:
    try:
        now = datetime.now(timezone.utc)
        status = (license_status or "").strip().lower()
        plan_l = (plan or "").strip().lower()

    expiry = None
    try:
        expiry = _as_aware(license_expires_at) or _as_aware(trial_expires_at)
    except Exception as exc:
        logger.warning("Invalid datetime in _normalize_license_status: %s", exc)
        expiry = None

    if status in {"expired", "inactive", "suspended"}:
        return "Expired"
    if expiry is not None:
        try:
            if expiry < now:
                return "Expired"
        except Exception as exc:
            logger.warning("Error comparing expiry datetime in _normalize_license_status: %s", exc)
    if status == "trial" or plan_l == "trial":
        return "Trial"
    if status in {"active", "licensed", ""}:
        if plan_l == "trial":
            return "Trial"
        return "Active"
    return (license_status or "Active").strip().title()
        expiry = _as_aware(license_expires_at) or _as_aware(trial_expires_at)
        if status in {"expired", "inactive", "suspended"}:
            return "Expired"
        if expiry and expiry < now:
            return "Expired"
        if status == "trial" or plan_l == "trial":
            return "Trial"
        if status in {"active", "licensed", ""}:
            if plan_l == "trial":
                return "Trial"
            return "Active"
        return (license_status or "Active").strip().title()
    except Exception:
        # If datetime comparison or status normalization fails, return safe default
        return "Active"


def get_account_overview(db: Session, current_user: User) -> dict:
    """
    Build live account overview for the JWT user only.
    Sources: tenants (company), users, company_licenses (subscription), access_logs.
    """
    try:
        user = db.scalars(
            select(User)
            .where(User.id == current_user.id, User.tenant_id == current_user.tenant_id)
            .options(selectinload(User.roles), selectinload(User.tenant))
        ).first()
        if user is None:
            # Should not happen for a valid JWT; return empty-safe payload.
            return {
                "company_name": None,
                "company_id": None,
                "user_name": None,
                "employee_id": None,
                "role": None,
                "department": None,
                "email": None,
                "phone": None,
                "subscription_plan": None,
                "license_status": None,
                "trial_expiry": None,
                "current_login": None,
                "last_login": None,
            }

    tenant = None
    try:
        tenant = user.tenant or db.get(Tenant, user.tenant_id)
    except Exception as exc:
        logger.warning("Error fetching tenant in get_account_overview: %s", exc)
        tenant = None

    license_row = None
    try:
        license_row = db.scalars(
            select(CompanyLicense).where(CompanyLicense.tenant_id == user.tenant_id)
        ).first()
    except Exception as exc:
        logger.warning("Error fetching company license in get_account_overview: %s", exc)
        license_row = None
        tenant = user.tenant or db.get(Tenant, user.tenant_id)
        license_row = db.scalars(
            select(CompanyLicense).where(CompanyLicense.tenant_id == user.tenant_id)
        ).first()

        company_name = _display_or_none(tenant.name if tenant else None)
        company_code = None
        if tenant is not None:
            company_code = _display_or_none(getattr(tenant, "company_code", None)) or (
                f"GNS-{tenant.id:05d}"
            )

        role = None
        if user.roles:
            role = user.roles[0].name

        plan_raw = None
        if license_row is not None:
            plan_raw = license_row.plan
        elif tenant is not None:
            plan_raw = tenant.subscription

        license_status_raw = None
        if license_row is not None:
            license_status_raw = license_row.status
        elif tenant is not None:
            license_status_raw = tenant.license_status

        trial_expiry = None
        if tenant is not None:
            trial_expiry = tenant.trial_expires_at
        if license_row is not None and license_row.expires_at and (
            (plan_raw or "").lower() == "trial" or trial_expiry is None
        ):
            # Prefer license expiry when on trial / when tenant trial is empty
            if (plan_raw or "").lower() == "trial" or trial_expiry is None:
                trial_expiry = license_row.expires_at

        plan = _normalize_plan(plan_raw)
        license_status = _normalize_license_status(
            license_status=license_status_raw,
            plan=plan_raw,
            trial_expires_at=trial_expiry,
            license_expires_at=license_row.expires_at if license_row else None,
        )

    # Current + previous successful logins from access_logs (tenant-scoped)
    login_rows = []
    try:
        login_rows = db.scalars(
            select(AccessLog)
            .where(
                AccessLog.user_id == user.id,
                or_(
                    AccessLog.company_id == user.tenant_id,
                    AccessLog.tenant_id == user.tenant_id,
                ),
                AccessLog.action == "login",
                AccessLog.login_status == "Success",
            )
            .order_by(AccessLog.logged_at.desc())
            .limit(2)
        ).all()
    except Exception as exc:
        logger.warning("Error fetching access logs in get_account_overview: %s", exc)
        login_rows = []
        # Current + previous successful logins from access_logs (tenant-scoped)
        login_rows = db.scalars(
            select(AccessLog)
            .where(
                AccessLog.user_id == user.id,
                or_(
                    AccessLog.company_id == user.tenant_id,
                    AccessLog.tenant_id == user.tenant_id,
                ),
                AccessLog.action == "login",
                AccessLog.login_status == "Success",
            )
            .order_by(AccessLog.logged_at.desc())
            .limit(2)
        ).all()

        current_login = None
        last_login = None
        if login_rows:
            current_login = login_rows[0].login_at or login_rows[0].logged_at
            if len(login_rows) > 1:
                last_login = login_rows[1].login_at or login_rows[1].logged_at
        # Fallback to user.last_login_at when access_logs are sparse
        if current_login is None and getattr(user, "last_login_at", None):
            current_login = user.last_login_at

        return {
            "company_name": company_name,
            "company_id": company_code,
            "user_name": _display_or_none(user.full_name),
            "employee_id": _display_or_none(user.employee_id),
            "role": _display_or_none(role),
            "department": _display_or_none(user.department),
            "email": _display_or_none(user.email),
            "phone": _display_or_none(user.phone),
            "subscription_plan": plan,
            "license_status": license_status,
            "trial_expiry": _iso(trial_expiry),
            "current_login": _iso(current_login),
            "last_login": _iso(last_login),
            "user_id": user.id,
            "tenant_id": user.tenant_id,
        }
    except SQLAlchemyError as exc:
        logger.exception("Database error retrieving account overview: %s", exc)
        # Return minimal safe response on database failure
        return {
            "company_name": None,
            "company_id": None,
            "user_name": None,
            "employee_id": None,
            "role": None,
            "department": None,
            "email": None,
            "phone": None,
            "subscription_plan": None,
            "license_status": None,
            "trial_expiry": None,
            "current_login": None,
            "last_login": None,
        }
    except Exception as exc:
        logger.exception("Unexpected error retrieving account overview: %s", exc)
        # Return minimal safe response on unexpected failure
        return {
            "company_name": None,
            "company_id": None,
            "user_name": None,
            "employee_id": None,
            "role": None,
            "department": None,
            "email": None,
            "phone": None,
            "subscription_plan": None,
            "license_status": None,
            "trial_expiry": None,
            "current_login": None,
            "last_login": None,
        }

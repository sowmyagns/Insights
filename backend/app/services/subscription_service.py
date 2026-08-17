"""Tenant subscription helpers — plans, current status, trial activation.

Extends Settings (no separate subscription module / duplicate tables).
Uses existing ``tenants`` + ``company_licenses`` fields.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.models.platform import CompanyLicense
from app.models.tenant import Tenant
from app.models.user import User
from app.services.account_overview_service import _as_aware, _iso, _normalize_plan

# Canonical plan catalog (served via Settings API — matches Subscription UI)
SUBSCRIPTION_PLANS: list[dict] = [
    {
        "id": "free",
        "name": "FREE",
        "price": "₹0",
        "price_amount": 0,
        "currency": "INR",
        "billing_cycle": "forever",
        "billing": None,
        "billing_label": "Free forever",
        "features": [
            "Advanced Lead Management",
            "Inventory History",
            "30 Transaction/Month",
            "10+ Reports and Business Intelligence",
        ],
    },
    {
        "id": "growth",
        "name": "GROWTH",
        "price": "₹36,000",
        "price_amount": 36000,
        "currency": "INR",
        "billing_cycle": "quarterly",
        "billing": "Billed Quarterly Only",
        "billing_label": "Billed Quarterly Only",
        "features": [
            "Everything in Free",
            "Unlimited transactions",
            "Multi-warehouse inventory",
            "Procurement & GRN",
            "Priority email support",
        ],
    },
    {
        "id": "scale",
        "name": "SCALE",
        "price": "₹1,50,000",
        "price_amount": 150000,
        "currency": "INR",
        "billing_cycle": "annually",
        "billing": "Billed Annually Only",
        "billing_label": "Billed Annually Only",
        "features": [
            "Everything in Growth",
            "Production & MRP spine",
            "Quality & maintenance modules",
            "Advanced analytics",
            "Dedicated success manager",
        ],
    },
    {
        "id": "dominate",
        "name": "DOMINATE",
        "price": "₹3,60,000",
        "price_amount": 360000,
        "currency": "INR",
        "billing_cycle": "annually",
        "billing": "Billed Annually Only",
        "billing_label": "Billed Annually Only",
        "features": [
            "Everything in Scale",
            "Unlimited plants & users",
            "Custom integrations",
            "SLA & onsite onboarding",
            "24×7 premium support",
        ],
    },
]

DEFAULT_TRIAL_DAYS = 5


def _plan_by_id(plan_id: str) -> dict | None:
    key = (plan_id or "").strip().lower()
    for p in SUBSCRIPTION_PLANS:
        if p["id"] == key:
            return p
    return None


def list_subscription_plans() -> list[dict]:
    return list(SUBSCRIPTION_PLANS)


def get_plan_details(plan_id: str) -> dict:
    plan = _plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


def _resolve_tenant(db: Session, user: User) -> Tenant:
    tenant = db.get(Tenant, user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return tenant


def _license_row(db: Session, tenant_id: int) -> CompanyLicense | None:
    try:
        return db.scalars(
            select(CompanyLicense).where(CompanyLicense.tenant_id == tenant_id)
        ).first()
    except Exception as exc:
        logger.warning("Error querying CompanyLicense for tenant_id=%s: %s", tenant_id, exc)
        return None


def _trial_active(tenant: Tenant) -> bool:
    if not tenant.trial_status:
        return False
    exp = _as_aware(tenant.trial_expires_at)
    if exp is None:
        return False
    return exp > datetime.now(timezone.utc)


def get_current_subscription(db: Session, user: User) -> dict:
    tenant = _resolve_tenant(db, user)
    license_row = _license_row(db, tenant.id)

    trial_active = _trial_active(tenant)
    exp = _as_aware(tenant.trial_expires_at)
    if exp is not None and exp <= datetime.now(timezone.utc) and (tenant.trial_status or tenant.subscription == "trial" or tenant.license_status == "trial"):
        tenant.trial_status = False
        tenant.license_status = "expired"
        if tenant.subscription == "trial":
            tenant.subscription = "expired"
        if license_row:
            license_row.status = "expired"
            if license_row.plan == "trial":
                license_row.plan = "expired"
        try:
            db.commit()
            db.refresh(tenant)
            if license_row:
                db.refresh(license_row)
        except Exception as exc:
            db.rollback()
            logger.warning("Failed to persist expired trial status for tenant %s: %s", tenant.id, exc)

    plan_raw = (license_row.plan if license_row else None) or tenant.subscription or "free"
    plan_key = str(plan_raw).strip().lower()

    found_catalog = _plan_by_id(plan_key)
    if found_catalog and not (plan_key == "trial" and not trial_active):
        catalog = found_catalog
    elif plan_key == "trial" and trial_active:
        catalog = {
            "id": "trial",
            "name": "TRIAL",
            "price": "₹0",
            "billing_label": f"Free Trial ({tenant.trial_days or DEFAULT_TRIAL_DAYS} days)",
            "features": [
                "Full module access during trial",
                "Upgrade anytime to Growth, Scale, or Dominate",
            ],
        }
    elif plan_key in ("trial", "expired") or (exp is not None and exp <= datetime.now(timezone.utc) and tenant.trial_expires_at is not None):
        catalog = {
            "id": "expired",
            "name": "EXPIRED",
            "price": "₹0",
            "billing_label": "Trial Expired",
            "features": [
                "Trial has expired",
                "Upgrade to Growth, Scale, or Dominate to restore full access",
            ],
        }
    else:
        logger.warning("Unsupported or corrupted subscription plan '%s' for tenant %s", plan_raw, tenant.id)
        catalog = {
            "id": plan_key,
            "name": f"INVALID ({str(plan_raw).upper()})",
            "price": None,
            "billing_label": f"Invalid Plan: {plan_raw}",
            "features": ["Unsupported subscription plan stored on account. Please contact support."],
        }

    can_activate_trial = False
    if plan_key == "free" and not tenant.trial_expires_at and not tenant.trial_status:
        can_activate_trial = True

    license_status_val = tenant.license_status or (license_row.status if license_row else "active")
    if not trial_active and exp is not None and exp <= datetime.now(timezone.utc):
        license_status_val = "expired"
    elif catalog.get("id") == plan_key and "INVALID" in catalog.get("name", ""):
        license_status_val = "invalid"

    return {
        "subscription_plan": catalog.get("name") if catalog else _normalize_plan(plan_raw),
        "plan_id": catalog.get("id") if catalog else plan_key,
        "plan_name": catalog.get("name") if catalog else plan_raw,
        "price": catalog.get("price") if catalog else None,
        "billing_label": catalog.get("billing_label") or catalog.get("billing"),
        "features": (catalog or {}).get("features") or [],
        "license_status": license_status_val,
        "trial_status": bool(tenant.trial_status and trial_active),
        "trial_active": trial_active,
        "trial_days": tenant.trial_days or DEFAULT_TRIAL_DAYS,
        "trial_expires_at": _iso(tenant.trial_expires_at),
        "can_activate_trial": can_activate_trial,
        "plans": list_subscription_plans(),
    }


def activate_trial(db: Session, user: User) -> dict:
    """Activate or refresh the company free trial on existing tenant + license rows."""
    tenant = _resolve_tenant(db, user)
    current = get_current_subscription(db, user)
    if not current["can_activate_trial"] and current["trial_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trial is already active for this company.",
        )
    if not current["can_activate_trial"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trial cannot be activated on the current paid plan. Contact sales to change plans.",
        )

    days = int(tenant.trial_days or DEFAULT_TRIAL_DAYS)
    expires = datetime.now(timezone.utc) + timedelta(days=days)

    tenant.subscription = "trial"
    tenant.trial_status = True
    tenant.trial_days = days
    tenant.trial_expires_at = expires
    tenant.license_status = "trial"
    tenant.status = "active"

    license_row = _license_row(db, tenant.id)
    if license_row is None:
        license_row = CompanyLicense(
            tenant_id=tenant.id,
            plan="trial",
            status="trial",
            max_users=50,
            issued_at=datetime.now(timezone.utc),
            expires_at=expires,
        )
        db.add(license_row)
    else:
        license_row.plan = "trial"
        license_row.status = "trial"
        license_row.issued_at = datetime.now(timezone.utc)
        license_row.expires_at = expires

    db.commit()
    db.refresh(tenant)

    try:
        from app.services.alert_event_service import emit_alert

        emit_alert(
            db,
            tenant_id=tenant.id,
            alert_type="trial_expiry",
            title="Free trial activated",
            message=f"Trial activated for {days} days — expires {_iso(expires)}",
            severity="low",
            link="/settings/subscription",
            created_by=user.full_name or user.email,
            created_by_user_id=user.id,
        )
    except Exception:
        pass

    return get_current_subscription(db, user)


def submit_sales_inquiry(
    db: Session,
    user: User,
    *,
    message: str | None = None,
    preferred_plan: str | None = None,
) -> dict:
    """Record a sales contact request via the existing alerts/notification pipeline."""
    tenant = _resolve_tenant(db, user)
    body = (message or "").strip() or "Customer requested a callback from Subscription settings."
    plan_note = f" Preferred plan: {preferred_plan}." if preferred_plan else ""
    try:
        from app.services.alert_event_service import emit_alert

        emit_alert(
            db,
            tenant_id=tenant.id,
            alert_type="outstanding_amount",  # finance/admin audience; reuse role fan-out
            title="Talk to an expert — sales inquiry",
            message=f"{body}{plan_note} From {user.full_name or user.email} ({user.email})",
            severity="medium",
            module="settings",
            link="/settings/subscription",
            target_roles=["Admin", "Accountant"],
            created_by=user.full_name or user.email,
            created_by_user_id=user.id,
            metadata={
                "type": "sales_inquiry",
                "user_id": user.id,
                "preferred_plan": preferred_plan,
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit inquiry: {exc}",
        ) from exc

    return {
        "submitted": True,
        "message": "Your request was sent. Our team will contact you shortly.",
    }

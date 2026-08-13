"""Atomic document-number allocation for multi-user safety.

Uses a locked CompanySettings counter row (SELECT … FOR UPDATE where supported)
and never commits mid-allocation — callers own the outer transaction.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company_settings import CompanySettings
from app.services.company_settings_service import get_or_create_settings


def _lock_settings(db: Session, tenant_id: int) -> CompanySettings:
    settings = db.scalars(
        select(CompanySettings)
        .where(CompanySettings.tenant_id == tenant_id)
        .with_for_update()
    ).first()
    if settings:
        return settings
    get_or_create_settings(db, tenant_id)
    settings = db.scalars(
        select(CompanySettings)
        .where(CompanySettings.tenant_id == tenant_id)
        .with_for_update()
    ).first()
    if not settings:
        raise RuntimeError(f"company_settings missing for tenant {tenant_id}")
    return settings


def allocate_counter_number(
    db: Session,
    tenant_id: int,
    *,
    prefix_attr: str,
    counter_attr: str,
    default_prefix: str,
    width: int = 6,
) -> tuple[str, str]:
    """Return (prefix, full_number) and increment the counter (flush only)."""
    settings = _lock_settings(db, tenant_id)
    prefix = (getattr(settings, prefix_attr, None) or default_prefix or "").strip() or default_prefix
    seq = int(getattr(settings, counter_attr, None) or 1)
    full = f"{prefix}{seq:0{width}d}"
    setattr(settings, counter_attr, seq + 1)
    db.flush()
    return prefix, full


def next_document_number_from_max(
    db: Session,
    *,
    model,
    tenant_id: int,
    number_attr: str,
    prefix: str,
    width: int = 5,
    extra_filters=(),
) -> str:
    """Allocate PREFIX-##### using MAX existing number + 1 (flush-safe within txn).

    Prefer counter-based allocate_counter_number for high-concurrency paths.
    This helper is for types without a dedicated counter column.
    """
    from sqlalchemy import func

    col = getattr(model, number_attr)
    stmt = select(func.max(col)).where(model.tenant_id == tenant_id, *extra_filters)
    current = db.scalar(stmt)
    next_n = 1
    if current:
        # Strip prefix and parse trailing digits
        raw = str(current)
        digits = "".join(ch for ch in raw if ch.isdigit())
        if digits:
            try:
                # Prefer suffix after last non-digit run matching width
                tail = raw.rsplit("-", 1)[-1]
                next_n = int(tail) + 1 if tail.isdigit() else int(digits) + 1
            except ValueError:
                next_n = 1
    return f"{prefix}-{next_n:0{width}d}"

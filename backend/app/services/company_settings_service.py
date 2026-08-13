import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company_settings import CompanySettings
from app.models.tenant import Tenant
from app.schemas.company_settings import CompanySettingsRead, CompanySettingsUpdate
from app.utils.field_crypto import decrypt_field, encrypt_field

_SENSITIVE_FIELDS = ("bank_account_number", "bank_ifsc")


def get_or_create_settings(db: Session, tenant_id: int) -> CompanySettings:
    """Return settings for tenant. Flush only — never commit (callers own the txn)."""
    settings = db.scalars(
        select(CompanySettings).where(CompanySettings.tenant_id == tenant_id)
    ).first()
    if settings:
        return settings

    tenant = db.get(Tenant, tenant_id)
    settings = CompanySettings(
        tenant_id=tenant_id,
        company_name=tenant.name if tenant else None,
        invoice_prefix="INV-",
        quotation_prefix="QUO-",
        purchase_prefix="PUR-",
        po_prefix="PO-",
        so_prefix="SO-",
        invoice_next_number=1,
        quotation_next_number=1,
        purchase_next_number=1,
    )
    db.add(settings)
    db.flush()
    db.refresh(settings)
    return settings


def _parse_custom_fields(raw: str | None) -> list[dict] | None:
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else None
    except Exception:
        return None


def to_settings_read(settings: CompanySettings) -> CompanySettingsRead:
    """Build API read model with sensitive fields decrypted (does not mutate ORM)."""
    data = {
        c.name: getattr(settings, c.name)
        for c in settings.__table__.columns
        if c.name != "custom_fields_json"
    }
    data["custom_fields"] = _parse_custom_fields(settings.custom_fields_json)
    for field in _SENSITIVE_FIELDS:
        raw = data.get(field)
        try:
            data[field] = decrypt_field(raw)
        except Exception:
            pass
    return CompanySettingsRead.model_validate(data)


def update_settings(
    db: Session, tenant_id: int, payload: CompanySettingsUpdate
) -> CompanySettings:
    settings = get_or_create_settings(db, tenant_id)
    data = payload.model_dump(exclude_unset=True)
    if "custom_fields" in data:
        fields = data.pop("custom_fields")
        data["custom_fields_json"] = (
            json.dumps(fields) if fields is not None else None
        )
    for field in _SENSITIVE_FIELDS:
        if field in data and data[field] is not None:
            data[field] = encrypt_field(data[field])
    for field, value in data.items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings

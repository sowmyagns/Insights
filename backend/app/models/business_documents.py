"""Generic business documents for Sales / Purchases v2 menus."""

from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class BusinessDocument(Base, TimestampMixin):
    """Unified store for payment receipts, credit notes, purchases, etc."""

    __tablename__ = "business_documents"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "doc_type",
            "document_number",
            name="uq_business_documents_tenant_type_number",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    module: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    doc_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    document_number: Mapped[str] = mapped_column(String(64), nullable=False)
    party_name: Mapped[str | None] = mapped_column(String(255))
    document_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    meta_json: Mapped[str | None] = mapped_column(Text)

    @property
    def meta(self) -> dict[str, Any] | None:
        if not self.meta_json:
            return None
        try:
            data = json.loads(self.meta_json)
            return data if isinstance(data, dict) else None
        except Exception:
            return None


class EwaybillCredential(Base, TimestampMixin):
    __tablename__ = "ewaybill_credentials"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    gstin: Mapped[str] = mapped_column(String(32), nullable=False)
    username: Mapped[str] = mapped_column(String(128), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_connected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime)


class DigitalSignatureProfile(Base, TimestampMixin):
    __tablename__ = "digital_signature_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    is_setup: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    promo_credits: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    signatory_name: Mapped[str | None] = mapped_column(String(255))
    aadhaar_masked: Mapped[str | None] = mapped_column(String(32))
    setup_at: Mapped[datetime | None] = mapped_column(DateTime)


class AppFeatureSetting(Base, TimestampMixin):
    __tablename__ = "app_feature_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    setting_key: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    setting_value: Mapped[str | None] = mapped_column(Text)

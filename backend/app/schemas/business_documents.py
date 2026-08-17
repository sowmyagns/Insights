import json
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


VALID_DOCUMENT_STATUSES = {
    "draft", "pending", "approved", "rejected", "issued", "paid", "partially_paid", "cancelled", "overdue", "void", "sent", "received"
}


class BusinessDocumentCreate(BaseModel):
    tenant_id: int | None = Field(None, ge=1)
    module: str = "sales"
    doc_type: str = Field(..., min_length=1)
    document_number: str | None = None
    party_name: str | None = None
    document_date: date | None = None
    due_date: date | None = None
    amount: float = Field(0.0, ge=0.0)
    status: str = "draft"
    notes: str | None = None
    meta: dict[str, Any] | None = None

    @field_validator("doc_type", mode="before")
    @classmethod
    def validate_non_whitespace_doc_type(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip()
            if not s:
                raise ValueError("doc_type cannot be empty or whitespace-only.")
            return s
        raise ValueError("doc_type is required.")

    @field_validator("status", mode="before")
    @classmethod
    def validate_doc_status(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_DOCUMENT_STATUSES:
                raise ValueError(f"Invalid document status '{v}'.")
            return s
        return "draft"

    @model_validator(mode="after")
    def validate_dates(self) -> "BusinessDocumentCreate":
        doc_dt = self.document_date or date.today()
        if self.due_date and self.due_date < doc_dt:
            raise ValueError("Due date cannot be earlier than document date.")
        return self


class BusinessDocumentUpdate(BaseModel):
    party_name: str | None = None
    document_number: str | None = None
    document_date: date | None = None
    due_date: date | None = None
    amount: float | None = Field(None, ge=0.0)
    status: str | None = None
    notes: str | None = None
    meta: dict[str, Any] | None = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_doc_status(cls, v: Any) -> str | None:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_DOCUMENT_STATUSES:
                raise ValueError(f"Invalid document status '{v}'.")
            return s
        return None

    @model_validator(mode="after")
    def validate_dates(self) -> "BusinessDocumentUpdate":
        if self.document_date and self.due_date and self.due_date < self.document_date:
            raise ValueError("Due date cannot be earlier than document date.")
        return self


class BusinessDocumentRead(BaseModel):
    id: int
    tenant_id: int
    module: str
    doc_type: str
    document_number: str
    party_name: str | None = None
    document_date: date
    due_date: date | None = None
    amount: float = 0
    status: str = "draft"
    notes: str | None = None
    meta: dict[str, Any] | None = None
    model_config = ConfigDict(from_attributes=True)


class BusinessDocumentListResponse(BaseModel):
    items: list[BusinessDocumentRead] = []
    total: int = 0


from app.utils.gst import validate_gstin


class EwaybillLoginRequest(BaseModel):
    gstin: str
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

    @field_validator("gstin", mode="before")
    @classmethod
    def validate_gstin_format(cls, v: Any) -> str:
        res = validate_gstin(v, required=True)
        if not res:
            raise ValueError("GSTIN is required")
        return res

    @field_validator("username", "password", mode="before")
    @classmethod
    def validate_non_empty_credentials(cls, v: Any, info: Any) -> str:
        if v is not None:
            s = str(v).strip()
            if not s:
                raise ValueError(f"{info.field_name} cannot be empty or whitespace-only.")
            return s
        raise ValueError(f"{info.field_name} is required.")


class EwaybillLoginResponse(BaseModel):
    success: bool
    message: str
    connected: bool = False
    gstin: str | None = None


class EwaybillStatusRead(BaseModel):
    connected: bool = False
    gstin: str | None = None
    username: str | None = None
    last_login_at: datetime | None = None


class DigitalSignatureStatusRead(BaseModel):
    is_setup: bool = False
    promo_credits: int = 3
    signatory_name: str | None = None
    aadhaar_masked: str | None = None


class DigitalSignatureSetupRequest(BaseModel):
    signatory_name: str = Field(..., min_length=1)
    aadhaar_last4: str = Field(..., min_length=4, max_length=4)

    @field_validator("signatory_name", mode="before")
    @classmethod
    def validate_signatory_name(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip()
            if not s:
                raise ValueError("Signatory name cannot be empty or whitespace-only.")
            return s
        raise ValueError("Signatory name is required.")

    @field_validator("aadhaar_last4", mode="before")
    @classmethod
    def validate_aadhaar_last4(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip()
            if len(s) != 4 or not s.isdigit():
                raise ValueError("Aadhaar last 4 digits must contain exactly 4 numeric digits.")
            return s
        raise ValueError("Aadhaar last 4 digits are required.")


class FeatureSettingRead(BaseModel):
    key: str
    value: Any = None


class FeatureSettingUpdate(BaseModel):
    value: Any = None

    @field_validator("value", mode="before")
    @classmethod
    def validate_setting_value(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, (bool, int, float, str, list, dict)):
            try:
                json.dumps(v)
                return v
            except (TypeError, ValueError) as exc:
                raise ValueError("Feature setting value must be a valid JSON-serializable value.") from exc
        raise ValueError("Invalid feature setting value type. Must be a boolean, number, string, dict, or list.")

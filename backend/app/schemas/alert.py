import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


VALID_SEVERITIES = {
    "low", "medium", "high", "critical", "warning", "info", "danger", "success"
}


VALID_STATUSES = {
    "active", "acknowledged", "resolved", "dismissed", "closed", "silenced", "pending"
}


class AlertBase(BaseModel):
    tenant_id: int | None = None
    alert_type: str = "general"
    title: str = Field(..., min_length=1, max_length=255)
    message: str | None = None
    severity: str = "medium"
    status: str = "active"
    assigned_to: str | None = None
    created_by: str | None = None
    acknowledged_by: str | None = None
    triggered_at: datetime | None = None
    reference_type: str | None = None
    reference_id: int | None = None
    module: str | None = None
    link: str | None = None
    target_role: str | None = None
    metadata_json: str | None = None
    is_read: bool = False

    @field_validator("title", mode="before")
    @classmethod
    def validate_title(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip()
            if not s:
                raise ValueError("Alert title cannot be empty or whitespace-only.")
            return s
        raise ValueError("Alert title is required.")

    @field_validator("severity", mode="before")
    @classmethod
    def validate_severity(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_SEVERITIES:
                raise ValueError(f"Invalid alert severity '{v}'.")
            return s
        return "medium"

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_STATUSES:
                raise ValueError(f"Invalid alert status '{v}'.")
            return s
        return "active"

    @field_validator("metadata_json", mode="before")
    @classmethod
    def validate_metadata_json(cls, v: Any) -> str | None:
        if v is None:
            return None
        if isinstance(v, (dict, list)):
            return json.dumps(v)
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return None
            try:
                json.loads(s)
                return s
            except Exception as exc:
                raise ValueError(f"Invalid JSON in metadata_json: {exc}") from exc
        raise ValueError("metadata_json must be a valid JSON string, dict, or list.")


class AlertCreate(AlertBase):
    pass


class AlertRead(AlertBase):
    id: int
    acknowledged_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class AlertListResponse(BaseModel):
    items: list[AlertRead]
    total: int = Field(0, ge=0)
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=1000)
    unread_count: int = Field(0, ge=0)

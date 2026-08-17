"""Pydantic schemas for ERP notification management."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


VALID_NOTIFICATION_TYPES = {
    "information",
    "info",
    "success",
    "warning",
    "error",
    "production",
    "inventory",
    "quality",
    "maintenance",
    "sales",
    "hr",
    "finance",
    "system",
}
VALID_NOTIFICATION_PRIORITIES = {"low", "medium", "high", "urgent", "critical"}
VALID_NOTIFICATION_MODULES = {
    "system",
    "dashboard",
    "masters",
    "production",
    "inventory",
    "procurement",
    "hr",
    "attendance",
    "sales",
    "accounts",
    "finance",
    "quality",
    "maintenance",
    "analytics",
    "alerts",
    "documents",
    "meetings",
    "factorymonitor",
    "iot",
    "settings",
    "admin",
    "authentication",
}


class NotificationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)
    type: str = "information"
    priority: str = "medium"
    module: str = "system"
    action_url: str | None = None
    created_by: str | None = None
    user_id: int | None = Field(None, ge=1)

    @field_validator("type", mode="before")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v is not None:
            t = str(v).strip().lower()
            if t == "info":
                t = "information"
            if t not in VALID_NOTIFICATION_TYPES:
                raise ValueError(
                    f"Invalid notification type '{v}'. Must be one of {', '.join(sorted(VALID_NOTIFICATION_TYPES))}."
                )
            return t
        return "information"

    @field_validator("priority", mode="before")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        if v is not None:
            p = str(v).strip().lower()
            if p not in VALID_NOTIFICATION_PRIORITIES:
                raise ValueError(
                    f"Invalid notification priority '{v}'. Must be one of {', '.join(sorted(VALID_NOTIFICATION_PRIORITIES))}."
                )
            return p
        return "medium"

    @field_validator("module", mode="before")
    @classmethod
    def validate_module(cls, v: str) -> str:
        if v is not None:
            m = str(v).strip().lower()
            if m not in VALID_NOTIFICATION_MODULES:
                raise ValueError(
                    f"Invalid notification module '{v}'. Must be one of {', '.join(sorted(VALID_NOTIFICATION_MODULES))}."
                )
            return m
        return "system"

    @field_validator("action_url", mode="before")
    @classmethod
    def validate_action_url(cls, v: str | None) -> str | None:
        if v is None:
            return None
        url = str(v).strip()
        if not url:
            return None
        lowered = url.lower()
        if any(lowered.startswith(proto) for proto in ("javascript:", "data:", "vbscript:", "file:", "ftp:")):
            raise ValueError("action_url contains an unsafe or unsupported protocol.")
        if url.startswith("/"):
            if " " in url or "\n" in url or "\t" in url:
                raise ValueError("action_url path cannot contain whitespace.")
            return url
        if lowered.startswith("http://") or lowered.startswith("https://"):
            if " " in url or "\n" in url or "\t" in url:
                raise ValueError("action_url cannot contain whitespace.")
            return url
        raise ValueError("action_url must be a relative path starting with '/' or an absolute HTTP/HTTPS URL.")


class NotificationRead(BaseModel):
    id: int
    title: str
    message: str
    type: str
    priority: str
    module: str
    action_url: str | None = None
    is_read: bool = False
    read: bool = False  # alias for frontend compatibility
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def sync_read_state_before(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "is_read" in data and "read" not in data:
                data["read"] = bool(data["is_read"])
            elif "read" in data and "is_read" not in data:
                data["is_read"] = bool(data["read"])
            elif "is_read" in data and "read" in data:
                data["read"] = bool(data["is_read"])
        return data

    @model_validator(mode="after")
    def sync_read_state_after(self) -> "NotificationRead":
        if self.read != self.is_read:
            object.__setattr__(self, "read", self.is_read)
        return self


class NotificationListData(BaseModel):
    items: list[NotificationRead]
    total: int = Field(0, ge=0)
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=1000)
    has_more: bool
    unread_count: int = Field(0, ge=0)


class UnreadCountData(BaseModel):
    unread_count: int = Field(0, ge=0)

"""Pydantic schemas for Operator /api endpoints."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class WorkOrderIdentifierBase(BaseModel):
    work_order_id: int | None = Field(None, ge=1)
    work_order_number: str | None = None

    @model_validator(mode="after")
    def validate_identifier(self) -> "WorkOrderIdentifierBase":
        wo_num = self.work_order_number.strip() if self.work_order_number else None
        if self.work_order_id is None and not wo_num:
            raise ValueError("At least one work-order identifier (work_order_id or work_order_number) must be provided.")
        if wo_num:
            self.work_order_number = wo_num
        return self


VALID_SHOP_FLOOR_STATUSES = {
    "draft",
    "created",
    "planned",
    "pending",
    "in_progress",
    "in_process",
    "running",
    "paused",
    "completed",
    "closed",
    "done",
    "breakdown",
    "maintenance",
    "hold",
    "on_hold",
    "quarantine",
    "cancelled",
    "rejected",
    "expired",
}


class WorkOrderActionRequest(WorkOrderIdentifierBase):
    pass


class ShopFloorUpdateRequest(WorkOrderIdentifierBase):
    produced_quantity: float = Field(0.0, ge=0.0)
    scrap_quantity: float | None = Field(None, ge=0.0)
    status: str | None = None
    notes: str | None = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is not None:
            s = str(v).strip().lower().replace("-", "_")
            if s not in VALID_SHOP_FLOOR_STATUSES:
                raise ValueError(
                    f"Invalid status '{v}'. Must be one of {', '.join(sorted(VALID_SHOP_FLOOR_STATUSES))}."
                )
            return s
        return v

    @model_validator(mode="after")
    def validate_quantities_consistency(self) -> "ShopFloorUpdateRequest":
        if self.scrap_quantity is not None and self.scrap_quantity > self.produced_quantity:
            raise ValueError(
                f"scrap_quantity ({self.scrap_quantity}) cannot exceed produced_quantity ({self.produced_quantity})."
            )
        return self


class WorkOrderProgressRequest(ShopFloorUpdateRequest):
    pass


class BatchUpdateRequest(BaseModel):
    batch_id: int = Field(..., ge=1)
    quantity: float | None = Field(None, ge=0.0)
    status: str | None = None
    notes: str | None = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is not None:
            s = str(v).strip().lower().replace("-", "_")
            if s not in VALID_SHOP_FLOOR_STATUSES:
                raise ValueError(
                    f"Invalid status '{v}'. Must be one of {', '.join(sorted(VALID_SHOP_FLOOR_STATUSES))}."
                )
            return s
        return v


class MachineBreakdownRequest(BaseModel):
    machine_id: int | None = Field(None, ge=1)
    machine_code: str | None = None
    description: str = Field(..., min_length=3)

    @field_validator("description", mode="before")
    @classmethod
    def validate_description(cls, v: str) -> str:
        if v is not None:
            s = str(v).strip()
            if len(s) < 3:
                raise ValueError("description must be at least 3 characters.")
            return s
        return v

    @model_validator(mode="after")
    def validate_machine_identifier(self) -> "MachineBreakdownRequest":
        code = self.machine_code.strip() if self.machine_code else None
        if self.machine_id is None and not code:
            raise ValueError("At least one machine identifier (machine_id or machine_code) must be provided.")
        if code:
            self.machine_code = code
        return self


class NotificationReadRequest(BaseModel):
    notification_ids: list[str | int] | None = None

    @field_validator("notification_ids", mode="before")
    @classmethod
    def validate_notification_ids(cls, v: list | None) -> list[str] | None:
        if v is None:
            return None
        if not isinstance(v, list):
            raise ValueError("notification_ids must be a list.")

        cleaned_ids = []
        for item in v:
            if item is None:
                raise ValueError("Notification ID cannot be null.")
            s = str(item).strip()
            if not s:
                raise ValueError("Notification ID cannot be empty or whitespace.")
            if not s.isdigit() or int(s) < 1:
                raise ValueError(f"Invalid notification ID '{s}'. Notification IDs must be positive integers.")
            cleaned_ids.append(s)
        return cleaned_ids


class OperatorLoginRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=1)
    role: str = Field(..., min_length=1, max_length=100)

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, v: Any) -> str:
        if v is None:
            raise ValueError("Email is required.")
        email = str(v).strip().lower()
        if not email:
            raise ValueError("Email cannot be empty or whitespace.")
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise ValueError("Invalid email address format.")
        local, _, domain = email.partition("@")
        if not local or not domain or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("Invalid email address format.")
        return email


class OperatorProfileRead(BaseModel):
    id: int
    email: str
    full_name: str
    tenant_id: int
    roles: list[str]
    assigned_machine_id: int | None = None
    plant_code: str | None = None


class AttendanceRecordRead(BaseModel):
    id: int
    employee_id: int
    record_date: date
    clock_in: datetime | None = None
    clock_out: datetime | None = None
    status: str | None = None

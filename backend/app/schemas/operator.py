"""Pydantic schemas for Operator /api endpoints."""

from datetime import date, datetime

from pydantic import BaseModel, Field


class WorkOrderActionRequest(BaseModel):
    work_order_id: int | None = None
    work_order_number: str | None = None


class WorkOrderProgressRequest(BaseModel):
    work_order_id: int | None = None
    work_order_number: str | None = None
    produced_quantity: float = Field(gt=0)
    scrap_quantity: float | None = None
    notes: str | None = None


class BatchUpdateRequest(BaseModel):
    batch_id: int
    quantity: float | None = None
    status: str | None = None
    notes: str | None = None


class MachineBreakdownRequest(BaseModel):
    machine_id: int | None = None
    machine_code: str | None = None
    description: str = Field(min_length=3)


class NotificationReadRequest(BaseModel):
    notification_ids: list[str] | None = None


class OperatorLoginRequest(BaseModel):
    email: str
    password: str
    role: str = Field(..., min_length=1, max_length=100)


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

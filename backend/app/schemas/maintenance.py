from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


VALID_MAINTENANCE_RECORD_STATUSES = {
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
    "open",
    "resolved",
    "closed",
    "pending",
    "overdue",
    "verified",
}

VALID_PREVENTIVE_STATUSES = {
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
    "overdue",
    "open",
    "pending",
    "resolved",
    "closed",
}

VALID_BREAKDOWN_STATUSES = {"reported", "assigned", "in_progress", "resolved", "closed", "cancelled"}


class MaintenanceRecordBase(BaseModel):
    tenant_id: int = Field(..., ge=1)
    machine_id: int = Field(..., ge=1)
    maintenance_date: date
    maintenance_type: str = Field(..., min_length=1)
    description: str | None = None
    performed_by: str | None = None
    cost: float | None = Field(None, ge=0.0)
    status: str = "completed"

    @field_validator("maintenance_type", mode="before")
    @classmethod
    def validate_maintenance_type(cls, v: str) -> str:
        if v is not None:
            s = str(v).strip()
            if not s:
                raise ValueError("maintenance_type cannot be empty or whitespace only.")
            return s
        raise ValueError("maintenance_type is required.")

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_MAINTENANCE_RECORD_STATUSES:
                raise ValueError(
                    f"Invalid maintenance record status '{v}'. Must be one of {', '.join(sorted(VALID_MAINTENANCE_RECORD_STATUSES))}."
                )
            return s
        return "completed"

    @model_validator(mode="after")
    def validate_maintenance_record_date(self) -> "MaintenanceRecordBase":
        if self.status in ("completed", "resolved", "closed", "verified") and self.maintenance_date:
            if self.maintenance_date > date.today():
                raise ValueError("Completed maintenance record cannot have a future maintenance_date.")
        return self


class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass


class MaintenanceRecordRead(MaintenanceRecordBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


VALID_PREVENTIVE_FREQUENCIES = {
    "daily",
    "weekly",
    "bi-weekly",
    "fortnightly",
    "monthly",
    "quarterly",
    "semi-annually",
    "half-yearly",
    "yearly",
    "annually",
}


class PreventiveMaintenanceBase(BaseModel):
    tenant_id: int = Field(..., ge=1)
    machine_id: int = Field(..., ge=1)
    schedule_date: date
    next_due_date: date | None = None
    task_description: str = Field(..., min_length=1)
    frequency: str = "monthly"
    status: str = "scheduled"
    completed_at: datetime | None = None

    @field_validator("task_description", mode="before")
    @classmethod
    def validate_task_description(cls, v: str) -> str:
        if v is not None:
            s = str(v).strip()
            if not s:
                raise ValueError("task_description cannot be empty or whitespace only.")
            return s
        raise ValueError("task_description is required.")

    @field_validator("frequency", mode="before")
    @classmethod
    def validate_frequency(cls, v: str) -> str:
        if v is not None:
            f = str(v).strip().lower()
            if f not in VALID_PREVENTIVE_FREQUENCIES:
                raise ValueError(
                    f"Invalid preventive maintenance frequency '{v}'. Must be one of {', '.join(sorted(VALID_PREVENTIVE_FREQUENCIES))}."
                )
            return f
        return "monthly"

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_PREVENTIVE_STATUSES:
                raise ValueError(
                    f"Invalid preventive maintenance status '{v}'. Must be one of {', '.join(sorted(VALID_PREVENTIVE_STATUSES))}."
                )
            return s
        return "scheduled"

    @model_validator(mode="after")
    def validate_preventive_dates_and_status(self) -> "PreventiveMaintenanceBase":
        if self.schedule_date and self.next_due_date:
            if self.next_due_date < self.schedule_date:
                raise ValueError("next_due_date cannot be earlier than schedule_date.")
        if self.completed_at is not None and self.status == "scheduled":
            raise ValueError("completed_at cannot be populated when status is 'scheduled'.")
        if self.completed_at is not None and self.status not in ("completed", "resolved", "closed", "verified"):
            raise ValueError(f"completed_at cannot be populated when status is '{self.status}'.")
        return self


class PreventiveMaintenanceCreate(PreventiveMaintenanceBase):
    pass


class PreventiveMaintenanceRead(PreventiveMaintenanceBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class BreakdownReportBase(BaseModel):
    tenant_id: int = Field(..., ge=1)
    machine_id: int = Field(..., ge=1)
    reported_at: datetime
    description: str | None = None
    downtime_minutes: int | None = Field(None, ge=0)
    resolution: str | None = None
    status: str = "reported"

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_BREAKDOWN_STATUSES:
                raise ValueError(f"Invalid breakdown status '{v}'. Must be one of {', '.join(sorted(VALID_BREAKDOWN_STATUSES))}.")
            return s
        return "reported"


class BreakdownReportCreate(BreakdownReportBase):
    pass


class BreakdownReportRead(BreakdownReportBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class MaintenanceScheduleBase(BaseModel):
    tenant_id: int = Field(..., ge=1)
    machine_id: int = Field(..., ge=1)
    task_name: str = Field(..., min_length=1)
    next_due_date: date
    frequency_days: int = Field(30, ge=1)
    is_active: bool = True

    @field_validator("task_name", mode="before")
    @classmethod
    def validate_task_name(cls, v: str) -> str:
        if v is not None:
            s = str(v).strip()
            if not s:
                raise ValueError("task_name cannot be empty or whitespace only.")
            return s
        raise ValueError("task_name is required.")


class MaintenanceScheduleCreate(MaintenanceScheduleBase):
    pass


class MaintenanceScheduleRead(MaintenanceScheduleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

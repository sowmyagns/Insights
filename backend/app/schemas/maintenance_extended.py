from datetime import date
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

VALID_MAINTENANCE_STATUSES = {
    "scheduled",
    "reported",
    "open",
    "assigned",
    "in_progress",
    "completed",
    "resolved",
    "closed",
    "verified",
    "cancelled",
    "overdue",
}


class PreventiveSummaryRead(BaseModel):
    total_machines: int = Field(0, ge=0)
    scheduled_today: int = Field(0, ge=0)
    overdue_tasks: int = Field(0, ge=0)
    completed_this_month: int = Field(0, ge=0)
    upcoming_maintenance: int = Field(0, ge=0)
    machine_availability_pct: float = Field(0.0, ge=0.0, le=100.0)

    @field_validator("machine_availability_pct", mode="before")
    @classmethod
    def validate_availability_pct(cls, v: Any) -> float:
        if v is not None and v != "":
            val = float(v)
            if val < 0 or val > 100:
                raise ValueError("machine_availability_pct must be between 0 and 100.")
            return val
        return 0.0


class PreventiveTaskRead(BaseModel):
    id: int
    machine_id: str | None = None
    machine_name: str | None = None
    department: str | None = None
    maintenance_type: str | None = None
    scheduled_date: str | None = None
    assigned_engineer: str | None = None
    estimated_duration: str | None = None
    status: str = "scheduled"
    next_due_date: str | None = None
    is_overdue: bool = False
    task_description: str | None = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_MAINTENANCE_STATUSES:
                raise ValueError(f"Invalid maintenance status '{v}'. Must be one of {', '.join(sorted(VALID_MAINTENANCE_STATUSES))}.")
            return s
        return "scheduled"

    @model_validator(mode="after")
    def validate_preventive_dates(self) -> "PreventiveTaskRead":
        if self.scheduled_date and self.next_due_date:
            try:
                sched = date.fromisoformat(str(self.scheduled_date).split("T")[0])
                due = date.fromisoformat(str(self.next_due_date).split("T")[0])
                if due < sched:
                    raise ValueError("next_due_date cannot be earlier than scheduled_date.")
            except (ValueError, TypeError) as exc:
                if "cannot be earlier than" in str(exc):
                    raise
        return self


class BreakdownSummaryRead(BaseModel):
    active_breakdowns: int = Field(0, ge=0)
    total_downtime_hours: float = Field(0.0, ge=0.0)
    avg_repair_time_mttr: float = Field(0.0, ge=0.0)
    machine_availability_pct: float = Field(0.0, ge=0.0, le=100.0)
    pending_repairs: int = Field(0, ge=0)
    emergency_breakdowns: int = Field(0, ge=0)

    @field_validator("machine_availability_pct", mode="before")
    @classmethod
    def validate_availability_pct(cls, v: Any) -> float:
        if v is not None and v != "":
            val = float(v)
            if val < 0 or val > 100:
                raise ValueError("machine_availability_pct must be between 0 and 100.")
            return val
        return 0.0


VALID_PRIORITIES = {"low", "medium", "high", "critical", "urgent"}
VALID_SEVERITIES = {"low", "medium", "high", "critical", "urgent"}


class BreakdownEnrichedRead(BaseModel):
    id: int
    breakdown_number: str
    machine_name: str | None = None
    department: str | None = None
    reported_by: str | None = None
    reported_time: str | None = None
    cause: str | None = None
    severity: str = "medium"
    priority: str = "medium"
    engineer: str | None = None
    estimated_completion: str | None = None
    status: str = "reported"
    downtime_minutes: int | None = Field(None, ge=0)

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_MAINTENANCE_STATUSES:
                raise ValueError(f"Invalid maintenance status '{v}'. Must be one of {', '.join(sorted(VALID_MAINTENANCE_STATUSES))}.")
            return s
        return "reported"

    @field_validator("priority", "severity", mode="before")
    @classmethod
    def validate_priority_and_severity(cls, v: Any, info: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            allowed = VALID_PRIORITIES if info.field_name == "priority" else VALID_SEVERITIES
            if s not in allowed:
                raise ValueError(f"Invalid {info.field_name} '{v}'. Must be one of {', '.join(sorted(allowed))}.")
            return s
        return "medium"


class MachineHistoryRead(BaseModel):
    id: int
    machine_name: str | None = None
    activity: str
    event_date: str | None = None
    engineer: str | None = None
    cost: float | None = Field(None, ge=0.0)
    spare_parts: str | None = None
    downtime_minutes: int | None = Field(None, ge=0)
    remarks: str | None = None
    status: str | None = None
    description: str | None = None


class SparePartRead(BaseModel):
    id: int
    part_number: str
    spare_name: str
    stock: int = Field(0, ge=0)
    minimum_stock: int = Field(0, ge=0)
    vendor: str | None = None
    cost: float = Field(0.0, ge=0.0)
    is_low_stock: bool = False

    @model_validator(mode="after")
    def compute_is_low_stock(self) -> "SparePartRead":
        self.is_low_stock = bool(self.stock <= self.minimum_stock)
        return self


class WorkOrderRead(BaseModel):
    id: int
    work_order_number: str
    machine_name: str | None = None
    priority: str = "medium"
    assigned_to: str | None = None
    estimated_time: str | None = None
    actual_time: str | None = None
    status: str = "reported"

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_MAINTENANCE_STATUSES:
                raise ValueError(f"Invalid maintenance status '{v}'. Must be one of {', '.join(sorted(VALID_MAINTENANCE_STATUSES))}.")
            return s
        return "reported"

    @field_validator("priority", mode="before")
    @classmethod
    def validate_priority(cls, v: Any) -> str:
        if v is not None:
            s = str(v).strip().lower()
            if s not in VALID_PRIORITIES:
                raise ValueError(f"Invalid priority '{v}'. Must be one of {', '.join(sorted(VALID_PRIORITIES))}.")
            return s
        return "medium"


class MaintenanceHubRead(BaseModel):
    total_machines: int = Field(0, ge=0)
    running: int = Field(0, ge=0)
    under_maintenance: int = Field(0, ge=0)
    breakdown: int = Field(0, ge=0)
    idle: int = Field(0, ge=0)
    machine_health_pct: float = Field(0.0, ge=0.0, le=100.0)
    mttr_hours: float = Field(0.0, ge=0.0)
    mtbf_hours: float = Field(0.0, ge=0.0)
    labour_cost: float = Field(0.0, ge=0.0)
    spare_cost: float = Field(0.0, ge=0.0)
    external_cost: float = Field(0.0, ge=0.0)
    total_cost: float = Field(0.0, ge=0.0)
    total_requests: int = Field(0, ge=0)
    open_requests: int = Field(0, ge=0)
    in_progress_requests: int = Field(0, ge=0)
    completed_requests: int = Field(0, ge=0)
    overdue_requests: int = Field(0, ge=0)
    calendar_events: list[dict] = Field(default_factory=list)
    machine_health: list[dict] = Field(default_factory=list)
    downtime_trend: list[dict] = Field(default_factory=list)
    availability_trend: list[dict] = Field(default_factory=list)
    cost_trend: list[dict] = Field(default_factory=list)
    breakdown_frequency: list[dict] = Field(default_factory=list)
    mttr_trend: list[dict] = Field(default_factory=list)
    mtbf_trend: list[dict] = Field(default_factory=list)
    preventive_vs_breakdown: list[dict] = Field(default_factory=list)
    maintenance_overview: list[dict] = Field(default_factory=list)
    equipment_status: list[dict] = Field(default_factory=list)
    spare_parts: list[dict] = Field(default_factory=list)
    work_orders: list[dict] = Field(default_factory=list)
    recent_requests: list[dict] = Field(default_factory=list)
    alerts: list[dict] = Field(default_factory=list)

    @field_validator("machine_health_pct", mode="before")
    @classmethod
    def validate_health_pct(cls, v: Any) -> float:
        if v is not None and v != "":
            val = float(v)
            if val < 0 or val > 100:
                raise ValueError("machine_health_pct must be between 0 and 100.")
            return val
        return 0.0

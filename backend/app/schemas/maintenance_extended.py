from pydantic import BaseModel


class PreventiveSummaryRead(BaseModel):
    total_machines: int = 0
    scheduled_today: int = 0
    overdue_tasks: int = 0
    completed_this_month: int = 0
    upcoming_maintenance: int = 0
    machine_availability_pct: float = 0


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


class BreakdownSummaryRead(BaseModel):
    active_breakdowns: int = 0
    total_downtime_hours: float = 0
    avg_repair_time_mttr: float = 0
    machine_availability_pct: float = 0
    pending_repairs: int = 0
    emergency_breakdowns: int = 0


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
    downtime_minutes: int | None = None


class MachineHistoryRead(BaseModel):
    id: int
    machine_name: str | None = None
    activity: str
    event_date: str | None = None
    engineer: str | None = None
    cost: float | None = None
    spare_parts: str | None = None
    downtime_minutes: int | None = None
    remarks: str | None = None
    status: str | None = None
    description: str | None = None


class SparePartRead(BaseModel):
    id: int
    part_number: str
    spare_name: str
    stock: int = 0
    minimum_stock: int = 0
    vendor: str | None = None
    cost: float = 0
    is_low_stock: bool = False


class WorkOrderRead(BaseModel):
    id: int
    work_order_number: str
    machine_name: str | None = None
    priority: str = "medium"
    assigned_to: str | None = None
    estimated_time: str | None = None
    actual_time: str | None = None
    status: str = "reported"


class MaintenanceHubRead(BaseModel):
    total_machines: int = 0
    running: int = 0
    under_maintenance: int = 0
    breakdown: int = 0
    idle: int = 0
    machine_health_pct: float = 0
    mttr_hours: float = 0
    mtbf_hours: float = 0
    labour_cost: float = 0
    spare_cost: float = 0
    external_cost: float = 0
    total_cost: float = 0
    total_requests: int = 0
    open_requests: int = 0
    in_progress_requests: int = 0
    completed_requests: int = 0
    overdue_requests: int = 0
    calendar_events: list[dict] = []
    machine_health: list[dict] = []
    downtime_trend: list[dict] = []
    availability_trend: list[dict] = []
    cost_trend: list[dict] = []
    breakdown_frequency: list[dict] = []
    mttr_trend: list[dict] = []
    mtbf_trend: list[dict] = []
    preventive_vs_breakdown: list[dict] = []
    maintenance_overview: list[dict] = []
    equipment_status: list[dict] = []
    spare_parts: list[dict] = []
    work_orders: list[dict] = []
    recent_requests: list[dict] = []
    alerts: list[dict] = []

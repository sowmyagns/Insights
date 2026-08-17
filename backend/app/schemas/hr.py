from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ShiftBase(BaseModel):
    tenant_id: int
    name: str
    start_time: str | None = None
    end_time: str | None = None
    description: str | None = None


class ShiftCreate(ShiftBase):
    pass


class ShiftRead(ShiftBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AttendanceRecordBase(BaseModel):
    tenant_id: int
    employee_id: int
    record_date: date
    clock_in: datetime | None = None
    clock_out: datetime | None = None
    status: str | None = None
    work_hours: float | None = None
    overtime_hours: float | None = None
    break_minutes: float = 0.0
    capacity_hours: float = 8.0


class AttendanceRecordCreate(AttendanceRecordBase):
    pass


class AttendanceRecordRead(AttendanceRecordBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PayrollRecordBase(BaseModel):
    tenant_id: int
    employee_id: int
    period_start: date
    period_end: date
    base_salary: float = 0.0
    gross_pay: float = 0.0
    deductions: float = 0.0
    net_pay: float = 0.0
    status: str = "draft"


class PayrollRecordCreate(PayrollRecordBase):
    pass


class PayrollRecordRead(PayrollRecordBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PerformanceReviewBase(BaseModel):
    tenant_id: int
    employee_id: int
    review_period: date
    reviewer: str | None = None
    rating: str | None = None
    feedback: str | None = None
    goals: str | None = None


class PerformanceReviewCreate(PerformanceReviewBase):
    pass


class PerformanceReviewRead(PerformanceReviewBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class LeaveRequestBase(BaseModel):
    tenant_id: int
    employee_id: int
    start_date: date
    end_date: date
    leave_type: str = "annual"
    reason: str | None = None
    status: str = "pending"
    days: float | None = None


class LeaveRequestCreate(LeaveRequestBase):
    pass


class LeaveRequestUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    leave_type: str | None = None
    reason: str | None = None
    status: str | None = None
    days: float | None = None


class LeaveRequestRead(LeaveRequestBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class EmployeeBase(BaseModel):
    tenant_id: int
    employee_code: str
    full_name: str
    email: str | None = None
    phone: str | None = None
    department: str | None = None
    address: str | None = None
    designation: str | None = None
    shift_name: str | None = None
    reporting_manager: str | None = None
    hire_date: date | None = None
    hourly_rate: float | None = None
    is_active: bool = True


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeRead(EmployeeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class HrAssetBase(BaseModel):
    asset_code: str
    name: str
    category: str | None = None
    status: str = "Active"
    assigned_to: str | None = None
    location: str | None = None
    purchase_date: date | None = None
    purchase_cost: float = 0.0


class HrAssetCreate(HrAssetBase):
    pass


class HrAssetUpdate(BaseModel):
    asset_code: str | None = None
    name: str | None = None
    category: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    location: str | None = None
    purchase_date: date | None = None
    purchase_cost: float | None = None


class HrAssetRead(HrAssetBase):
    id: int
    tenant_id: int
    model_config = ConfigDict(from_attributes=True)


class SafetyIncidentBase(BaseModel):
    incident_code: str
    title: str
    type: str | None = None
    reporter: str | None = None
    incident_date: date | None = None
    severity: str = "Low"
    status: str = "Open"
    description: str | None = None


class SafetyIncidentCreate(SafetyIncidentBase):
    pass


class SafetyIncidentUpdate(BaseModel):
    incident_code: str | None = None
    title: str | None = None
    type: str | None = None
    reporter: str | None = None
    incident_date: date | None = None
    severity: str | None = None
    status: str | None = None
    description: str | None = None


class SafetyIncidentRead(SafetyIncidentBase):
    id: int
    tenant_id: int
    model_config = ConfigDict(from_attributes=True)

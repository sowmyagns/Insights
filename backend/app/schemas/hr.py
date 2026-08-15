from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict


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


class ShiftBase(BaseModel):
    tenant_id: int
    name: str
    start_time: time
    end_time: time
    break_minutes: int = 0
    capacity_hours: float = 8.0


class ShiftCreate(ShiftBase):
    pass


class ShiftRead(ShiftBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AttendanceRecordBase(BaseModel):
    tenant_id: int
    employee_id: int
    shift_id: int | None = None
    record_date: date
    clock_in: datetime | None = None
    clock_out: datetime | None = None
    break_minutes: int = 0
    work_hours: float | None = None
    overtime_hours: float | None = None
    capacity_hours: float | None = None


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
    regular_hours: float = 0
    overtime_hours: float = 0
    regular_pay: float = 0
    overtime_pay: float = 0
    gross_pay: float = 0
    pf: float | None = 0
    esi: float | None = 0
    tax: float | None = 0
    basic: float | None = 0
    allowance: float | None = 0
    bonus: float | None = 0
    deductions: float = 0
    net_pay: float = 0
    status: str = "draft"


class PayrollRecordCreate(PayrollRecordBase):
    pass


class PayrollRecordRead(PayrollRecordBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PerformanceReviewBase(BaseModel):
    tenant_id: int
    employee_id: int
    review_period: str
    rating: int | None = None
    productivity_score: int | None = None
    goals_achieved: int | None = None
    goals_total: int | None = None
    notes: str | None = None


class PerformanceReviewCreate(PerformanceReviewBase):
    pass


class PerformanceReviewRead(PerformanceReviewBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class LeaveRequestBase(BaseModel):
    tenant_id: int
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    days: float = 1.0
    reason: str | None = None
    status: str = "pending"


class LeaveRequestCreate(LeaveRequestBase):
    pass


class LeaveRequestCreateIn(BaseModel):
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    reason: str | None = None
    status: str = "pending"


class LeaveRequestUpdate(BaseModel):
    status: str | None = None
    reason: str | None = None


class LeaveRequestRead(LeaveRequestBase):
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


# ── Recruitment ──────────────────────────────────────────────────────────────


class JobOpeningBase(BaseModel):
    title: str
    department: str | None = None
    openings_count: int = 1
    status: str = "open"
    location: str | None = None
    description: str | None = None


class JobOpeningCreate(JobOpeningBase):
    pass


class JobOpeningUpdate(BaseModel):
    title: str | None = None
    department: str | None = None
    openings_count: int | None = None
    status: str | None = None
    location: str | None = None
    description: str | None = None


class JobOpeningRead(JobOpeningBase):
    id: int
    tenant_id: int
    applicants_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class RecruitmentApplicantBase(BaseModel):
    job_opening_id: int | None = None
    full_name: str
    email: str | None = None
    phone: str | None = None
    source: str | None = None
    stage: str = "applied"
    status: str = "new"
    applied_on: date | None = None
    notes: str | None = None


class RecruitmentApplicantCreate(RecruitmentApplicantBase):
    pass


class RecruitmentApplicantUpdate(BaseModel):
    job_opening_id: int | None = None
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    source: str | None = None
    stage: str | None = None
    status: str | None = None
    applied_on: date | None = None
    notes: str | None = None


class RecruitmentApplicantRead(RecruitmentApplicantBase):
    id: int
    tenant_id: int
    job_title: str | None = None
    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int


# ── Training ─────────────────────────────────────────────────────────────────


class TrainingProgramBase(BaseModel):
    name: str
    category: str | None = None
    trainer: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str = "not_started"
    progress_pct: int = 0
    description: str | None = None


class TrainingProgramCreate(TrainingProgramBase):
    pass


class TrainingProgramUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    trainer: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None
    progress_pct: int | None = None
    description: str | None = None


class TrainingProgramRead(TrainingProgramBase):
    id: int
    tenant_id: int
    participants: int = 0
    model_config = ConfigDict(from_attributes=True)


class TrainingEnrollmentBase(BaseModel):
    program_id: int
    employee_id: int | None = None
    employee_name: str | None = None
    status: str = "enrolled"
    progress_pct: int = 0
    certified_at: date | None = None
    certification_name: str | None = None


class TrainingEnrollmentCreate(TrainingEnrollmentBase):
    pass


class TrainingEnrollmentUpdate(BaseModel):
    employee_id: int | None = None
    employee_name: str | None = None
    status: str | None = None
    progress_pct: int | None = None
    certified_at: date | None = None
    certification_name: str | None = None


class TrainingEnrollmentRead(TrainingEnrollmentBase):
    id: int
    tenant_id: int
    program_name: str | None = None
    model_config = ConfigDict(from_attributes=True)

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Shift(Base, TimestampMixin):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    start_time: Mapped[str | None] = mapped_column(String(32))
    end_time: Mapped[str | None] = mapped_column(String(32))
    description: Mapped[str | None] = mapped_column(Text)


class AttendanceRecord(Base, TimestampMixin):
    __tablename__ = "attendance_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(nullable=False, index=True)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    clock_in: Mapped[datetime | None] = mapped_column(DateTime)
    clock_out: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str | None] = mapped_column(String(32))
    work_hours: Mapped[float | None] = mapped_column(Float)
    overtime_hours: Mapped[float | None] = mapped_column(Float)
    break_minutes: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    capacity_hours: Mapped[float] = mapped_column(Float, default=8.0, nullable=False)


class AttendanceCorrectionRequest(Base, TimestampMixin):
    __tablename__ = "attendance_correction_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(nullable=False, index=True)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    old_check_in: Mapped[str | None] = mapped_column(String(32))
    new_check_in: Mapped[str | None] = mapped_column(String(32))
    old_check_out: Mapped[str | None] = mapped_column(String(32))
    new_check_out: Mapped[str | None] = mapped_column(String(32))
    old_status: Mapped[str | None] = mapped_column(String(32))
    new_status: Mapped[str | None] = mapped_column(String(32))
    old_hours: Mapped[str | None] = mapped_column(String(32))
    new_hours: Mapped[str | None] = mapped_column(String(32))
    reason: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(255))
    approval_status: Mapped[str] = mapped_column(String(32), default="Pending", nullable=False, index=True)
    approved_by: Mapped[str | None] = mapped_column(String(255))


class HROvertimeRequest(Base, TimestampMixin):
    __tablename__ = "hr_overtime_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(nullable=False, index=True)
    request_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    hours: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False, index=True)
    created_by: Mapped[str | None] = mapped_column(String(255))
    approved_by: Mapped[str | None] = mapped_column(String(255))


class PayrollRecord(Base, TimestampMixin):
    __tablename__ = "payroll_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(nullable=False, index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    base_salary: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gross_pay: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    deductions: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_pay: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)


class PerformanceReview(Base, TimestampMixin):
    __tablename__ = "performance_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(nullable=False, index=True)
    review_period: Mapped[date] = mapped_column(Date, nullable=False)
    reviewer: Mapped[str | None] = mapped_column(String(255))
    rating: Mapped[str | None] = mapped_column(String(32))
    feedback: Mapped[str | None] = mapped_column(Text)
    goals: Mapped[str | None] = mapped_column(Text)


class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    leave_type: Mapped[str] = mapped_column(String(64), default="annual", nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    days: Mapped[float | None] = mapped_column(Float)


class Employee(Base, TimestampMixin):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    employee_code: Mapped[str] = mapped_column(String(64), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    department: Mapped[str | None] = mapped_column(String(128))
    address: Mapped[str | None] = mapped_column(Text)
    hire_date: Mapped[date | None] = mapped_column(Date)
    hourly_rate: Mapped[float | None] = mapped_column(Numeric(10, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    designation: Mapped[str | None] = mapped_column(String(128))
    shift_name: Mapped[str | None] = mapped_column(String(64))
    reporting_manager: Mapped[str | None] = mapped_column(String(255))
    employment_type: Mapped[str | None] = mapped_column(String(32))
    phone: Mapped[str | None] = mapped_column(String(64))
    salary: Mapped[float | None] = mapped_column(Numeric(12, 2))


class HrAsset(Base, TimestampMixin):
    """Company assets assigned to employees (IT / facilities)."""
    __tablename__ = "hr_assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    asset_code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(64), default="Active", nullable=False)
    assigned_to: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    purchase_date: Mapped[date | None] = mapped_column(Date)
    purchase_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)


class ShiftAssignment(Base, TimestampMixin):
    """Employee shift assignments with date range."""
    __tablename__ = "shift_assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(nullable=False, index=True)
    shift_id: Mapped[int] = mapped_column(nullable=False)
    shift_name: Mapped[str | None] = mapped_column(String(128))
    branch: Mapped[str | None] = mapped_column(String(128))
    department: Mapped[str | None] = mapped_column(String(128))
    shift_from: Mapped[date | None] = mapped_column(Date)
    shift_to: Mapped[date | None] = mapped_column(Date)
    created_by: Mapped[str | None] = mapped_column(String(255))


class WeeklyOff(Base, TimestampMixin):
    """Weekly off schedule configuration."""
    __tablename__ = "weekly_offs"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    config: Mapped[str | None] = mapped_column(Text)  # JSON: {day: ["all","1st"...]}
    created_by: Mapped[str | None] = mapped_column(String(255))


class WeeklyOffAssignment(Base, TimestampMixin):
    """Weekly off schedule assigned to an employee."""
    __tablename__ = "weekly_off_assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(nullable=False, index=True)
    weekly_off_id: Mapped[int] = mapped_column(ForeignKey("weekly_offs.id"), nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    branch: Mapped[str | None] = mapped_column(String(128))
    department: Mapped[str | None] = mapped_column(String(128))
    work_week: Mapped[str | None] = mapped_column(String(128))
    week_off: Mapped[str] = mapped_column(String(128), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(255))


class PreboardingCandidate(Base, TimestampMixin):
    """Candidates in the preboarding pipeline before official joining."""
    __tablename__ = "preboarding_candidates"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(64))
    designation: Mapped[str | None] = mapped_column(String(128))
    department: Mapped[str | None] = mapped_column(String(128))
    expected_joining: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(64), default="Offer Sent", nullable=False)
    next_task: Mapped[str | None] = mapped_column(String(128))
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class LeavePlan(Base, TimestampMixin):
    """Leave plan configuration (e.g. Annual Plan 2025)."""
    __tablename__ = "leave_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    effective_from: Mapped[date | None] = mapped_column(Date)
    effective_to: Mapped[date | None] = mapped_column(Date)
    leave_types: Mapped[str | None] = mapped_column(Text)  # JSON list
    description: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(255))


class LeaveBalance(Base, TimestampMixin):
    """Per-employee leave balance per leave type per year."""
    __tablename__ = "leave_balances"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(nullable=False, index=True)
    leave_type: Mapped[str] = mapped_column(String(64), nullable=False)
    year: Mapped[int] = mapped_column(nullable=False)
    total_days: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    used_days: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    adjusted_days: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    adjusted_by: Mapped[str | None] = mapped_column(String(255))
    adjusted_reason: Mapped[str | None] = mapped_column(Text)


class SafetyIncident(Base, TimestampMixin):
    """Workplace safety / incident reports."""
    __tablename__ = "safety_incidents"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    incident_code: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str | None] = mapped_column(String(128))
    reporter: Mapped[str | None] = mapped_column(String(255))
    incident_date: Mapped[date | None] = mapped_column(Date)
    severity: Mapped[str] = mapped_column(String(32), default="Low", nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="Open", nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

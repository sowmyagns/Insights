from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


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

    attendance = relationship("AttendanceRecord", back_populates="employee")
    payroll_records = relationship("PayrollRecord", back_populates="employee")
    performance_reviews = relationship("PerformanceReview", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")


class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    leave_type: Mapped[str] = mapped_column(String(32), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days: Mapped[float] = mapped_column(Numeric(5, 1), default=1.0, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)

    employee = relationship("Employee", back_populates="leave_requests")


class Shift(Base, TimestampMixin):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    break_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    capacity_hours: Mapped[float] = mapped_column(Numeric(5, 2), default=8.0, nullable=False)

    attendance = relationship("AttendanceRecord", back_populates="shift")


class AttendanceRecord(Base, TimestampMixin):
    __tablename__ = "attendance_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    shift_id: Mapped[int | None] = mapped_column(ForeignKey("shifts.id"))
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    clock_in: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    clock_out: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    break_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    work_hours: Mapped[float | None] = mapped_column(Numeric(5, 2))
    overtime_hours: Mapped[float | None] = mapped_column(Numeric(5, 2))
    capacity_hours: Mapped[float | None] = mapped_column(Numeric(5, 2))
    status: Mapped[str] = mapped_column(String(32), default="present", nullable=False)
    source: Mapped[str | None] = mapped_column(String(32))

    employee = relationship("Employee", back_populates="attendance")
    shift = relationship("Shift", back_populates="attendance")


class PayrollRecord(Base, TimestampMixin):
    __tablename__ = "payroll_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    regular_hours: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    overtime_hours: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    regular_pay: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    overtime_pay: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    gross_pay: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    deductions: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    net_pay: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    basic: Mapped[float | None] = mapped_column(Numeric(12, 2))
    allowance: Mapped[float | None] = mapped_column(Numeric(12, 2))
    bonus: Mapped[float | None] = mapped_column(Numeric(12, 2))
    pf: Mapped[float | None] = mapped_column(Numeric(12, 2))
    esi: Mapped[float | None] = mapped_column(Numeric(12, 2))
    tax: Mapped[float | None] = mapped_column(Numeric(12, 2))

    employee = relationship("Employee", back_populates="payroll_records")


class PerformanceReview(Base, TimestampMixin):
    __tablename__ = "performance_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    review_period: Mapped[str] = mapped_column(String(64), nullable=False)
    rating: Mapped[int | None] = mapped_column(Integer)
    productivity_score: Mapped[int | None] = mapped_column(Integer)
    goals_achieved: Mapped[int | None] = mapped_column(Integer)
    goals_total: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(String(1024))

    employee = relationship("Employee", back_populates="performance_reviews")


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


class JobOpening(Base, TimestampMixin):
    """Open job positions for recruitment."""
    __tablename__ = "job_openings"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str | None] = mapped_column(String(128))
    openings_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="open", nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)

    applicants = relationship(
        "RecruitmentApplicant",
        back_populates="job_opening",
        cascade="all, delete-orphan",
    )


class RecruitmentApplicant(Base, TimestampMixin):
    """Job applicants / candidates."""
    __tablename__ = "recruitment_applicants"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    job_opening_id: Mapped[int | None] = mapped_column(
        ForeignKey("job_openings.id", ondelete="CASCADE")
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(64))
    source: Mapped[str | None] = mapped_column(String(64))
    stage: Mapped[str] = mapped_column(String(32), default="applied", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="new", nullable=False)
    applied_on: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)

    job_opening = relationship("JobOpening", back_populates="applicants")


class TrainingProgram(Base, TimestampMixin):
    """Employee training program."""
    __tablename__ = "training_programs"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(128))
    trainer: Mapped[str | None] = mapped_column(String(255))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(32), default="not_started", nullable=False)
    progress_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    enrollments = relationship(
        "TrainingEnrollment",
        back_populates="program",
        cascade="all, delete-orphan",
    )


class TrainingEnrollment(Base, TimestampMixin):
    """Employee enrollment in a training program."""
    __tablename__ = "training_enrollments"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    program_id: Mapped[int] = mapped_column(
        ForeignKey("training_programs.id", ondelete="CASCADE"), nullable=False
    )
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))
    employee_name: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="enrolled", nullable=False)
    progress_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    certified_at: Mapped[date | None] = mapped_column(Date)
    certification_name: Mapped[str | None] = mapped_column(String(255))

    program = relationship("TrainingProgram", back_populates="enrollments")
    employee = relationship("Employee")

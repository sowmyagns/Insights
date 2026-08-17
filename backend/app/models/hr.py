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

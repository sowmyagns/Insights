"""
Payroll Calculation Service
Automatically calculates payroll for each employee based on:
  - Attendance records (present / half-day / overtime)
  - Approved leave requests (paid vs unpaid/LOP)
  - Employee salary
  - Statutory deductions (PF + PT)
"""
import calendar
import logging
import json
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.hr import AttendanceRecord, Employee, LeaveRequest, PayrollRecord
from app.models.salary_breakup import SalaryBreakup

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PAID_LEAVE_TYPES = {"casual", "sick", "annual", "compensatory", "earned", "maternity", "paternity"}


def get_working_days(year: int, month: int) -> int:
    """Count Mon–Sat working days in the given month (exclude Sundays only)."""
    _, days_in_month = calendar.monthrange(year, month)
    count = 0
    for day in range(1, days_in_month + 1):
        weekday = date(year, month, day).weekday()  # 0=Mon … 6=Sun
        if weekday != 6:  # Not Sunday
            count += 1
    return count


# ---------------------------------------------------------------------------
# Attendance summary
# ---------------------------------------------------------------------------

def get_attendance_summary(
    db: Session, tenant_id: int, employee_id: int,
    period_start: date, period_end: date
) -> dict:
    """
    Returns dict:
      present_days  - full working days (status='present' or inferred)
      half_days     - count of half-day records
      ot_hours      - total overtime hours logged
    """
    stmt = select(AttendanceRecord).where(
        AttendanceRecord.tenant_id == tenant_id,
        AttendanceRecord.employee_id == employee_id,
        AttendanceRecord.record_date >= period_start,
        AttendanceRecord.record_date <= period_end,
    )
    records = list(db.scalars(stmt).all())

    present = 0
    half = 0
    ot_hours = 0.0

    for r in records:
        status = (r.status or "").lower()
        cap = float(r.capacity_hours or 8.0)
        work = float(r.work_hours or 0.0)

        # Determine status from work_hours if status is ambiguous
        if status == "present":
            present += 1
        elif status == "half-day" or status == "half_day":
            half += 1
        elif status not in ("absent", "leave", "holiday") and work >= cap / 2:
            # Infer from actual hours
            if work >= cap:
                present += 1
            else:
                half += 1

        ot_hours += float(r.overtime_hours or 0.0)

    return {"present_days": present, "half_days": half, "ot_hours": ot_hours}


# ---------------------------------------------------------------------------
# Leave summary
# ---------------------------------------------------------------------------

def get_leave_summary(
    db: Session, tenant_id: int, employee_id: int,
    period_start: date, period_end: date
) -> dict:
    """
    Returns dict:
      paid_days   - approved leave days that are paid
      unpaid_days - approved leave days that are unpaid (LOP)
    """
    stmt = select(LeaveRequest).where(
        LeaveRequest.tenant_id == tenant_id,
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date <= period_end,
        LeaveRequest.end_date >= period_start,
    )
    leaves = list(db.scalars(stmt).all())

    paid = 0.0
    unpaid = 0.0

    for lv in leaves:
        # Clamp leave range to the payroll period
        eff_start = max(lv.start_date, period_start)
        eff_end = min(lv.end_date, period_end)
        days = (eff_end - eff_start).days + 1
        if days <= 0:
            continue

        leave_type = (lv.leave_type or "").lower().replace(" ", "_")
        # Normalise: "casual leave" → "casual"
        for pt in PAID_LEAVE_TYPES:
            if pt in leave_type:
                paid += days
                break
        else:
            unpaid += days

    return {"paid_days": paid, "unpaid_days": unpaid}


# ---------------------------------------------------------------------------
# Statutory deductions
# ---------------------------------------------------------------------------

def compute_statutory(gross_pay: float) -> dict:
    """
    Returns dict:
      basic         - 40% of gross
      pf_deduction  - 12% of basic, max ₹1800
      pt_deduction  - ₹200 if gross >= 10000 else 0
    """
    basic = gross_pay * 0.40
    pf = min(basic * 0.12, 1800.0)
    pt = 200.0 if gross_pay >= 10000 else 0.0
    return {"basic": round(basic, 2), "pf_deduction": round(pf, 2), "pt_deduction": pt}


# ---------------------------------------------------------------------------
# Per-employee full calculation
# ---------------------------------------------------------------------------

def calculate_payroll_for_employee(
    db: Session, tenant_id: int, employee_id: int, year: int, month: int
) -> dict | None:
    """
    Full payroll calculation for one employee for the given month.
    Returns a dict with all breakdown fields, or None if employee not found.
    """
    emp = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_active == True,
        )
    )
    if not emp:
        return None

    breakup = db.scalar(
        select(SalaryBreakup)
        .where(SalaryBreakup.tenant_id == tenant_id, SalaryBreakup.employee_id == employee_id)
        .order_by(SalaryBreakup.effective_from.desc(), SalaryBreakup.id.desc())
    )
    breakup_data = {}
    if breakup and breakup.data:
        try:
            breakup_data = json.loads(breakup.data)
        except (TypeError, json.JSONDecodeError):
            breakup_data = {}

    salary = float(breakup_data.get("gross_monthly") or emp.salary or 0)
    if salary <= 0:
        logger.warning(f"Employee {employee_id} has zero salary – skipping payroll.")
        return None

    _, days_in_month = calendar.monthrange(year, month)
    period_start = date(year, month, 1)
    period_end = date(year, month, days_in_month)

    working_days = get_working_days(year, month)
    per_day = salary / working_days

    att = get_attendance_summary(db, tenant_id, employee_id, period_start, period_end)
    lv = get_leave_summary(db, tenant_id, employee_id, period_start, period_end)

    present_days = float(att["present_days"])
    half_days = float(att["half_days"])
    ot_hours = float(att["ot_hours"])
    paid_leave_days = float(lv["paid_days"])
    lop_days = float(lv["unpaid_days"])

    # Payable days
    payable_days = present_days + (half_days * 0.5) + paid_leave_days
    gross_pay = round(per_day * payable_days, 2)
    attendance_factor = payable_days / working_days if working_days else 0
    components = []
    for component in breakup_data.get("rows", []):
        if not isinstance(component, dict):
            continue
        monthly = float(component.get("monthly") or 0) * attendance_factor
        components.append({
            "name": component.get("name") or "Component",
            "category": component.get("category") or "earning",
            "monthly": round(monthly, 2),
        })

    # Overtime
    hourly_rate = salary / (working_days * 8)
    ot_pay = round(ot_hours * hourly_rate * 1.5, 2)

    # Statutory
    stat = compute_statutory(gross_pay)
    # Derive deductions from the current payroll calculation. Do not reuse a
    # previously stored total, which can belong to another attendance period.
    configured_deductions = sum(
        float(component.get("monthly") or 0)
        for component in components
        if component.get("category") == "deduction"
    )
    total_deductions = round(
        configured_deductions if configured_deductions > 0 else stat["pf_deduction"] + stat["pt_deduction"],
        2,
    )
    net_pay = round(gross_pay + ot_pay - total_deductions, 2)

    emp_name = emp.full_name or emp.name or f"Employee {employee_id}"

    return {
        "employee_id": employee_id,
        "employee_name": emp_name,
        "base_salary": round(salary, 2),
        "working_days": working_days,
        "present_days": present_days,
        "half_days": half_days,
        "paid_leave_days": paid_leave_days,
        "lop_days": lop_days,
        "payable_days": round(payable_days, 2),
        "gross_pay": gross_pay,
        "ot_hours": ot_hours,
        "ot_pay": ot_pay,
        "basic": stat["basic"],
        "pf_deduction": stat["pf_deduction"],
        "pt_deduction": stat["pt_deduction"],
        "total_deductions": total_deductions,
        "net_pay": net_pay,
        "components": components,
        "payroll_record_id": None,
    }


# ---------------------------------------------------------------------------
# Bulk payroll run
# ---------------------------------------------------------------------------

def run_payroll_bulk(
    db: Session, tenant_id: int, year: int, month: int
) -> list[dict]:
    """
    Run payroll calculation for ALL active employees in the tenant.
    Creates or updates a PayrollRecord for each employee.
    Returns list of breakdown dicts.
    """
    _, days_in_month = calendar.monthrange(year, month)
    period_start = date(year, month, 1)
    period_end = date(year, month, days_in_month)

    employees = list(
        db.scalars(
            select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.is_active == True,
            )
        ).all()
    )

    results = []
    for emp in employees:
        try:
            breakdown = calculate_payroll_for_employee(
                db, tenant_id, emp.id, year, month
            )
            if not breakdown:
                continue

            # Upsert PayrollRecord
            existing = db.scalar(
                select(PayrollRecord).where(
                    PayrollRecord.tenant_id == tenant_id,
                    PayrollRecord.employee_id == emp.id,
                    PayrollRecord.period_start == period_start,
                    PayrollRecord.period_end == period_end,
                )
            )
            if existing:
                existing.base_salary = round(float(breakdown.get("base_salary") or emp.salary or 0), 2)
                existing.gross_pay = breakdown["gross_pay"]
                existing.deductions = breakdown["total_deductions"]
                existing.net_pay = breakdown["net_pay"]
                existing.status = "calculated"
                db.commit()
                db.refresh(existing)
                breakdown["payroll_record_id"] = existing.id
            else:
                pr = PayrollRecord(
                    tenant_id=tenant_id,
                    employee_id=emp.id,
                    period_start=period_start,
                    period_end=period_end,
                    base_salary=round(float(breakdown.get("base_salary") or emp.salary or 0), 2),
                    gross_pay=breakdown["gross_pay"],
                    deductions=breakdown["total_deductions"],
                    net_pay=breakdown["net_pay"],
                    status="calculated",
                )
                db.add(pr)
                db.commit()
                db.refresh(pr)
                breakdown["payroll_record_id"] = pr.id

            results.append(breakdown)

        except Exception as e:
            logger.error(
                f"Payroll calculation failed for employee {emp.id}: {e}"
            )
            db.rollback()
            continue

    return results

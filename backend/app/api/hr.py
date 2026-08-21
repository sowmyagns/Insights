import csv
import io
import logging
import json
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.permissions import require_permission, tenant_scope
from app.models.user import User
from app.models.announcement import Announcement
from app.models.hr import Employee
from app.schemas.announcement import AnnouncementCreate, Announcement as AnnouncementRead, AnnouncementUpdate
from app.schemas.hr import (
    AttendanceRecordCreate,
    AttendanceRecordRead,
    AttendanceCorrectionCreate,
    AttendanceCorrectionStatus,
    EmployeeCreate,
    EmployeeRead,
    HrAssetCreate,
    HrAssetRead,
    HrAssetUpdate,
    LeaveRequestCreate,
    LeaveRequestRead,
    LeaveRequestUpdate,
    PayrollRecordCreate,
    PayrollRecordRead,
    PayrollRunRequest,
    PayrollRunResponse,
    PayrollBreakdownItem,
    PayslipRead,
    SafetyIncidentCreate,
    SafetyIncidentRead,
    SafetyIncidentUpdate,
    ShiftCreate,
    ShiftRead,
    OvertimeRequestCreate,
    OvertimeStatusUpdate,
)

from app.schemas.department import (
    DepartmentCreate,
    DepartmentDetailRead,
    DepartmentListRead,
    DepartmentSummaryRead,
    DepartmentUpdate,
)
from app.services.department_service import (
    _to_list_read,
    create_department,
    deactivate_department,
    get_department_detail,
    get_department_summary,
    list_departments_enriched,
    update_department,
)
try:
    from app.schemas.hr_extended import EmployeeListRead, EmployeeSummaryRead
except ModuleNotFoundError:
    # Keep older deployments bootable when the optional extended HR schema file
    # has not been included in the deployed package yet.
    class EmployeeListRead(BaseModel):
        id: int
        employee_id: str | None = None
        employee_code: str | None = None
        full_name: str | None = None
        department: str | None = None
        designation: str | None = None
        shift: str | None = None
        reporting_manager: str | None = None
        employment_type: str | None = None
        status: str | None = None
        phone: str | None = None
        email: str | None = None
        joining_date: str | None = None
        salary: float | None = None
        initials: str | None = None

        class Config:
            from_attributes = True

    class EmployeeSummaryRead(BaseModel):
        total_employees: int = 0
        present_today: int = 0
        absent: int = 0
        on_leave: int = 0
        overtime: float = 0.0
        departments: int = 0
        contract_employees: int = 0
        new_joiners: int = 0
from app.services.hr_service import (
    create_attendance_record,
    create_employee,
    create_hr_asset,
    create_leave_request,
    create_payroll_record,
    create_safety_incident,
    create_shift,
    delete_shift,
    delete_employee,
    delete_hr_asset,
    delete_safety_incident,
    get_employee,
    get_employee_summary,
    get_hr_dashboard,
    list_attendance,
    list_attendance_corrections,
    create_attendance_correction,
    update_attendance_correction_status,
    list_overtime_requests,
    create_overtime_request,
    update_overtime_status,
    list_employees,
    list_employees_enriched,
    list_hr_assets,
    list_leave_requests,
    list_payroll,
    list_safety_incidents,
    list_shifts,
    update_employee,
    update_hr_asset,
    update_leave_request,
    update_payroll_status,
    update_safety_incident,
)
from app.services.accounts_service import create_expense, delete_expense, list_expenses, update_expense
from app.schemas.accounts import ExpenseCreate, ExpenseRead
from app.models.salary_breakup import SalaryBreakup
from app.models.statutory_setting import StatutorySetting
from app.models.base import Base
from app.schemas.salary_breakup import SalaryBreakupCreate, SalaryBreakupUpdate, SalaryBreakup as SalaryBreakupRead
from app.schemas.stautory_setting import StatutorySettingCreate, StatutorySetting as StatutorySettingRead

router = APIRouter(prefix="/hr", tags=["hr"])

MODULE = "hr"


def _statutory_payload(row: StatutorySetting) -> dict:
    try:
        data = json.loads(row.data) if row.data else {}
    except (TypeError, json.JSONDecodeError):
        data = {}
    return {
        "id": row.id,
        "tenant_id": row.tenant_id,
        "setting_type": row.setting_type,
        "data": data if isinstance(data, dict) else {},
        "is_active": row.is_active,
    }


def _ensure_statutory_table(db: Session) -> None:
    """Keep local/dev databases usable before the statutory migration is run."""
    bind = db.get_bind()
    Base.metadata.create_all(bind=bind, tables=[StatutorySetting.__table__], checkfirst=True)


@router.get("/statutory-settings", response_model=list[StatutorySettingRead])
def list_statutory_settings(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    try:
        _ensure_statutory_table(db)
        rows = db.scalars(
            select(StatutorySetting)
            .where(StatutorySetting.tenant_id == tenant_id)
            .order_by(StatutorySetting.setting_type)
        ).all()
    except SQLAlchemyError:
        db.rollback()
        logging.exception("Unable to read statutory settings for tenant %s", tenant_id)
        return []
    return [_statutory_payload(row) for row in rows]


@router.put("/statutory-settings/{setting_type}", response_model=StatutorySettingRead)
def save_statutory_setting(
    setting_type: str,
    payload: StatutorySettingCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    _ensure_statutory_table(db)
    if setting_type not in {"pf", "pt", "esic"} or payload.setting_type != setting_type:
        raise HTTPException(400, "setting_type must be pf, pt, or esic")
    row = db.scalar(
        select(StatutorySetting).where(
            StatutorySetting.tenant_id == user.tenant_id,
            StatutorySetting.setting_type == setting_type,
        )
    )
    if row:
        row.data = json.dumps(payload.data or {})
        row.is_active = 1 if payload.is_active else 0
    else:
        row = StatutorySetting(
            tenant_id=user.tenant_id,
            setting_type=setting_type,
            data=json.dumps(payload.data or {}),
            is_active=1 if payload.is_active else 0,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return _statutory_payload(row)


def _actor_name(user: User) -> str:
    return getattr(user, "full_name", None) or getattr(user, "email", None) or "User"


def _breakup_payload(row: SalaryBreakup) -> dict:
    result = {column.name: getattr(row, column.name) for column in SalaryBreakup.__table__.columns}
    try:
        result["data"] = json.loads(row.data) if row.data else {}
    except (TypeError, json.JSONDecodeError):
        result["data"] = {}
    return result


@router.get("/salary-breakups", response_model=list[SalaryBreakupRead])
def list_salary_breakups(
    employee_id: int | None = Query(None),
    department: str | None = Query(None),
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    stmt = select(SalaryBreakup).where(SalaryBreakup.tenant_id == tenant_id)
    if employee_id is not None:
        stmt = stmt.where(SalaryBreakup.employee_id == employee_id)
    rows = db.scalars(stmt.order_by(SalaryBreakup.id.desc())).all()
    if department:
        rows = [row for row in rows if row.employee and row.employee.department == department]
    return [_breakup_payload(row) for row in rows]


@router.post("/salary-breakups", response_model=SalaryBreakupRead, status_code=201)
def create_salary_breakup(
    payload: SalaryBreakupCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    employee = db.scalar(select(Employee).where(Employee.id == payload.employee_id, Employee.tenant_id == user.tenant_id))
    if not employee:
        raise HTTPException(404, "Employee not found")
    row = SalaryBreakup(
        tenant_id=user.tenant_id,
        employee_id=employee.id,
        department_id=payload.department_id,
        ctc_annual=payload.ctc_annual,
        effective_from=payload.effective_from,
        created_by=_actor_name(user),
        updated_by=_actor_name(user),
        data=json.dumps(payload.data),
        created_at=date.today(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _breakup_payload(row)


@router.put("/salary-breakups/{breakup_id}", response_model=SalaryBreakupRead)
def update_salary_breakup(
    breakup_id: int,
    payload: SalaryBreakupUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    row = db.scalar(select(SalaryBreakup).where(SalaryBreakup.id == breakup_id, SalaryBreakup.tenant_id == user.tenant_id))
    if not row:
        raise HTTPException(404, "Salary breakup not found")
    values = payload.model_dump(exclude_unset=True)
    if "data" in values:
        values["data"] = json.dumps(values["data"])
    values["updated_by"] = _actor_name(user)
    for key, value in values.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return _breakup_payload(row)


@router.delete("/salary-breakups/{breakup_id}", status_code=204)
def delete_salary_breakup(
    breakup_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    row = db.scalar(select(SalaryBreakup).where(SalaryBreakup.id == breakup_id, SalaryBreakup.tenant_id == user.tenant_id))
    if not row:
        raise HTTPException(404, "Salary breakup not found")
    db.delete(row)
    db.commit()


@router.get("/announcements", response_model=list[AnnouncementRead])
def list_announcements(
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    stmt = select(Announcement).where(Announcement.tenant_id == tenant_id)
    if month:
        year, month_number = (int(part) for part in month.split("-"))
        from calendar import monthrange
        start = date(year, month_number, 1)
        end = date(year, month_number, monthrange(year, month_number)[1])
        stmt = stmt.where(Announcement.publish_date >= start, Announcement.publish_date <= end)
    return db.scalars(stmt.order_by(Announcement.publish_date.desc(), Announcement.id.desc())).all()


@router.post("/announcements", response_model=AnnouncementRead, status_code=201)
def create_announcement(
    payload: AnnouncementCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    if not payload.title.strip():
        raise HTTPException(400, "Title is required")
    if not payload.body or not payload.body.strip():
        raise HTTPException(400, "Details are required")
    if not payload.publish_date:
        raise HTTPException(400, "Publish date is required")
    if payload.expiry_date and payload.expiry_date < payload.publish_date:
        raise HTTPException(400, "Expiry date cannot be before publish date")
    actor = _actor_name(user)
    row = Announcement(
        tenant_id=user.tenant_id,
        title=payload.title.strip(),
        body=payload.body.strip(),
        publish_date=payload.publish_date,
        expiry_date=payload.expiry_date,
        is_published=payload.is_published if payload.is_published is not None else 1,
        created_by=actor,
        created_at=date.today(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/announcements/{announcement_id}", response_model=AnnouncementRead)
def update_announcement(
    announcement_id: int,
    payload: AnnouncementUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    row = db.scalar(select(Announcement).where(Announcement.id == announcement_id, Announcement.tenant_id == user.tenant_id))
    if not row:
        raise HTTPException(404, "Announcement not found")
    values = payload.model_dump(exclude_unset=True)
    if "title" in values:
        values["title"] = values["title"].strip()
        if not values["title"]:
            raise HTTPException(400, "Title is required")
    if "body" in values and (not values["body"] or not values["body"].strip()):
        raise HTTPException(400, "Details are required")
    publish_date = values.get("publish_date", row.publish_date)
    expiry_date = values.get("expiry_date", row.expiry_date)
    if expiry_date and publish_date and expiry_date < publish_date:
        raise HTTPException(400, "Expiry date cannot be before publish date")
    if "body" in values and values["body"]:
        values["body"] = values["body"].strip()
    for key, value in values.items():
        setattr(row, key, value)
    row.updated_by = _actor_name(user)
    row.updated_at = date.today()
    db.commit()
    db.refresh(row)
    return row


@router.delete("/announcements/{announcement_id}", status_code=204)
def delete_announcement(
    announcement_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    row = db.scalar(select(Announcement).where(Announcement.id == announcement_id, Announcement.tenant_id == user.tenant_id))
    if not row:
        raise HTTPException(404, "Announcement not found")
    db.delete(row)
    db.commit()


class HrExpenseStatusUpdate(BaseModel):
    status: str


@router.post("/employees", response_model=EmployeeRead)
def create_employee_endpoint(
    payload: EmployeeCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    payload.tenant_id = user.tenant_id
    return create_employee(db, payload)


@router.get("/employees", response_model=list[EmployeeRead])
def list_employees_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    return list_employees(db, tenant_id)


@router.get("/employees/summary", response_model=EmployeeSummaryRead)
def employees_summary(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    return get_employee_summary(db, tenant_id)


@router.get("/employees/enriched", response_model=list[EmployeeListRead])
def employees_enriched(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    return list_employees_enriched(db, tenant_id)


def _csv_download(filename: str, headers: list[str], rows: list[list[object]]) -> StreamingResponse:
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    content = buffer.getvalue().encode("utf-8-sig")
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _month_bounds(month: str) -> tuple[date, date]:
    try:
        year, month_number = (int(part) for part in month.split("-", 1))
        start = date(year, month_number, 1)
    except (AttributeError, TypeError, ValueError):
        raise HTTPException(400, "month must use YYYY-MM format") from None
    end = date(year + (month_number == 12), 1 if month_number == 12 else month_number + 1, 1)
    return start, end


@router.get("/reports/attendance/export")
def export_attendance_report(
    month: str,
    employee_id: int | None = None,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    start, end = _month_bounds(month)
    employees = {employee.id: employee for employee in list_employees(db, tenant_id)}
    rows = list_attendance(db, tenant_id, date_from=start, date_to=end - timedelta(days=1), employee_id=employee_id)
    return _csv_download(
        f"attendance-{month}.csv",
        ["Employee Code", "Employee Name", "Date", "Status", "Clock In", "Clock Out", "Work Hours", "Overtime Hours"],
        [[
            employees.get(row.employee_id).employee_code if employees.get(row.employee_id) else row.employee_id,
            employees.get(row.employee_id).full_name if employees.get(row.employee_id) else "",
            row.record_date,
            row.status or "",
            row.clock_in or "",
            row.clock_out or "",
            row.work_hours if row.work_hours is not None else "",
            row.overtime_hours if row.overtime_hours is not None else "",
        ] for row in rows],
    )


@router.get("/reports/payroll/export")
def export_payroll_report(
    month: str,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    start, end = _month_bounds(month)
    employees = {employee.id: employee for employee in list_employees(db, tenant_id)}
    rows = list_payroll(db, tenant_id, period_start=start, period_end=end - timedelta(days=1))
    return _csv_download(
        f"payroll-{month}.csv",
        ["Employee Code", "Employee Name", "Period Start", "Period End", "Base Salary", "Gross Pay", "Deductions", "Net Pay", "Status"],
        [[
            employees.get(row.employee_id).employee_code if employees.get(row.employee_id) else row.employee_id,
            employees.get(row.employee_id).full_name if employees.get(row.employee_id) else "",
            row.period_start,
            row.period_end,
            row.base_salary,
            row.gross_pay,
            row.deductions,
            row.net_pay,
            row.status,
        ] for row in rows],
    )


@router.get("/reports/employees/export")
def export_employees_report(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    rows = list_employees(db, tenant_id)
    return _csv_download(
        "employees.csv",
        ["Employee Code", "Full Name", "Email", "Phone", "Department", "Designation", "Hire Date", "Employment Type", "Active"],
        [[
            row.employee_code,
            row.full_name,
            row.email or "",
            row.phone or "",
            row.department or "",
            row.designation or "",
            row.hire_date or "",
            row.employment_type or "",
            "Yes" if row.is_active else "No",
        ] for row in rows],
    )


@router.get("/departments/summary", response_model=DepartmentSummaryRead)
def department_summary_endpoint(
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DepartmentSummaryRead:
    return get_department_summary(db, user.tenant_id)


@router.get("/departments", response_model=list[DepartmentListRead])
def list_departments_endpoint(
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> list[DepartmentListRead]:
    return list_departments_enriched(db, user.tenant_id)


@router.post("/departments", response_model=DepartmentListRead)
def create_department_endpoint(
    payload: DepartmentCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DepartmentListRead:
    payload.tenant_id = user.tenant_id
    dept = create_department(db, payload)
    enriched = list_departments_enriched(db, user.tenant_id)
    match = next((d for d in enriched if d.id == dept.id), None)
    return match or _to_list_read(db, user.tenant_id, dept)


@router.get("/departments/{department_id}", response_model=DepartmentDetailRead)
def get_department_endpoint(
    department_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DepartmentDetailRead:
    detail = get_department_detail(db, user.tenant_id, department_id)
    if not detail:
        raise HTTPException(404, "Department not found")
    return detail


@router.put("/departments/{department_id}", response_model=DepartmentListRead)
def update_department_endpoint(
    department_id: int,
    payload: DepartmentUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DepartmentListRead:
    dept = update_department(db, user.tenant_id, department_id, payload)
    if not dept:
        raise HTTPException(404, "Department not found")
    enriched = list_departments_enriched(db, user.tenant_id)
    match = next((d for d in enriched if d.id == department_id), None)
    if not match:
        raise HTTPException(404, "Department not found")
    return match


@router.patch("/departments/{department_id}/deactivate", response_model=DepartmentListRead)
def deactivate_department_endpoint(
    department_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DepartmentListRead:
    dept = deactivate_department(db, user.tenant_id, department_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    enriched = list_departments_enriched(db, user.tenant_id)
    match = next((d for d in enriched if d.id == department_id), None)
    if not match:
        raise HTTPException(404, "Department not found")
    return match


# ── Dashboard ──────────────────────────────────────────────────────────────

@router.get("/dashboard")
def hr_dashboard(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    return get_hr_dashboard(db, tenant_id)


@router.get("/expenses", response_model=list[ExpenseRead])
def list_hr_expenses(
    year: int | None = None,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    return list_expenses(db, tenant_id, year)


@router.post("/expenses", response_model=ExpenseRead, status_code=201)
def create_hr_expense(
    payload: ExpenseCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    payload.tenant_id = user.tenant_id
    return create_expense(db, payload)


@router.put("/expenses/{expense_id}", response_model=ExpenseRead)
def update_hr_expense(
    expense_id: int,
    payload: ExpenseCreate,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    row = update_expense(db, tenant_id, expense_id, payload.model_dump(exclude={"tenant_id"}))
    if not row:
        raise HTTPException(404, "Expense not found")
    return row


@router.patch("/expenses/{expense_id}/status", response_model=ExpenseRead)
def update_hr_expense_status(
    expense_id: int,
    payload: HrExpenseStatusUpdate,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    row = next((expense for expense in list_expenses(db, tenant_id) if expense.id == expense_id), None)
    if not row:
        raise HTTPException(404, "Expense not found")
    try:
        meta = json.loads(row.description or "{}")
    except (TypeError, json.JSONDecodeError):
        meta = {}
    meta["status"] = payload.status
    updated = update_expense(db, tenant_id, expense_id, {"description": json.dumps(meta)})
    if not updated:
        raise HTTPException(404, "Expense not found")
    return updated


@router.delete("/expenses/{expense_id}")
def delete_hr_expense(
    expense_id: int,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    if not delete_expense(db, tenant_id, expense_id):
        raise HTTPException(404, "Expense not found")
    return {"ok": True, "id": expense_id}


# ── Shifts ─────────────────────────────────────────────────────────────────

@router.get("/shifts", response_model=list[ShiftRead])
def list_shifts_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    return list_shifts(db, tenant_id)


@router.post("/shifts", response_model=ShiftRead, status_code=201)
def create_shift_endpoint(
    payload: ShiftCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    payload.tenant_id = user.tenant_id
    return create_shift(db, payload)


@router.delete("/shifts/{shift_id}", status_code=204)
def delete_shift_endpoint(
    shift_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    if not delete_shift(db, user.tenant_id, shift_id):
        raise HTTPException(404, "Shift not found")
    return None


# ── Attendance ─────────────────────────────────────────────────────────────

@router.get("/attendance", response_model=list[AttendanceRecordRead])
def list_attendance_endpoint(
    employee_id: int | None = None,
    month: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    from datetime import date as _date, timedelta
    if month and not date_from and not date_to:
        try:
            year, month_number = (int(part) for part in month.split("-", 1))
            date_from = f"{year:04d}-{month_number:02d}-01"
            next_month = _date(year + (month_number == 12), 1 if month_number == 12 else month_number + 1, 1)
            date_to = str(next_month - timedelta(days=1))
        except (TypeError, ValueError):
            raise HTTPException(400, "month must use YYYY-MM format")
    df = _date.fromisoformat(date_from) if date_from else None
    dt = _date.fromisoformat(date_to) if date_to else None
    return list_attendance(db, tenant_id, date_from=df, date_to=dt, employee_id=employee_id)


@router.post("/attendance", response_model=AttendanceRecordRead, status_code=201)
def create_attendance_endpoint(
    payload: AttendanceRecordCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    payload.tenant_id = user.tenant_id
    return create_attendance_record(db, payload)


@router.get("/attendance/corrections")
def list_attendance_corrections_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    return list_attendance_corrections(db, tenant_id)


@router.post("/attendance/corrections", status_code=201)
def create_attendance_correction_endpoint(
    payload: AttendanceCorrectionCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    actor = getattr(user, "full_name", None) or getattr(user, "email", None)
    return create_attendance_correction(db, user.tenant_id, payload, actor)


@router.patch("/attendance/corrections/{request_id}/status")
def update_attendance_correction_endpoint(
    request_id: int,
    payload: AttendanceCorrectionStatus,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    status = payload.status.capitalize()
    if status not in ("Approved", "Rejected", "Pending"):
        raise HTTPException(400, "status must be Pending, Approved, or Rejected")
    actor = getattr(user, "full_name", None) or getattr(user, "email", None)
    request = update_attendance_correction_status(db, user.tenant_id, request_id, status, actor)
    if not request:
        raise HTTPException(404, "Attendance correction request not found")
    return request


@router.get("/overtime")
def list_overtime_endpoint(
    month: str | None = None,
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    try:
        return list_overtime_requests(db, tenant_id, month)
    except (TypeError, ValueError):
        raise HTTPException(400, "month must use YYYY-MM format")


@router.post("/overtime", status_code=201)
def create_overtime_endpoint(
    payload: OvertimeRequestCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    actor = getattr(user, "full_name", None) or getattr(user, "email", None)
    return create_overtime_request(db, user.tenant_id, payload, actor)


@router.patch("/overtime/{request_id}/status")
def update_overtime_endpoint(
    request_id: int,
    payload: OvertimeStatusUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    status = payload.status.lower()
    if status not in ("approved", "rejected", "pending"):
        raise HTTPException(400, "status must be pending, approved, or rejected")
    actor = getattr(user, "full_name", None) or getattr(user, "email", None)
    request = update_overtime_status(db, user.tenant_id, request_id, status, actor)
    if not request:
        raise HTTPException(404, "Overtime request not found")
    return request


# ── Leave Requests ─────────────────────────────────────────────────────────

@router.get("/leaves")
def list_leaves_endpoint(
    employee_id: int | None = None,
    status: str | None = None,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import Employee
    leaves = list_leave_requests(db, tenant_id, employee_id=employee_id, status=status)
    emp_map = {e.id: e.full_name for e in db.query(Employee).filter_by(tenant_id=tenant_id).all()}
    result = []
    for lv in leaves:
        result.append({
            "id": lv.id, "employee_id": lv.employee_id,
            "employee_name": emp_map.get(lv.employee_id, f"Employee {lv.employee_id}"),
            "leave_type": lv.leave_type, "start_date": str(lv.start_date),
            "end_date": str(lv.end_date), "days": lv.days, "reason": lv.reason,
            "status": lv.status,
            "created_at": lv.created_at.isoformat() if lv.created_at else None,
            "updated_at": lv.updated_at.isoformat() if lv.updated_at else None,
        })
    return result


@router.post("/leaves", response_model=LeaveRequestRead, status_code=201)
def create_leave_endpoint(
    payload: LeaveRequestCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    payload.tenant_id = user.tenant_id
    return create_leave_request(db, payload)


@router.put("/leaves/{leave_id}", response_model=LeaveRequestRead)
def update_leave_endpoint(
    leave_id: int,
    payload: LeaveRequestUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    leave = update_leave_request(db, user.tenant_id, leave_id, payload)
    if not leave:
        raise HTTPException(404, "Leave request not found")
    return leave


# ── Payroll ────────────────────────────────────────────────────────────────

@router.get("/payroll", response_model=list[PayrollRecordRead])
def list_payroll_endpoint(
    employee_id: int | None = None,
    month: str | None = Query(None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    period_start = period_end = None
    if month:
        year, month_number = (int(part) for part in month.split("-", 1))
        period_start = date(year, month_number, 1)
        period_end = date(year + (month_number == 12), 1 if month_number == 12 else month_number + 1, 1) - timedelta(days=1)
    return list_payroll(
        db,
        tenant_id,
        employee_id=employee_id,
        period_start=period_start,
        period_end=period_end,
    )


@router.patch("/payroll/{payroll_id}/status", response_model=PayrollRecordRead)
def update_payroll_status_endpoint(
    payroll_id: int,
    payload: OvertimeStatusUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    status = payload.status.lower()
    if status not in ("draft", "calculated", "approved", "paid", "rejected"):
        raise HTTPException(400, "status must be draft, calculated, approved, paid, or rejected")
    row = update_payroll_status(db, user.tenant_id, payroll_id, status)
    if not row:
        raise HTTPException(404, "Payroll record not found")
    return row


@router.post("/payroll", response_model=PayrollRecordRead, status_code=201)
def create_payroll_endpoint(
    payload: PayrollRecordCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    payload.tenant_id = user.tenant_id
    return create_payroll_record(db, payload)


# ── Employees (by ID) ──────────────────────────────────────────────────────

@router.get("/employees/{employee_id}", response_model=EmployeeRead)
def get_employee_endpoint(
    employee_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    emp = get_employee(db, user.tenant_id, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found")
    return emp


@router.put("/employees/{employee_id}", response_model=EmployeeRead)
def update_employee_endpoint(
    employee_id: int,
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    emp = update_employee(db, user.tenant_id, employee_id, payload)
    if not emp:
        raise HTTPException(404, "Employee not found")
    return emp


@router.delete("/employees/{employee_id}", status_code=204)
def delete_employee_endpoint(
    employee_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    if not delete_employee(db, user.tenant_id, employee_id):
        raise HTTPException(404, "Employee not found")
    return None


@router.get("/assets", response_model=list[HrAssetRead])
def list_assets_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    return list_hr_assets(db, tenant_id)


@router.post("/assets", response_model=HrAssetRead, status_code=201)
def create_asset_endpoint(
    payload: HrAssetCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    try:
        return create_hr_asset(db, user.tenant_id, payload)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(503, detail=str(e))
    except Exception as e:
        logging.error(f"Unexpected error creating HR asset: {str(e)}")
        raise HTTPException(500, detail="Failed to create asset")


@router.put("/assets/{asset_id}", response_model=HrAssetRead)
def update_asset_endpoint(
    asset_id: int,
    payload: HrAssetUpdate,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    try:
        row = update_hr_asset(db, tenant_id, asset_id, payload)
        if not row:
            raise HTTPException(404, "Asset not found")
        return row
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(503, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error updating HR asset {asset_id}: {str(e)}")
        raise HTTPException(500, detail="Failed to update asset")


@router.delete("/assets/{asset_id}", status_code=204)
def delete_asset_endpoint(
    asset_id: int,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    try:
        if not delete_hr_asset(db, tenant_id, asset_id):
            raise HTTPException(404, "Asset not found")
        return None
    except RuntimeError as e:
        raise HTTPException(503, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error deleting HR asset {asset_id}: {str(e)}")
        raise HTTPException(500, detail="Failed to delete asset")


@router.get("/incidents", response_model=list[SafetyIncidentRead])
def list_incidents_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    return list_safety_incidents(db, tenant_id)


@router.post("/incidents", response_model=SafetyIncidentRead, status_code=201)
def create_incident_endpoint(
    payload: SafetyIncidentCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    try:
        return create_safety_incident(db, user.tenant_id, payload)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(503, detail=str(e))
    except Exception as e:
        logging.error(f"Unexpected error creating safety incident: {str(e)}")
        raise HTTPException(500, detail="Failed to create incident")


@router.put("/incidents/{incident_id}", response_model=SafetyIncidentRead)
def update_incident_endpoint(
    incident_id: int,
    payload: SafetyIncidentUpdate,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    try:
        row = update_safety_incident(db, tenant_id, incident_id, payload)
        if not row:
            raise HTTPException(404, "Incident not found")
        return row
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(503, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error updating safety incident {incident_id}: {str(e)}")
        raise HTTPException(500, detail="Failed to update incident")


@router.delete("/incidents/{incident_id}", status_code=204)
def delete_incident_endpoint(
    incident_id: int,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    if not delete_safety_incident(db, tenant_id, incident_id):
        raise HTTPException(404, "Incident not found")
    return None


# ── Payroll: Run Auto-Calculation ─────────────────────────────────────────

@router.post("/payroll/run", response_model=PayrollRunResponse)
def run_payroll_endpoint(
    payload: PayrollRunRequest,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    """Trigger automatic payroll calculation for all active employees for a given month."""
    from app.services.payroll_calc_service import run_payroll_bulk
    try:
        results = run_payroll_bulk(db, user.tenant_id, payload.year, payload.month)
        total_gross = sum(r["gross_pay"] for r in results)
        total_ded = sum(r["total_deductions"] for r in results)
        total_net = sum(r["net_pay"] for r in results)
        items = [PayrollBreakdownItem(**r) for r in results]
        return PayrollRunResponse(
            processed=len(results),
            total_gross=round(total_gross, 2),
            total_deductions=round(total_ded, 2),
            total_net=round(total_net, 2),
            records=items,
        )
    except Exception as e:
        logging.error(f"Payroll run failed: {e}")
        raise HTTPException(500, detail=f"Payroll calculation failed: {str(e)}")


@router.get("/payroll/{payroll_id}/breakdown")
def payroll_breakdown_endpoint(
    payroll_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    """Get detailed payslip breakdown for a specific payroll record."""
    from app.services.hr_service import get_payroll_breakdown
    data = get_payroll_breakdown(db, user.tenant_id, payroll_id)
    if not data:
        raise HTTPException(404, "Payroll record not found")
    return data


# ── Payslips ──────────────────────────────────────────────────────────────

@router.get("/payslips", response_model=list[PayslipRead])
def list_payslips_endpoint(
    employee_id: int | None = None,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    """List all payslips (calculated payroll records) for the tenant."""
    from app.services.hr_service import list_payslips
    return list_payslips(db, tenant_id, employee_id=employee_id)


# ── Leave Approve / Delete ────────────────────────────────────────────────

@router.patch("/leaves/{leave_id}/approve")
def approve_leave_endpoint(
    leave_id: int,
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    """Approve or reject a leave request."""
    from app.services.hr_service import approve_leave_request
    status = payload.get("status", "approved")
    if status not in ("approved", "rejected"):
        raise HTTPException(400, "status must be 'approved' or 'rejected'")
    lv = approve_leave_request(db, user.tenant_id, leave_id, status)
    if not lv:
        raise HTTPException(404, "Leave request not found")
    return {"id": lv.id, "status": lv.status}


@router.delete("/leaves/{leave_id}", status_code=204)
def delete_leave_endpoint(
    leave_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    """Delete a leave request."""
    from app.services.hr_service import delete_leave_request
    if not delete_leave_request(db, user.tenant_id, leave_id):
        raise HTTPException(404, "Leave request not found")
    return None


# ── Attendance Check-In / Check-Out ──────────────────────────────────────

@router.post("/attendance/checkin")
def checkin_endpoint(
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    """Clock an employee in for today."""
    from app.services.hr_service import record_attendance_checkin
    employee_id = payload.get("employee_id")
    if not employee_id:
        raise HTTPException(400, "employee_id required")
    rec = record_attendance_checkin(
        db, user.tenant_id, int(employee_id),
        lat=payload.get("lat"), lng=payload.get("lng"),
    )
    return {
        "id": rec.id,
        "employee_id": rec.employee_id,
        "record_date": str(rec.record_date),
        "clock_in": str(rec.clock_in),
        "status": rec.status,
    }


@router.post("/attendance/checkout")
def checkout_endpoint(
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    """Clock an employee out for today."""
    from app.services.hr_service import record_attendance_checkout
    employee_id = payload.get("employee_id")
    if not employee_id:
        raise HTTPException(400, "employee_id required")
    rec = record_attendance_checkout(db, user.tenant_id, int(employee_id))
    if not rec:
        raise HTTPException(404, "No check-in found for today")
    return {
        "id": rec.id,
        "employee_id": rec.employee_id,
        "record_date": str(rec.record_date),
        "clock_in": str(rec.clock_in),
        "clock_out": str(rec.clock_out),
        "work_hours": rec.work_hours,
        "overtime_hours": rec.overtime_hours,
        "status": rec.status,
    }


# ── Shift Assignments ────────────────────────────────────────────────────

@router.get("/shifts/assignments")
def list_shift_assignments_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    from app.models.hr import ShiftAssignment
    rows = db.query(ShiftAssignment).filter_by(tenant_id=tenant_id).order_by(ShiftAssignment.id.desc()).all()
    return [{"id": r.id, "employee_id": r.employee_id, "shift_id": r.shift_id,
             "shift_name": r.shift_name, "branch": r.branch, "department": r.department,
             "shift_from": str(r.shift_from) if r.shift_from else None,
             "shift_to": str(r.shift_to) if r.shift_to else None,
             "created_by": r.created_by} for r in rows]


@router.post("/shifts/assignments", status_code=201)
def create_shift_assignment_endpoint(
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import ShiftAssignment
    from datetime import date as _date
    row = ShiftAssignment(
        tenant_id=user.tenant_id,
        employee_id=int(payload.get("employee_id", 0)),
        shift_id=int(payload.get("shift_id", 0)),
        shift_name=payload.get("shift_name") or None,
        branch=payload.get("branch") or None,
        department=payload.get("department") or None,
        shift_from=_date.fromisoformat(payload["shift_from"]) if payload.get("shift_from") else None,
        shift_to=_date.fromisoformat(payload["shift_to"]) if payload.get("shift_to") else None,
        created_by=user.email or str(user.id),
    )
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "employee_id": row.employee_id, "shift_id": row.shift_id,
            "shift_name": row.shift_name, "branch": row.branch, "department": row.department,
            "shift_from": str(row.shift_from) if row.shift_from else None,
            "shift_to": str(row.shift_to) if row.shift_to else None}


@router.delete("/shifts/assignments/{assignment_id}", status_code=204)
def delete_shift_assignment_endpoint(
    assignment_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import ShiftAssignment
    row = db.query(ShiftAssignment).filter_by(id=assignment_id, tenant_id=user.tenant_id).first()
    if not row: raise HTTPException(404, "Assignment not found")
    db.delete(row); db.commit()
    return None


# ── Weekly Offs ────────────────────────────────────────────────────────────

@router.get("/weekly-offs")
def list_weekly_offs_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    from app.models.hr import WeeklyOff
    rows = db.query(WeeklyOff).filter_by(tenant_id=tenant_id).all()
    return [{"id": r.id, "name": r.name, "config": r.config, "created_by": r.created_by} for r in rows]


@router.post("/weekly-offs", status_code=201)
def create_weekly_off_endpoint(
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    import json
    from app.models.hr import WeeklyOff
    row = WeeklyOff(
        tenant_id=user.tenant_id,
        name=payload.get("name", "").strip(),
        config=json.dumps(payload.get("config", {})),
        created_by=user.email or str(user.id),
    )
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "name": row.name, "config": row.config, "created_by": row.created_by}


@router.delete("/weekly-offs/{off_id}", status_code=204)
def delete_weekly_off_endpoint(
    off_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import WeeklyOff
    row = db.query(WeeklyOff).filter_by(id=off_id, tenant_id=user.tenant_id).first()
    if not row: raise HTTPException(404, "Weekly off not found")
    db.delete(row); db.commit()
    return None


@router.get("/weekly-off-assignments")
def list_weekly_off_assignments_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    from app.models.hr import Employee, WeeklyOff, WeeklyOffAssignment
    rows = db.query(WeeklyOffAssignment).filter_by(tenant_id=tenant_id).order_by(WeeklyOffAssignment.id.desc()).all()
    employee_names = {e.id: e.full_name for e in db.query(Employee).filter_by(tenant_id=tenant_id).all()}
    weekly_offs = {w.id: w.name for w in db.query(WeeklyOff).filter_by(tenant_id=tenant_id).all()}
    return [{
        "id": r.id, "employee_id": r.employee_id, "employee_name": employee_names.get(r.employee_id),
        "weekly_off_id": r.weekly_off_id, "weekly_off": weekly_offs.get(r.weekly_off_id),
        "effective_from": str(r.effective_from), "branch": r.branch, "department": r.department,
        "work_week": r.work_week, "week_off": r.week_off, "created_by": r.created_by,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in rows]


@router.post("/weekly-off-assignments", status_code=201)
def create_weekly_off_assignment_endpoint(
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from datetime import date as _date
    from app.models.hr import WeeklyOff, WeeklyOffAssignment
    weekly_off_id = int(payload.get("weekly_off_id", 0))
    weekly_off = db.query(WeeklyOff).filter_by(id=weekly_off_id, tenant_id=user.tenant_id).first()
    if not weekly_off:
        raise HTTPException(404, "Weekly off not found")
    row = WeeklyOffAssignment(
        tenant_id=user.tenant_id,
        employee_id=int(payload.get("employee_id", 0)),
        weekly_off_id=weekly_off_id,
        effective_from=_date.fromisoformat(payload["effective_from"]),
        branch=payload.get("branch") or None,
        department=payload.get("department") or None,
        work_week=payload.get("work_week") or None,
        week_off=payload.get("week_off", "").strip(),
        created_by=user.email or str(user.id),
    )
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id}


@router.delete("/weekly-off-assignments/{assignment_id}", status_code=204)
def delete_weekly_off_assignment_endpoint(
    assignment_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import WeeklyOffAssignment
    row = db.query(WeeklyOffAssignment).filter_by(id=assignment_id, tenant_id=user.tenant_id).first()
    if not row:
        raise HTTPException(404, "Weekly off assignment not found")
    db.delete(row); db.commit()
    return None


# ── Preboarding ──────────────────────────────────────────────────────────

@router.get("/preboarding", response_model=list[dict])
def list_preboarding_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    from app.models.hr import PreboardingCandidate
    rows = db.query(PreboardingCandidate).filter_by(tenant_id=tenant_id).order_by(PreboardingCandidate.id.desc()).all()
    return [
        {
            "id": r.id, "full_name": r.full_name, "email": r.email, "phone": r.phone,
            "designation": r.designation, "department": r.department,
            "expected_joining": str(r.expected_joining) if r.expected_joining else None,
            "status": r.status, "next_task": r.next_task, "is_archived": r.is_archived,
        }
        for r in rows
    ]


@router.post("/preboarding", status_code=201)
def create_preboarding_endpoint(
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import PreboardingCandidate
    from datetime import date as _date
    doj = payload.get("expected_joining")
    row = PreboardingCandidate(
        tenant_id=user.tenant_id,
        full_name=payload.get("full_name", "").strip(),
        email=payload.get("email") or None,
        phone=payload.get("phone") or None,
        designation=payload.get("designation") or None,
        department=payload.get("department") or None,
        expected_joining=_date.fromisoformat(doj) if doj else None,
        status=payload.get("status", "Offer Sent"),
        next_task=payload.get("next_task") or None,
        is_archived=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id, "full_name": row.full_name, "email": row.email, "phone": row.phone,
        "designation": row.designation, "department": row.department,
        "expected_joining": str(row.expected_joining) if row.expected_joining else None,
        "status": row.status, "next_task": row.next_task, "is_archived": row.is_archived,
    }


@router.patch("/preboarding/{candidate_id}")
def update_preboarding_endpoint(
    candidate_id: int,
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import PreboardingCandidate
    from datetime import date as _date
    row = db.query(PreboardingCandidate).filter_by(id=candidate_id, tenant_id=user.tenant_id).first()
    if not row:
        raise HTTPException(404, "Candidate not found")
    for field in ("full_name", "email", "phone", "designation", "department", "status", "next_task", "is_archived"):
        if field in payload:
            setattr(row, field, payload[field])
    if "expected_joining" in payload:
        doj = payload["expected_joining"]
        row.expected_joining = _date.fromisoformat(doj) if doj else None
    db.commit()
    db.refresh(row)
    return {
        "id": row.id, "full_name": row.full_name, "email": row.email, "phone": row.phone,
        "designation": row.designation, "department": row.department,
        "expected_joining": str(row.expected_joining) if row.expected_joining else None,
        "status": row.status, "next_task": row.next_task, "is_archived": row.is_archived,
    }


@router.delete("/preboarding/{candidate_id}", status_code=204)
def delete_preboarding_endpoint(
    candidate_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import PreboardingCandidate
    row = db.query(PreboardingCandidate).filter_by(id=candidate_id, tenant_id=user.tenant_id).first()
    if not row:
        raise HTTPException(404, "Candidate not found")
    db.delete(row)
    db.commit()
    return None


# ── Payroll Status Update ─────────────────────────────────────────────────

@router.patch("/payroll/{payroll_id}/status")
def update_payroll_status_endpoint(
    payroll_id: int,
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    """Update payroll record status (draft → calculated → approved → paid)."""
    status = payload.get("status")
    if not status:
        raise HTTPException(400, "status required")
    pr = update_payroll_status(db, user.tenant_id, payroll_id, status)
    if not pr:
        raise HTTPException(404, "Payroll record not found")
    return {"id": pr.id, "status": pr.status}



# ── Leave Plans ───────────────────────────────────────────────────────────

@router.get("/leave-plans")
def list_leave_plans_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    from app.models.hr import LeavePlan
    rows = db.query(LeavePlan).filter_by(tenant_id=tenant_id).order_by(LeavePlan.id.desc()).all()
    return [
        {
            "id": r.id, "name": r.name,
            "effective_from": str(r.effective_from) if r.effective_from else None,
            "effective_to": str(r.effective_to) if r.effective_to else None,
            "leave_types": r.leave_types, "description": r.description,
            "created_by": r.created_by,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("/leave-plans", status_code=201)
def create_leave_plan_endpoint(
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import LeavePlan
    from datetime import date as _date
    import json
    row = LeavePlan(
        tenant_id=user.tenant_id,
        name=payload.get("name", "").strip(),
        effective_from=_date.fromisoformat(payload["effective_from"]) if payload.get("effective_from") else None,
        effective_to=_date.fromisoformat(payload["effective_to"]) if payload.get("effective_to") else None,
        leave_types=json.dumps(payload.get("leave_types", [])) if isinstance(payload.get("leave_types"), list) else payload.get("leave_types"),
        description=payload.get("description") or None,
        created_by=user.email or str(user.id),
    )
    db.add(row); db.commit(); db.refresh(row)
    return {
        "id": row.id, "name": row.name,
        "effective_from": str(row.effective_from) if row.effective_from else None,
        "effective_to": str(row.effective_to) if row.effective_to else None,
        "leave_types": row.leave_types, "description": row.description,
        "created_by": row.created_by,
    }


@router.patch("/leave-plans/{plan_id}")
def update_leave_plan_endpoint(
    plan_id: int,
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import LeavePlan
    from datetime import date as _date
    import json
    row = db.query(LeavePlan).filter_by(id=plan_id, tenant_id=user.tenant_id).first()
    if not row:
        raise HTTPException(404, "Leave plan not found")
    if "name" in payload:
        row.name = payload["name"]
    if "effective_from" in payload:
        row.effective_from = _date.fromisoformat(payload["effective_from"]) if payload["effective_from"] else None
    if "effective_to" in payload:
        row.effective_to = _date.fromisoformat(payload["effective_to"]) if payload["effective_to"] else None
    if "leave_types" in payload:
        lt = payload["leave_types"]
        row.leave_types = json.dumps(lt) if isinstance(lt, list) else lt
    if "description" in payload:
        row.description = payload["description"] or None
    db.commit(); db.refresh(row)
    return {
        "id": row.id, "name": row.name,
        "effective_from": str(row.effective_from) if row.effective_from else None,
        "effective_to": str(row.effective_to) if row.effective_to else None,
        "leave_types": row.leave_types, "description": row.description,
        "created_by": row.created_by,
    }


@router.delete("/leave-plans/{plan_id}", status_code=204)
def delete_leave_plan_endpoint(
    plan_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import LeavePlan
    row = db.query(LeavePlan).filter_by(id=plan_id, tenant_id=user.tenant_id).first()
    if not row:
        raise HTTPException(404, "Leave plan not found")
    db.delete(row); db.commit()
    return None


# ── Leave Balances ────────────────────────────────────────────────────────

@router.get("/leave-balances")
def list_leave_balances_endpoint(
    employee_id: int | None = None,
    year: int | None = None,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import LeaveBalance, Employee
    from datetime import date as _date
    yr = year or _date.today().year
    q = db.query(LeaveBalance).filter_by(tenant_id=tenant_id, year=yr)
    if employee_id:
        q = q.filter_by(employee_id=employee_id)
    rows = q.all()
    emp_map = {e.id: e.full_name for e in db.query(Employee).filter_by(tenant_id=tenant_id).all()}
    return [
        {
            "id": r.id, "employee_id": r.employee_id,
            "employee_name": emp_map.get(r.employee_id, f"Employee {r.employee_id}"),
            "leave_type": r.leave_type, "year": r.year,
            "total_days": r.total_days, "used_days": r.used_days,
            "adjusted_days": r.adjusted_days, "adjusted_by": r.adjusted_by,
            "adjusted_reason": r.adjusted_reason,
            "available": round(r.total_days + r.adjusted_days - r.used_days, 2),
        }
        for r in rows
    ]


@router.post("/leave-balances", status_code=201)
def upsert_leave_balance_endpoint(
    payload: dict,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from app.models.hr import LeaveBalance
    from datetime import date as _date
    yr = payload.get("year") or _date.today().year
    emp_id = int(payload.get("employee_id", 0))
    lt = payload.get("leave_type", "")
    row = db.query(LeaveBalance).filter_by(
        tenant_id=user.tenant_id, employee_id=emp_id, leave_type=lt, year=yr
    ).first()
    if row:
        if "total_days" in payload:
            row.total_days = float(payload["total_days"])
        if "adjusted_days" in payload:
            row.adjusted_days = float(payload["adjusted_days"])
            row.adjusted_by = user.email or str(user.id)
            row.adjusted_reason = payload.get("adjusted_reason") or None
    else:
        row = LeaveBalance(
            tenant_id=user.tenant_id, employee_id=emp_id, leave_type=lt, year=yr,
            total_days=float(payload.get("total_days", 0)),
            used_days=float(payload.get("used_days", 0)),
            adjusted_days=float(payload.get("adjusted_days", 0)),
            adjusted_by=user.email or str(user.id),
            adjusted_reason=payload.get("adjusted_reason") or None,
        )
        db.add(row)
    db.commit(); db.refresh(row)
    return {
        "id": row.id, "employee_id": row.employee_id, "leave_type": row.leave_type,
        "year": row.year, "total_days": row.total_days, "used_days": row.used_days,
        "adjusted_days": row.adjusted_days, "adjusted_by": row.adjusted_by,
        "available": round(row.total_days + row.adjusted_days - row.used_days, 2),
    }


# ─────────────────────────────────────────────────────────────────────────────
# SITE VISITS  — /hr/site-visits
# ─────────────────────────────────────────────────────────────────────────────

from datetime import date as _date
from typing import Optional
from pydantic import BaseModel as _BaseModel
from app.models.site_visit import SiteVisit
from app.models.hr import Employee


class SiteVisitCreate(_BaseModel):
    employee_id: int
    visit_date: _date
    visit_type: Optional[str] = None
    purpose: Optional[str] = None
    client_name: Optional[str] = None
    notes: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    check_in_address: Optional[str] = None
    check_out_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SiteVisitUpdate(_BaseModel):
    employee_id: Optional[int] = None
    visit_date: Optional[_date] = None
    visit_type: Optional[str] = None
    purpose: Optional[str] = None
    client_name: Optional[str] = None
    notes: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    check_in_address: Optional[str] = None
    check_out_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


def _sv_to_dict(sv: SiteVisit, emp_name: str = "") -> dict:
    return {
        "id": sv.id,
        "employee_id": sv.employee_id,
        "employee_name": emp_name or (sv.employee.full_name if sv.employee else ""),
        "visit_date": str(sv.visit_date) if sv.visit_date else None,
        "visit_type": sv.visit_type,
        "purpose": sv.purpose,
        "client_name": sv.client_name,
        "notes": sv.notes,
        "check_in_time": sv.notes and None,   # placeholder — stored in notes JSON below
        "check_out_time": None,
        "check_in_address": None,
        "check_out_address": None,
        "latitude": sv.latitude,
        "longitude": sv.longitude,
        "photo_url": sv.photo_url,
    }


def _sv_to_dict_full(sv: SiteVisit) -> dict:
    """Parse check-in/out info stored as JSON in sv.notes if available."""
    import json as _json
    meta = {}
    raw_notes = sv.notes or ""
    plain_notes = raw_notes
    try:
        parsed = _json.loads(raw_notes)
        if isinstance(parsed, dict):
            meta = parsed
            plain_notes = meta.pop("_notes", "")
    except Exception:
        pass
    emp_name = ""
    if sv.employee:
        emp_name = sv.employee.full_name or ""
    return {
        "id": sv.id,
        "employee_id": sv.employee_id,
        "employee_name": emp_name,
        "visit_date": str(sv.visit_date) if sv.visit_date else None,
        "visit_type": sv.visit_type,
        "purpose": sv.purpose,
        "client_name": sv.client_name,
        "notes": plain_notes,
        "check_in_time": meta.get("check_in_time"),
        "check_out_time": meta.get("check_out_time"),
        "check_in_address": meta.get("check_in_address"),
        "check_out_address": meta.get("check_out_address"),
        "latitude": sv.latitude,
        "longitude": sv.longitude,
        "photo_url": sv.photo_url,
    }


@router.get("/site-visits")
def list_site_visits(
    month: Optional[str] = None,
    employee_id: Optional[int] = None,
    visit_type: Optional[str] = None,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    """List site visits for the tenant, optionally filtered by month / employee / type."""
    from sqlalchemy import select, extract
    from app.models.hr import Employee as _Employee

    q = (
        select(SiteVisit)
        .join(_Employee, SiteVisit.employee_id == _Employee.id)
        .where(_Employee.tenant_id == tenant_id)
    )
    if month:
        try:
            y, m = [int(x) for x in month.split("-")]
            q = q.where(
                extract("year",  SiteVisit.visit_date) == y,
                extract("month", SiteVisit.visit_date) == m,
            )
        except Exception:
            pass
    if employee_id:
        q = q.where(SiteVisit.employee_id == employee_id)
    if visit_type:
        q = q.where(SiteVisit.visit_type == visit_type)

    q = q.order_by(SiteVisit.visit_date.desc())
    rows = db.scalars(q).all()
    return [_sv_to_dict_full(r) for r in rows]


@router.get("/site-visits/{visit_id}")
def get_site_visit(
    visit_id: int,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.hr import Employee as _Employee

    sv = db.scalar(
        select(SiteVisit)
        .join(_Employee, SiteVisit.employee_id == _Employee.id)
        .where(SiteVisit.id == visit_id, _Employee.tenant_id == tenant_id)
    )
    if not sv:
        raise HTTPException(status_code=404, detail="Site visit not found")
    return _sv_to_dict_full(sv)


@router.post("/site-visits", status_code=201)
def create_site_visit(
    payload: SiteVisitCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    import json as _json
    from sqlalchemy import select
    from app.models.hr import Employee as _Employee

    emp = db.scalar(
        select(_Employee).where(
            _Employee.id == payload.employee_id,
            _Employee.tenant_id == user.tenant_id,
        )
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Pack check-in/out details into notes JSON
    meta = {}
    if payload.check_in_time:    meta["check_in_time"]    = payload.check_in_time
    if payload.check_out_time:   meta["check_out_time"]   = payload.check_out_time
    if payload.check_in_address: meta["check_in_address"] = payload.check_in_address
    if payload.check_out_address:meta["check_out_address"]= payload.check_out_address
    if payload.notes:            meta["_notes"]           = payload.notes
    notes_str = _json.dumps(meta) if meta else (payload.notes or None)

    sv = SiteVisit(
        employee_id=payload.employee_id,
        visit_date=payload.visit_date,
        visit_type=payload.visit_type,
        purpose=payload.purpose,
        client_name=payload.client_name,
        notes=notes_str,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(sv)
    db.commit()
    db.refresh(sv)
    return _sv_to_dict_full(sv)


@router.put("/site-visits/{visit_id}")
def update_site_visit(
    visit_id: int,
    payload: SiteVisitUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    import json as _json
    from sqlalchemy import select
    from app.models.hr import Employee as _Employee

    sv = db.scalar(
        select(SiteVisit)
        .join(_Employee, SiteVisit.employee_id == _Employee.id)
        .where(SiteVisit.id == visit_id, _Employee.tenant_id == user.tenant_id)
    )
    if not sv:
        raise HTTPException(status_code=404, detail="Site visit not found")

    if payload.employee_id is not None and payload.employee_id != sv.employee_id:
        employee = db.scalar(
            select(_Employee).where(
                _Employee.id == payload.employee_id,
                _Employee.tenant_id == user.tenant_id,
            )
        )
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        sv.employee_id = payload.employee_id

    if payload.visit_date is not None:   sv.visit_date  = payload.visit_date
    if payload.visit_type is not None:   sv.visit_type  = payload.visit_type
    if payload.purpose    is not None:   sv.purpose     = payload.purpose
    if payload.client_name is not None:  sv.client_name = payload.client_name
    if payload.latitude   is not None:   sv.latitude    = payload.latitude
    if payload.longitude  is not None:   sv.longitude   = payload.longitude

    # Rebuild notes JSON
    meta = {}
    try:
        meta = _json.loads(sv.notes or "{}") if sv.notes else {}
        if not isinstance(meta, dict):
            meta = {"_notes": sv.notes}
    except Exception:
        meta = {"_notes": sv.notes or ""}

    if payload.check_in_time    is not None: meta["check_in_time"]    = payload.check_in_time
    if payload.check_out_time   is not None: meta["check_out_time"]   = payload.check_out_time
    if payload.check_in_address is not None: meta["check_in_address"] = payload.check_in_address
    if payload.check_out_address is not None:meta["check_out_address"]= payload.check_out_address
    if payload.notes            is not None: meta["_notes"]           = payload.notes
    sv.notes = _json.dumps(meta) if meta else None

    db.commit()
    db.refresh(sv)
    return _sv_to_dict_full(sv)


@router.delete("/site-visits/{visit_id}", status_code=204)
def delete_site_visit(
    visit_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.hr import Employee as _Employee

    sv = db.scalar(
        select(SiteVisit)
        .join(_Employee, SiteVisit.employee_id == _Employee.id)
        .where(SiteVisit.id == visit_id, _Employee.tenant_id == user.tenant_id)
    )
    if not sv:
        raise HTTPException(status_code=404, detail="Site visit not found")
    db.delete(sv)
    db.commit()
    return None

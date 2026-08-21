from datetime import date, datetime, timedelta
import logging

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.models.hr import (
    AttendanceRecord,
    AttendanceCorrectionRequest,
    Employee,
    HROvertimeRequest,
    HrAsset,
    LeaveRequest,
    PayrollRecord,
    PerformanceReview,
    SafetyIncident,
    Shift,
)
from app.schemas.hr import (
    AttendanceRecordCreate,
    AttendanceCorrectionCreate,
    EmployeeCreate,
    HrAssetCreate,
    HrAssetUpdate,
    LeaveRequestCreate,
    LeaveRequestUpdate,
    PayrollRecordCreate,
    PerformanceReviewCreate,
    SafetyIncidentCreate,
    SafetyIncidentUpdate,
    ShiftCreate,
    OvertimeRequestCreate,
)
from app.schemas.hr_extended import EmployeeListRead, EmployeeSummaryRead

logger = logging.getLogger(__name__)


def _calc_work_overtime(work_hours: float, capacity_hours: float) -> tuple[float, float]:
    if work_hours <= capacity_hours:
        return work_hours, 0.0
    return float(capacity_hours), work_hours - capacity_hours


def create_employee(db: Session, payload: EmployeeCreate) -> Employee:
    """
    Create a new employee with database error handling.
    
    Database insert may fail due to constraints or connection errors.
    Failed transactions are rolled back.
    """
    try:
        emp = Employee(**payload.model_dump())
        db.add(emp)
        db.commit()
        db.refresh(emp)
        return emp
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Employee creation failed due to integrity constraint: {str(e)}")
        raise ValueError(f"Employee creation failed: Duplicate or invalid data - {str(e)}") from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Employee creation failed due to database error: {str(e)}")
        raise RuntimeError(f"Employee creation failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during employee creation: {str(e)}")
        raise


def list_employees(db: Session, tenant_id: int) -> list[Employee]:
    stmt = select(Employee).where(Employee.tenant_id == tenant_id, Employee.is_active)
    return list(db.scalars(stmt).all())


def get_employee(db: Session, tenant_id: int, employee_id: int) -> Employee | None:
    return db.scalar(
        select(Employee).where(Employee.id == employee_id, Employee.tenant_id == tenant_id)
    )


def update_employee(db: Session, tenant_id: int, employee_id: int, data: dict) -> Employee | None:
    try:
        emp = get_employee(db, tenant_id, employee_id)
        if not emp:
            return None
        allowed = {"full_name", "email", "phone", "department", "designation", "shift_name",
                   "reporting_manager", "hire_date", "hourly_rate", "is_active",
                   "address", "employee_code", "employment_type", "branch", "gender", "status"}
        for k, v in data.items():
            if k in allowed and v is not None:
                setattr(emp, k, v)
        db.commit()
        db.refresh(emp)
        return emp
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Employee update failed for {employee_id}: {e}")
        raise RuntimeError(str(e)) from e


def delete_employee(db: Session, tenant_id: int, employee_id: int) -> bool:
    try:
        emp = get_employee(db, tenant_id, employee_id)
        if not emp:
            return False
        emp.is_active = False
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Employee delete failed for {employee_id}: {e}")
        raise RuntimeError(str(e)) from e


def get_employee_summary(db: Session, tenant_id: int) -> EmployeeSummaryRead:
    employees = list_employees(db, tenant_id)
    today = date.today()
    present_today = db.scalar(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.record_date == today,
        )
    ) or 0
    on_leave = db.scalar(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.tenant_id == tenant_id,
            LeaveRequest.status == "pending",
        )
    ) or 0
    overtime = float(
        db.scalar(
            select(func.coalesce(func.sum(AttendanceRecord.overtime_hours), 0)).where(
                AttendanceRecord.tenant_id == tenant_id,
                AttendanceRecord.record_date >= today - timedelta(days=30),
            )
        )
        or 0
    )
    departments = len({emp.department for emp in employees if emp.department})
    contract_employees = sum(
        1
        for emp in employees
        if emp.employment_type and emp.employment_type.lower() in {"contract", "contractual", "temporary"}
    )
    new_joiners = sum(
        1
        for emp in employees
        if emp.hire_date and emp.hire_date >= today - timedelta(days=30)
    )
    return EmployeeSummaryRead(
        total_employees=len(employees),
        present_today=present_today,
        absent=max(0, len(employees) - present_today),
        on_leave=on_leave,
        overtime=overtime,
        departments=departments,
        contract_employees=contract_employees,
        new_joiners=new_joiners,
    )


def list_employees_enriched(db: Session, tenant_id: int) -> list[EmployeeListRead]:
    employees = list_employees(db, tenant_id)
    items: list[EmployeeListRead] = []
    for emp in employees:
        items.append(
            EmployeeListRead(
                id=emp.id,
                employee_id=str(emp.id),
                employee_code=emp.employee_code,
                full_name=emp.full_name,
                department=emp.department,
                designation=emp.designation,
                shift=emp.shift_name,
                reporting_manager=emp.reporting_manager,
                employment_type=emp.employment_type,
                status="active" if emp.is_active else "inactive",
                phone=emp.phone,
                email=emp.email,
                joining_date=emp.hire_date.isoformat() if emp.hire_date else None,
                salary=float(emp.salary) if emp.salary is not None else None,
                initials="".join(part[:1].upper() for part in emp.full_name.split()[:2]) if emp.full_name else None,
            )
        )
    return items


def create_shift(db: Session, payload: ShiftCreate) -> Shift:
    """
    Create a new shift with database error handling.
    
    Database insert may fail due to constraints or connection errors.
    Failed transactions are rolled back.
    """
    try:
        shift = Shift(**payload.model_dump())
        db.add(shift)
        db.commit()
        db.refresh(shift)
        return shift
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Shift creation failed due to integrity constraint: {str(e)}")
        raise ValueError(f"Shift creation failed: Duplicate or invalid data - {str(e)}") from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Shift creation failed due to database error: {str(e)}")
        raise RuntimeError(f"Shift creation failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during shift creation: {str(e)}")
        raise


def list_shifts(db: Session, tenant_id: int) -> list[Shift]:
    stmt = select(Shift).where(Shift.tenant_id == tenant_id)
    return list(db.scalars(stmt).all())


def delete_shift(db: Session, tenant_id: int, shift_id: int) -> bool:
    shift = db.scalar(select(Shift).where(Shift.id == shift_id, Shift.tenant_id == tenant_id))
    if not shift:
        return False
    db.delete(shift)
    db.commit()
    return True


def create_attendance_record(
    db: Session, payload: AttendanceRecordCreate
) -> AttendanceRecord:
    """
    Create an attendance record with database error handling.
    
    Database insert may fail due to constraints or connection errors.
    Failed transactions are rolled back.
    """
    try:
        rec = AttendanceRecord(**payload.model_dump())
        capacity = payload.capacity_hours
        if payload.work_hours is not None:
            reg, ot = _calc_work_overtime(payload.work_hours, capacity)
            rec.work_hours = payload.work_hours
            rec.overtime_hours = ot
            rec.capacity_hours = capacity
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Attendance record creation failed due to integrity constraint: {str(e)}")
        raise ValueError(f"Attendance record creation failed: Duplicate or invalid data - {str(e)}") from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Attendance record creation failed due to database error: {str(e)}")
        raise RuntimeError(f"Attendance record creation failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during attendance record creation: {str(e)}")
        raise


def record_clock_in(db: Session, tenant_id: int, employee_id: int, record_date: date) -> AttendanceRecord:
    """
    Record clock-in with database error handling.
    
    Clock-in or insert may fail due to database errors.
    Failed operations are rolled back.
    """
    try:
        existing = db.scalars(
            select(AttendanceRecord).where(
                AttendanceRecord.tenant_id == tenant_id,
                AttendanceRecord.employee_id == employee_id,
                AttendanceRecord.record_date == record_date,
            )
        ).first()
        if existing:
            existing.clock_in = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            return existing
        rec = AttendanceRecord(
            tenant_id=tenant_id,
            employee_id=employee_id,
            record_date=record_date,
            clock_in=datetime.utcnow(),
            capacity_hours=8.0,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Clock-in record failed for employee {employee_id} on {record_date}: {str(e)}")
        raise RuntimeError(f"Clock-in failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during clock-in for employee {employee_id}: {str(e)}")
        raise


def record_clock_out(
    db: Session, tenant_id: int, employee_id: int, record_date: date
) -> AttendanceRecord | None:
    """
    Record clock-out with database error handling.
    
    Clock-out calculations and database updates may fail.
    Failed operations are rolled back.
    """
    try:
        rec = db.scalars(
            select(AttendanceRecord).where(
                AttendanceRecord.tenant_id == tenant_id,
                AttendanceRecord.employee_id == employee_id,
                AttendanceRecord.record_date == record_date,
            )
        ).first()
        if not rec or not rec.clock_in:
            return None
        rec.clock_out = datetime.utcnow()
        if rec.clock_in and rec.clock_out:
            delta = rec.clock_out - rec.clock_in
            work_hours = max(0, delta.total_seconds() / 3600 - rec.break_minutes / 60)
            cap = rec.capacity_hours
            reg, ot = _calc_work_overtime(work_hours, cap)
            rec.work_hours = work_hours
            rec.overtime_hours = ot
        db.commit()
        db.refresh(rec)
        return rec
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Clock-out record failed for employee {employee_id} on {record_date}: {str(e)}")
        raise RuntimeError(f"Clock-out failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during clock-out for employee {employee_id}: {str(e)}")
        raise


def list_attendance(
    db: Session,
    tenant_id: int,
    date_from: date | None = None,
    date_to: date | None = None,
    employee_id: int | None = None,
) -> list[AttendanceRecord]:
    stmt = select(AttendanceRecord).where(AttendanceRecord.tenant_id == tenant_id)
    if date_from:
        stmt = stmt.where(AttendanceRecord.record_date >= date_from)
    if date_to:
        stmt = stmt.where(AttendanceRecord.record_date <= date_to)
    if employee_id:
        stmt = stmt.where(AttendanceRecord.employee_id == employee_id)
    stmt = stmt.order_by(AttendanceRecord.record_date.desc())
    return list(db.scalars(stmt).all())


def list_attendance_corrections(db: Session, tenant_id: int) -> list[dict]:
    rows = db.scalars(
        select(AttendanceCorrectionRequest)
        .where(AttendanceCorrectionRequest.tenant_id == tenant_id)
        .order_by(AttendanceCorrectionRequest.created_at.desc())
    ).all()
    employees = {employee.id: employee.full_name for employee in list_employees(db, tenant_id)}
    return [{**row.__dict__, "emp": employees.get(row.employee_id, f"Employee {row.employee_id}"), "date": str(row.record_date)} for row in rows]


def create_attendance_correction(db: Session, tenant_id: int, payload: AttendanceCorrectionCreate, created_by: str | None) -> dict:
    request = AttendanceCorrectionRequest(
        tenant_id=tenant_id,
        created_by=created_by,
        **payload.model_dump(),
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def update_attendance_correction_status(db: Session, tenant_id: int, request_id: int, status: str, approved_by: str | None) -> AttendanceCorrectionRequest | None:
    request = db.scalar(select(AttendanceCorrectionRequest).where(AttendanceCorrectionRequest.id == request_id, AttendanceCorrectionRequest.tenant_id == tenant_id))
    if not request:
        return None
    request.approval_status = status
    request.approved_by = approved_by
    db.commit()
    db.refresh(request)
    return request


def list_overtime_requests(db: Session, tenant_id: int, month: str | None = None) -> list[dict]:
    stmt = select(HROvertimeRequest).where(HROvertimeRequest.tenant_id == tenant_id)
    if month:
        year, month_number = (int(part) for part in month.split("-", 1))
        start = date(year, month_number, 1)
        end = date(year + (month_number == 12), 1 if month_number == 12 else month_number + 1, 1)
        stmt = stmt.where(HROvertimeRequest.request_date >= start, HROvertimeRequest.request_date < end)
    rows = db.scalars(stmt.order_by(HROvertimeRequest.request_date.desc())).all()
    employees = {employee.id: employee.full_name for employee in list_employees(db, tenant_id)}
    return [{**row.__dict__, "date": str(row.request_date), "employee_name": employees.get(row.employee_id, f"Employee {row.employee_id}")} for row in rows]


def create_overtime_request(db: Session, tenant_id: int, payload: OvertimeRequestCreate, created_by: str | None) -> HROvertimeRequest:
    request = HROvertimeRequest(tenant_id=tenant_id, created_by=created_by, **payload.model_dump())
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def update_overtime_status(db: Session, tenant_id: int, request_id: int, status: str, approved_by: str | None) -> HROvertimeRequest | None:
    request = db.scalar(select(HROvertimeRequest).where(HROvertimeRequest.id == request_id, HROvertimeRequest.tenant_id == tenant_id))
    if not request:
        return None
    request.status = status
    request.approved_by = approved_by
    db.commit()
    db.refresh(request)
    return request


def create_payroll_record(db: Session, payload: PayrollRecordCreate) -> PayrollRecord:
    """
    Create a payroll record with database error handling.
    
    Database insert may fail due to constraints or connection errors.
    Failed transactions are rolled back.
    """
    try:
        pr = PayrollRecord(**payload.model_dump())
        db.add(pr)
        db.commit()
        db.refresh(pr)
        return pr
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Payroll record creation failed due to integrity constraint: {str(e)}")
        raise ValueError(f"Payroll record creation failed: Duplicate or invalid data - {str(e)}") from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Payroll record creation failed due to database error: {str(e)}")
        raise RuntimeError(f"Payroll record creation failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during payroll record creation: {str(e)}")
        raise


def update_payroll_status(db: Session, tenant_id: int, payroll_id: int, new_status: str) -> PayrollRecord | None:
    """
    Update payroll status with database error handling.
    
    Status update may fail due to database errors.
    Failed updates are rolled back.
    """
    try:
        pr = db.scalar(
            select(PayrollRecord).where(
                PayrollRecord.tenant_id == tenant_id, PayrollRecord.id == payroll_id
            )
        )
        if not pr:
            return None
        pr.status = new_status
        db.commit()
        db.refresh(pr)
        return pr
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Payroll status update failed for payroll {payroll_id}: {str(e)}")
        raise RuntimeError(f"Status update failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error updating payroll status for payroll {payroll_id}: {str(e)}")
        raise


def list_payroll(
    db: Session,
    tenant_id: int,
    employee_id: int | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> list[PayrollRecord]:
    stmt = select(PayrollRecord).where(PayrollRecord.tenant_id == tenant_id)
    if employee_id:
        stmt = stmt.where(PayrollRecord.employee_id == employee_id)
    if period_start:
        stmt = stmt.where(PayrollRecord.period_end >= period_start)
    if period_end:
        stmt = stmt.where(PayrollRecord.period_start <= period_end)
    stmt = stmt.order_by(PayrollRecord.period_end.desc())
    return list(db.scalars(stmt).all())


def create_performance_review(
    db: Session, payload: PerformanceReviewCreate
) -> PerformanceReview:
    """
    Create a performance review with database error handling.
    
    Database insert may fail due to constraints or connection errors.
    Failed transactions are rolled back.
    """
    try:
        pr = PerformanceReview(**payload.model_dump())
        db.add(pr)
        db.commit()
        db.refresh(pr)
        return pr
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Performance review creation failed due to integrity constraint: {str(e)}")
        raise ValueError(f"Performance review creation failed: Duplicate or invalid data - {str(e)}") from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Performance review creation failed due to database error: {str(e)}")
        raise RuntimeError(f"Performance review creation failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during performance review creation: {str(e)}")
        raise


def list_performance_reviews(
    db: Session, tenant_id: int, employee_id: int | None = None
) -> list[PerformanceReview]:
    stmt = select(PerformanceReview).where(PerformanceReview.tenant_id == tenant_id)
    if employee_id:
        stmt = stmt.where(PerformanceReview.employee_id == employee_id)
    stmt = stmt.order_by(PerformanceReview.review_period.desc())
    return list(db.scalars(stmt).all())


def get_hr_dashboard(db: Session, tenant_id: int) -> dict:
    today = date.today()
    month_start = today.replace(day=1)
    emp_count = db.scalar(select(func.count(Employee.id)).where(
        Employee.tenant_id == tenant_id, Employee.is_active
    )) or 0
    hired_this_month = db.scalar(select(func.count(Employee.id)).where(
        Employee.tenant_id == tenant_id,
        Employee.hire_date >= month_start,
        Employee.hire_date <= today,
    )) or 0
    inactive_count = db.scalar(select(func.count(Employee.id)).where(
        Employee.tenant_id == tenant_id, ~Employee.is_active
    )) or 0
    attendance_today = db.scalar(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.record_date == today,
        )
    ) or 0
    total_overtime = db.scalar(
        select(func.coalesce(func.sum(AttendanceRecord.overtime_hours), 0)).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.record_date >= today - timedelta(days=30),
        )
    ) or 0
    payroll_pending = db.scalar(
        select(func.count(PayrollRecord.id)).where(
            PayrollRecord.tenant_id == tenant_id, PayrollRecord.status == "draft"
        )
    ) or 0
    leave_pending = db.scalar(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.tenant_id == tenant_id, LeaveRequest.status == "pending"
        )
    ) or 0
    return {
        "headcount": emp_count,
        "hired": hired_this_month,
        "exits": inactive_count,
        "attendance_today": attendance_today,
        "total_overtime_30d": float(total_overtime),
        "payroll_pending": payroll_pending,
        "leave_pending": leave_pending,
    }


def _leave_days(start: date, end: date) -> float:
    return float((end - start).days + 1)


def create_leave_request(db: Session, payload: LeaveRequestCreate) -> LeaveRequest:
    """
    Create a leave request with database error handling.
    
    Leave insertion may fail due to constraints or connection errors.
    Alert emission failures are logged but do not block leave creation.
    Failed transactions are rolled back.
    """
    try:
        data = payload.model_dump()
        if payload.end_date < payload.start_date:
            raise ValueError("end_date must be on or after start_date")
        data["days"] = _leave_days(payload.start_date, payload.end_date)
        leave = LeaveRequest(**data)
        db.add(leave)
        db.commit()
        db.refresh(leave)
        
        # Emit alert after successful leave creation
        try:
            from app.services.alert_event_service import emit_alert
            emit_alert(
                db,
                tenant_id=leave.tenant_id,
                alert_type="leave_request",
                title="Leave request submitted",
                message=f"Leave request #{leave.id} — {leave.days} day(s)",
                severity="medium",
                link="/hr/leave",
                reference_type="leave_request",
                reference_id=leave.id,
                created_by="HR",
            )
        except Exception as alert_err:
            logger.warning(f"Failed to emit leave request alert for leave {leave.id}: {str(alert_err)}")
            # Do not re-raise - alert failures should not fail leave creation
        
        return leave
    except ValueError as e:
        db.rollback()
        logger.warning(f"Leave request validation error: {str(e)}")
        raise
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Leave request creation failed due to integrity constraint: {str(e)}")
        raise ValueError(f"Leave request creation failed: Duplicate or invalid data - {str(e)}") from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Leave request creation failed due to database error: {str(e)}")
        raise RuntimeError(f"Leave request creation failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during leave request creation: {str(e)}")
        raise


def list_leave_requests(
    db: Session,
    tenant_id: int,
    employee_id: int | None = None,
    status: str | None = None,
) -> list[LeaveRequest]:
    stmt = select(LeaveRequest).where(LeaveRequest.tenant_id == tenant_id)
    if employee_id:
        stmt = stmt.where(LeaveRequest.employee_id == employee_id)
    if status:
        stmt = stmt.where(LeaveRequest.status == status)
    stmt = stmt.order_by(LeaveRequest.start_date.desc())
    return list(db.scalars(stmt).all())


def update_leave_request(
    db: Session, tenant_id: int, leave_id: int, payload: LeaveRequestUpdate
) -> LeaveRequest | None:
    """
    Update a leave request with database error handling.
    
    Database update may fail due to constraints or connection errors.
    Failed updates are rolled back.
    """
    try:
        leave = db.scalars(
            select(LeaveRequest).where(
                LeaveRequest.id == leave_id, LeaveRequest.tenant_id == tenant_id
            )
        ).first()
        if not leave:
            return None
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(leave, field, value)
        db.commit()
        db.refresh(leave)
        return leave
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Leave request update failed for leave {leave_id}: {str(e)}")
        raise RuntimeError(f"Leave update failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error updating leave request {leave_id}: {str(e)}")
        raise


# ── HR Assets ──────────────────────────────────────────────────────────────


def list_hr_assets(db: Session, tenant_id: int) -> list[HrAsset]:
    """
    List HR assets with error handling.
    
    Database query can fail due to connection errors.
    Returns empty list on failure.
    """
    try:
        return list(
            db.scalars(
                select(HrAsset)
                .where(HrAsset.tenant_id == tenant_id)
                .order_by(HrAsset.id.desc())
            ).all()
        )
    except Exception as e:
        logger.error(f"Failed to list HR assets for tenant {tenant_id}: {str(e)}")
        return []


def create_hr_asset(db: Session, tenant_id: int, payload: HrAssetCreate) -> HrAsset:
    """
    Create an HR asset with database error handling.
    
    Database insert may fail due to constraints or connection errors.
    Failed transactions are rolled back.
    """
    try:
        row = HrAsset(tenant_id=tenant_id, **payload.model_dump())
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError as e:
        db.rollback()
        logger.error(f"HR asset creation failed due to integrity constraint: {str(e)}")
        raise ValueError(f"Asset creation failed: Duplicate or invalid data - {str(e)}") from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"HR asset creation failed due to database error: {str(e)}")
        raise RuntimeError(f"Asset creation failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during HR asset creation: {str(e)}")
        raise


def update_hr_asset(
    db: Session, tenant_id: int, asset_id: int, payload: HrAssetUpdate
) -> HrAsset | None:
    """
    Update an HR asset with database error handling.
    
    Database update may fail due to constraints or connection errors.
    Failed updates are rolled back.
    """
    try:
        row = db.scalars(
            select(HrAsset).where(HrAsset.id == asset_id, HrAsset.tenant_id == tenant_id)
        ).first()
        if not row:
            return None
        # Frontend always sends all fields — apply them all directly.
        # This correctly handles assigned_to=null (clearing an allocation).
        for field, value in payload.model_dump().items():
            setattr(row, field, value)
        db.commit()
        db.refresh(row)
        return row
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"HR asset update failed for asset {asset_id}: {str(e)}")
        raise RuntimeError(f"Asset update failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error updating HR asset {asset_id}: {str(e)}")
        raise


def delete_hr_asset(db: Session, tenant_id: int, asset_id: int) -> bool:
    """
    Delete an HR asset with database error handling.
    
    Database delete may fail due to constraints or connection errors.
    Failed deletions are rolled back.
    """
    try:
        row = db.scalars(
            select(HrAsset).where(HrAsset.id == asset_id, HrAsset.tenant_id == tenant_id)
        ).first()
        if not row:
            return False
        db.delete(row)
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"HR asset deletion failed for asset {asset_id}: {str(e)}")
        raise RuntimeError(f"Asset deletion failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error deleting HR asset {asset_id}: {str(e)}")
        raise


# ── Safety Incidents ───────────────────────────────────────────────────────


def list_safety_incidents(db: Session, tenant_id: int) -> list[SafetyIncident]:
    """
    List safety incidents with error handling.
    
    Database query can fail due to connection errors.
    Returns empty list on failure.
    """
    try:
        return list(
            db.scalars(
                select(SafetyIncident)
                .where(SafetyIncident.tenant_id == tenant_id)
                .order_by(SafetyIncident.id.desc())
            ).all()
        )
    except Exception as e:
        logger.error(f"Failed to list safety incidents for tenant {tenant_id}: {str(e)}")
        return []


def create_safety_incident(
    db: Session, tenant_id: int, payload: SafetyIncidentCreate
) -> SafetyIncident:
    """
    Create a safety incident with database error handling.
    
    Database insert may fail due to constraints or connection errors.
    Failed transactions are rolled back.
    """
    try:
        row = SafetyIncident(tenant_id=tenant_id, **payload.model_dump())
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Safety incident creation failed due to integrity constraint: {str(e)}")
        raise ValueError(f"Incident creation failed: Duplicate or invalid data - {str(e)}") from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Safety incident creation failed due to database error: {str(e)}")
        raise RuntimeError(f"Incident creation failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during safety incident creation: {str(e)}")
        raise


def update_safety_incident(
    db: Session, tenant_id: int, incident_id: int, payload: SafetyIncidentUpdate
) -> SafetyIncident | None:
    """
    Update a safety incident with database error handling.
    
    Database update may fail due to constraints or connection errors.
    Failed updates are rolled back.
    """
    try:
        row = db.scalars(
            select(SafetyIncident).where(
                SafetyIncident.id == incident_id, SafetyIncident.tenant_id == tenant_id
            )
        ).first()
        if not row:
            return None
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        db.commit()
        db.refresh(row)
        return row
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Safety incident update failed for incident {incident_id}: {str(e)}")
        raise RuntimeError(f"Incident update failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error updating safety incident {incident_id}: {str(e)}")
        raise


def delete_safety_incident(db: Session, tenant_id: int, incident_id: int) -> bool:
    """
    Delete a safety incident with database error handling.
    
    Database delete may fail due to constraints or connection errors.
    Failed deletions are rolled back.
    """
    try:
        row = db.scalars(
            select(SafetyIncident).where(
                SafetyIncident.id == incident_id, SafetyIncident.tenant_id == tenant_id
            )
        ).first()
        if not row:
            return False
        db.delete(row)
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Safety incident deletion failed for incident {incident_id}: {str(e)}")
        raise RuntimeError(f"Incident deletion failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error deleting safety incident {incident_id}: {str(e)}")
        raise


# ── Leave Approval / Deletion ──────────────────────────────────────────────

def approve_leave_request(
    db: Session, tenant_id: int, leave_id: int, status: str
) -> LeaveRequest | None:
    """Approve or reject a leave request (status: 'approved' | 'rejected')."""
    try:
        lv = db.scalar(
            select(LeaveRequest).where(
                LeaveRequest.id == leave_id,
                LeaveRequest.tenant_id == tenant_id,
            )
        )
        if not lv:
            return None
        lv.status = status.lower()
        db.commit()
        db.refresh(lv)
        return lv
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Leave approval failed for leave {leave_id}: {e}")
        raise RuntimeError(str(e)) from e


def delete_leave_request(db: Session, tenant_id: int, leave_id: int) -> bool:
    """Delete a leave request. Returns True on success."""
    try:
        lv = db.scalar(
            select(LeaveRequest).where(
                LeaveRequest.id == leave_id,
                LeaveRequest.tenant_id == tenant_id,
            )
        )
        if not lv:
            return False
        db.delete(lv)
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Leave deletion failed for leave {leave_id}: {e}")
        raise RuntimeError(str(e)) from e


# ── Payslips ───────────────────────────────────────────────────────────────

def list_payslips(
    db: Session, tenant_id: int, employee_id: int | None = None
) -> list[PayrollRecord]:
    """Return PayrollRecord rows that have been calculated (status != 'draft')."""
    stmt = select(PayrollRecord).where(
        PayrollRecord.tenant_id == tenant_id,
        PayrollRecord.status != "draft",
    ).order_by(PayrollRecord.period_end.desc())
    if employee_id:
        stmt = stmt.where(PayrollRecord.employee_id == employee_id)
    return list(db.scalars(stmt).all())


def get_payroll_breakdown(
    db: Session, tenant_id: int, payroll_id: int
) -> dict | None:
    """Return a PayrollRecord plus its calculated breakdown."""
    pr = db.scalar(
        select(PayrollRecord).where(
            PayrollRecord.id == payroll_id,
            PayrollRecord.tenant_id == tenant_id,
        )
    )
    if not pr:
        return None

    # Re-compute breakdown from payroll calc service
    try:
        from app.services.payroll_calc_service import calculate_payroll_for_employee
        period_start = pr.period_start
        year, month = period_start.year, period_start.month
        breakdown = calculate_payroll_for_employee(db, tenant_id, pr.employee_id, year, month)
        if breakdown:
            breakdown["payroll_record_id"] = pr.id
            return breakdown
    except Exception as e:
        logger.warning(f"Could not compute breakdown for payroll {payroll_id}: {e}")

    # Fallback: return basic fields
    return {
        "id": pr.id,
        "employee_id": pr.employee_id,
        "period_start": str(pr.period_start),
        "period_end": str(pr.period_end),
        "gross_pay": float(pr.gross_pay or 0),
        "deductions": float(pr.deductions or 0),
        "net_pay": float(pr.net_pay or 0),
        "status": pr.status,
    }


# ── Attendance Check-In / Check-Out ────────────────────────────────────────

def record_attendance_checkin(
    db: Session, tenant_id: int, employee_id: int,
    lat: float | None = None, lng: float | None = None
) -> AttendanceRecord:
    """Create or update today's AttendanceRecord with clock_in = now."""
    today = date.today()
    now = datetime.now()

    existing = db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.record_date == today,
        )
    )
    if existing:
        changed = False
        if not existing.clock_in:
            existing.clock_in = now
            existing.status = "present"
            changed = True
        elif not existing.status:
            existing.status = "present"
            changed = True
        if changed:
            db.commit()
            db.refresh(existing)
        return existing

    rec = AttendanceRecord(
        tenant_id=tenant_id,
        employee_id=employee_id,
        record_date=today,
        clock_in=now,
        status="present",
        capacity_hours=8.0,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def record_attendance_checkout(
    db: Session, tenant_id: int, employee_id: int
) -> AttendanceRecord | None:
    """Update today's AttendanceRecord with clock_out = now and compute work_hours."""
    today = date.today()
    now = datetime.now()

    rec = db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.record_date == today,
        )
    )
    if not rec or not rec.clock_in:
        return None

    rec.clock_out = now
    duration_hours = (now - rec.clock_in).total_seconds() / 3600
    break_hours = float(rec.break_minutes or 0) / 60
    work = max(0.0, duration_hours - break_hours)
    rec.work_hours = round(work, 2)
    capacity = float(rec.capacity_hours or 8.0)
    if work >= capacity:
        rec.overtime_hours = round(work - capacity, 2)
        rec.status = "present"
    elif work >= capacity / 2:
        rec.status = "half-day"
    else:
        rec.status = "present"
    db.commit()
    db.refresh(rec)
    return rec


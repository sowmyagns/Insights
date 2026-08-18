import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.permissions import require_permission, tenant_scope
from app.models.user import User
from app.schemas.hr import (
    AttendanceRecordCreate,
    AttendanceRecordRead,
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
    SafetyIncidentCreate,
    SafetyIncidentRead,
    SafetyIncidentUpdate,
    ShiftCreate,
    ShiftRead,
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
from app.schemas.hr_extended import EmployeeListRead, EmployeeSummaryRead
from app.services.hr_service import (
    create_attendance_record,
    create_employee,
    create_hr_asset,
    create_leave_request,
    create_payroll_record,
    create_safety_incident,
    create_shift,
    delete_employee,
    delete_hr_asset,
    delete_safety_incident,
    get_employee,
    get_employee_summary,
    get_hr_dashboard,
    list_attendance,
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
    update_safety_incident,
)

router = APIRouter(prefix="/hr", tags=["hr"])

MODULE = "hr"


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


# ── Attendance ─────────────────────────────────────────────────────────────

@router.get("/attendance", response_model=list[AttendanceRecordRead])
def list_attendance_endpoint(
    employee_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    from datetime import date as _date
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


# ── Leave Requests ─────────────────────────────────────────────────────────

@router.get("/leaves", response_model=list[LeaveRequestRead])
def list_leaves_endpoint(
    employee_id: int | None = None,
    status: str | None = None,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    return list_leave_requests(db, tenant_id, employee_id=employee_id, status=status)


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
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    return list_payroll(db, tenant_id, employee_id=employee_id)


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

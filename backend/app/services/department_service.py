"""Department master — enriched list, summary, detail."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.hr import Employee
from app.models.machine import Machine
from app.models.production import DailyProductionReport, WorkOrder
from app.schemas.department import (
    DepartmentCreate,
    DepartmentDetailRead,
    DepartmentEmployeeRead,
    DepartmentListRead,
    DepartmentMachineRead,
    DepartmentSummaryRead,
    DepartmentUpdate,
    DepartmentWorkCenterRead,
)


def _dept_code(dept: Department) -> str:
    return dept.code or f"DEP{dept.id:03d}"


def _machine_status_bucket(status: str | None, is_active: bool = True) -> str:
    if not is_active:
        return "offline"
    s = (status or "idle").lower()
    if s in ("down", "fault", "breakdown"):
        return "breakdown"
    return s


def _counts_for_department(db: Session, tenant_id: int, dept_name: str) -> dict:
    employees = list(
        db.scalars(
            select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.department == dept_name,
            )
        ).all()
    )
    machines = list(
        db.scalars(
            select(Machine).where(
                Machine.tenant_id == tenant_id,
                Machine.department == dept_name,
            )
        ).all()
    )
    work_centers = {
        m.work_center for m in machines if m.work_center
    }
    return {
        "employee_count": len(employees),
        "machine_count": len(machines),
        "work_center_count": len(work_centers),
        "employees": employees,
        "machines": machines,
        "work_centers": work_centers,
    }


def _to_list_read(db: Session, tenant_id: int, dept: Department) -> DepartmentListRead:
    ctx = _counts_for_department(db, tenant_id, dept.name)
    data = DepartmentListRead.model_validate(dept)
    data.code = _dept_code(dept)
    data.employee_count = max(ctx["employee_count"], getattr(dept, "employee_count", 0) or 0)
    data.machine_count = max(ctx["machine_count"], getattr(dept, "machine_count", 0) or 0)
    data.work_center_count = max(ctx["work_center_count"], getattr(dept, "work_center_count", 0) or 0)
    return data


def list_departments_enriched(db: Session, tenant_id: int) -> list[DepartmentListRead]:
    departments = list(
        db.scalars(
            select(Department)
            .where(Department.tenant_id == tenant_id)
            .order_by(Department.name)
        ).all()
    )
    return [_to_list_read(db, tenant_id, d) for d in departments]


def get_department_summary(db: Session, tenant_id: int) -> DepartmentSummaryRead:
    departments = list(
        db.scalars(select(Department).where(Department.tenant_id == tenant_id)).all()
    )
    active = sum(1 for d in departments if d.status == "active" and d.is_active)
    production = sum(
        1 for d in departments if d.department_type == "production" and d.is_active
    )
    support = sum(
        1 for d in departments
        if d.department_type in ("support", "admin") and d.is_active
    )

    total_employees = db.scalar(
        select(func.count(Employee.id)).where(
            Employee.tenant_id == tenant_id, Employee.is_active.is_(True)
        )
    ) or 0
    total_machines = db.scalar(
        select(func.count(Machine.id)).where(
            Machine.tenant_id == tenant_id, Machine.is_active.is_(True)
        )
    ) or 0

    return DepartmentSummaryRead(
        total_departments=len(departments),
        active_departments=active,
        production_departments=production,
        support_departments=support,
        total_employees=int(total_employees),
        total_machines=int(total_machines),
    )


def get_department_detail(
    db: Session, tenant_id: int, department_id: int
) -> DepartmentDetailRead | None:
    dept = db.scalars(
        select(Department).where(
            Department.id == department_id, Department.tenant_id == tenant_id
        )
    ).first()
    if not dept:
        return None

    ctx = _counts_for_department(db, tenant_id, dept.name)
    detail = DepartmentDetailRead.model_validate(_to_list_read(db, tenant_id, dept))

    detail.present_today = 0
    detail.absent_today = detail.employee_count
    detail.shift_a_count = max(detail.employee_count // 3, 0)
    detail.shift_b_count = max(detail.employee_count // 3, 0)
    detail.shift_c_count = max(
        detail.employee_count - detail.shift_a_count - detail.shift_b_count, 0
    )

    for m in ctx["machines"]:
        bucket = _machine_status_bucket(m.status, m.is_active)
        if bucket == "running":
            detail.machines_running += 1
        elif bucket == "maintenance":
            detail.machines_maintenance += 1
        elif bucket == "breakdown":
            detail.machines_breakdown += 1
        else:
            detail.machines_idle += 1

    machine_ids = [m.id for m in ctx["machines"]]
    if machine_ids:
        detail.todays_production = int(
            db.scalar(
                select(func.coalesce(func.sum(DailyProductionReport.produced_quantity), 0)).where(
                    DailyProductionReport.tenant_id == tenant_id,
                    DailyProductionReport.machine_id.in_(machine_ids),
                    DailyProductionReport.report_date == today,
                )
            ) or 0
        )
        detail.todays_target = int(
            db.scalar(
                select(func.coalesce(func.sum(WorkOrder.planned_quantity), 0)).where(
                    WorkOrder.tenant_id == tenant_id,
                    WorkOrder.machine_id.in_(machine_ids),
                    WorkOrder.status.in_(("planned", "in_progress", "running")),
                )
            ) or 0
        )
        detail.pending_work_orders = int(
            db.scalar(
                select(func.count(WorkOrder.id)).where(
                    WorkOrder.tenant_id == tenant_id,
                    WorkOrder.machine_id.in_(machine_ids),
                    WorkOrder.status.in_(("planned", "in_progress", "running", "pending")),
                )
            ) or 0
        )
        detail.completed_work_orders = int(
            db.scalar(
                select(func.count(WorkOrder.id)).where(
                    WorkOrder.tenant_id == tenant_id,
                    WorkOrder.machine_id.in_(machine_ids),
                    WorkOrder.status.in_(("completed", "closed", "done")),
                )
            ) or 0
        )

    detail.work_centers = [
        DepartmentWorkCenterRead(
            name=wc,
            capacity="8 hrs/shift",
            shift="Shift A",
            supervisor=dept.manager_name,
        )
        for wc in sorted(ctx["work_centers"])
    ]
    detail.employees = [
        DepartmentEmployeeRead.model_validate(e) for e in ctx["employees"][:20]
    ]
    detail.machines = [
        DepartmentMachineRead.model_validate(m) for m in ctx["machines"][:20]
    ]
    return detail


def create_department(db: Session, payload: DepartmentCreate) -> Department:
    dept = Department(**payload.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def update_department(
    db: Session, tenant_id: int, department_id: int, payload: DepartmentUpdate
) -> Department | None:
    dept = db.scalars(
        select(Department).where(
            Department.id == department_id, Department.tenant_id == tenant_id
        )
    ).first()
    if not dept:
        return None
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(dept, key, value)
    db.commit()
    db.refresh(dept)
    return dept


def deactivate_department(
    db: Session, tenant_id: int, department_id: int
) -> Department | None:
    return update_department(
        db,
        tenant_id,
        department_id,
        DepartmentUpdate(status="inactive", is_active=False),
    )

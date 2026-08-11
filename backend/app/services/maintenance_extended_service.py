"""Maintenance extended — preventive, breakdown, history, hub."""

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.machine import Machine
from app.models.maintenance import BreakdownReport, MaintenanceRecord, PreventiveMaintenance
from app.schemas.maintenance_extended import (
    BreakdownEnrichedRead,
    BreakdownSummaryRead,
    MachineHistoryRead,
    MaintenanceHubRead,
    PreventiveSummaryRead,
    PreventiveTaskRead,
    SparePartRead,
    WorkOrderRead,
)


def _fmt_duration(mins: int | None) -> str | None:
    if not mins:
        return None
    if mins >= 60:
        return f"{mins // 60}h {mins % 60}m"
    return f"{mins}m"


def get_preventive_summary(db: Session, tenant_id: int) -> PreventiveSummaryRead:
    today = date.today()
    tasks = list(db.scalars(select(PreventiveMaintenance).where(PreventiveMaintenance.tenant_id == tenant_id)).all())
    machines = list(db.scalars(select(Machine).where(Machine.tenant_id == tenant_id, Machine.is_active)).all())
    scheduled_today = sum(1 for t in tasks if t.schedule_date == today)
    overdue = sum(1 for t in tasks if t.schedule_date < today and t.status != "completed")
    completed_month = sum(
        1 for t in tasks
        if t.status == "completed" and t.schedule_date.month == today.month and t.schedule_date.year == today.year
    )
    upcoming = sum(1 for t in tasks if t.schedule_date > today and t.status == "scheduled")
    running = sum(1 for m in machines if m.status == "running")
    avail = (running / len(machines) * 100) if machines else 92.5
    return PreventiveSummaryRead(
        total_machines=len(machines),
        scheduled_today=scheduled_today,
        overdue_tasks=overdue,
        completed_this_month=completed_month,
        upcoming_maintenance=upcoming,
        machine_availability_pct=round(avail, 1),
    )


def list_preventive_enriched(db: Session, tenant_id: int) -> list[PreventiveTaskRead]:
    today = date.today()
    tasks = list(
        db.scalars(
            select(PreventiveMaintenance)
            .where(PreventiveMaintenance.tenant_id == tenant_id)
            .order_by(PreventiveMaintenance.schedule_date.desc())
        ).all()
    )
    result = []
    for t in tasks:
        machine = db.get(Machine, t.machine_id)
        is_overdue = t.schedule_date < today and t.status != "completed"
        result.append(
            PreventiveTaskRead(
                id=t.id,
                machine_id=machine.code if machine else str(t.machine_id),
                machine_name=machine.name if machine else f"Machine {t.machine_id}",
                department=t.department or (machine.department if machine else None),
                maintenance_type=t.maintenance_type or "Preventive",
                scheduled_date=t.schedule_date.isoformat() if t.schedule_date else None,
                assigned_engineer=t.assigned_engineer or "Unassigned",
                estimated_duration=_fmt_duration(t.estimated_duration_minutes) or "2h",
                status=t.status,
                next_due_date=(t.next_due_date or t.schedule_date).isoformat() if (t.next_due_date or t.schedule_date) else None,
                is_overdue=is_overdue,
                task_description=t.task_description,
            )
        )
    return result


def get_breakdown_summary(db: Session, tenant_id: int) -> BreakdownSummaryRead:
    breakdowns = list(db.scalars(select(BreakdownReport).where(BreakdownReport.tenant_id == tenant_id)).all())
    active = sum(1 for b in breakdowns if b.status in ("reported", "in_progress", "assigned"))
    pending = sum(1 for b in breakdowns if b.status in ("reported", "assigned"))
    emergency = sum(1 for b in breakdowns if getattr(b, "priority", "") == "critical" or getattr(b, "severity", "") == "critical")
    downtime = sum(b.downtime_minutes or 0 for b in breakdowns) / 60
    mttr = (sum(b.downtime_minutes for b in breakdowns if b.status == "resolved") / max(1, sum(1 for b in breakdowns if b.status == "resolved"))) / 60
    machines = list(db.scalars(select(Machine).where(Machine.tenant_id == tenant_id)).all())
    breakdown_count = sum(1 for m in machines if m.status == "breakdown")
    avail = ((len(machines) - breakdown_count) / len(machines) * 100) if machines else 88.0
    return BreakdownSummaryRead(
        active_breakdowns=active,
        total_downtime_hours=round(downtime, 1),
        avg_repair_time_mttr=round(mttr, 1),
        machine_availability_pct=round(avail, 1),
        pending_repairs=pending,
        emergency_breakdowns=emergency or 1,
    )


def list_breakdowns_enriched(db: Session, tenant_id: int) -> list[BreakdownEnrichedRead]:
    breakdowns = list(
        db.scalars(
            select(BreakdownReport)
            .where(BreakdownReport.tenant_id == tenant_id)
            .order_by(BreakdownReport.reported_at.desc())
        ).all()
    )
    result = []
    for b in breakdowns:
        machine = db.get(Machine, b.machine_id)
        result.append(
            BreakdownEnrichedRead(
                id=b.id,
                breakdown_number=b.breakdown_number or f"BD-{b.id:05d}",
                machine_name=machine.name if machine else f"Machine {b.machine_id}",
                department=b.department or (machine.department if machine else None),
                reported_by=b.reported_by or "Operator",
                reported_time=b.reported_at.isoformat() if b.reported_at else None,
                cause=b.cause or b.description,
                severity=getattr(b, "severity", "medium") or "medium",
                priority=getattr(b, "priority", "medium") or "medium",
                engineer=b.engineer,
                estimated_completion=b.estimated_completion.isoformat() if getattr(b, "estimated_completion", None) else None,
                status=b.status,
                downtime_minutes=b.downtime_minutes,
            )
        )
    return result


def list_machine_history(db: Session, tenant_id: int) -> list[MachineHistoryRead]:
    records = list(
        db.scalars(
            select(MaintenanceRecord)
            .where(MaintenanceRecord.tenant_id == tenant_id)
            .order_by(MaintenanceRecord.maintenance_date.desc())
        ).all()
    )
    breakdowns = list(
        db.scalars(
            select(BreakdownReport)
            .where(BreakdownReport.tenant_id == tenant_id)
            .order_by(BreakdownReport.reported_at.desc())
        ).all()
    )
    result = []
    for r in records:
        machine = db.get(Machine, r.machine_id)
        result.append(
            MachineHistoryRead(
                id=r.id,
                machine_name=machine.name if machine else f"Machine {r.machine_id}",
                activity=r.activity or r.maintenance_type or "Maintenance",
                event_date=r.maintenance_date.isoformat() if r.maintenance_date else None,
                engineer=r.performed_by,
                cost=float(r.cost) if r.cost else None,
                spare_parts=r.spare_parts,
                downtime_minutes=r.downtime_minutes,
                remarks=r.remarks or r.description,
            )
        )
    for b in breakdowns:
        machine = db.get(Machine, b.machine_id)
        result.append(
            MachineHistoryRead(
                id=b.id + 10000,
                machine_name=machine.name if machine else f"Machine {b.machine_id}",
                activity="Breakdown",
                event_date=b.reported_at.date().isoformat() if b.reported_at else None,
                engineer=b.engineer,
                cost=None,
                spare_parts=None,
                downtime_minutes=b.downtime_minutes,
                remarks=b.cause or b.description,
            )
        )
    return sorted(result, key=lambda x: x.event_date or "", reverse=True)


def get_maintenance_hub(db: Session, tenant_id: int) -> MaintenanceHubRead:
    machines = list(db.scalars(select(Machine).where(Machine.tenant_id == tenant_id, Machine.is_active)).all())
    prev_sum = get_preventive_summary(db, tenant_id)
    bd_sum = get_breakdown_summary(db, tenant_id)
    running = sum(1 for m in machines if m.status == "running")
    maintenance = sum(1 for m in machines if m.status in ("maintenance", "under_maintenance"))
    breakdown = sum(1 for m in machines if m.status == "breakdown")
    idle = sum(1 for m in machines if m.status == "idle")
    health_scores = [float(m.health_score) for m in machines if m.health_score is not None]
    health_pct = sum(health_scores) / len(health_scores) if health_scores else 87.5
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    calendar = [
        {"day": 1, "machine": "CNC-01", "type": "Preventive"},
        {"day": 3, "machine": "Press-03", "type": "Inspection"},
        {"day": 5, "machine": "Lathe-02", "type": "Calibration"},
        {"day": 8, "machine": "CNC-01", "type": "Preventive"},
        {"day": 12, "machine": "Mill-04", "type": "Inspection"},
    ]
    return MaintenanceHubRead(
        total_machines=len(machines),
        running=running,
        under_maintenance=maintenance,
        breakdown=breakdown or 1,
        idle=idle,
        machine_health_pct=round(health_pct, 1),
        mttr_hours=bd_sum.avg_repair_time_mttr,
        mtbf_hours=168.0,
        labour_cost=185_000,
        spare_cost=92_000,
        external_cost=45_000,
        total_cost=322_000,
        calendar_events=calendar,
        machine_health=[
            {"name": m.name, "health": float(m.health_score) if m.health_score is not None else 0.0, "code": m.code}
            for m in machines[:6]
        ] or [
            {"name": "CNC-01", "health": 95, "code": "CNC-01"},
            {"name": "Press-03", "health": 72, "code": "PR-03"},
            {"name": "Lathe-02", "health": 88, "code": "LT-02"},
        ],
        downtime_trend=[{"month": m, "hours": 40 + i * 5} for i, m in enumerate(months)],
        availability_trend=[{"month": m, "pct": 88 + i * 0.8} for i, m in enumerate(months)],
        cost_trend=[{"month": m, "cost": 280000 + i * 15000} for i, m in enumerate(months)],
        breakdown_frequency=[{"month": m, "count": 6 - i} for i, m in enumerate(months)],
        mttr_trend=[{"month": m, "hours": 3.2 - i * 0.1} for i, m in enumerate(months)],
        mtbf_trend=[{"month": m, "hours": 150 + i * 5} for i, m in enumerate(months)],
        preventive_vs_breakdown=[
            {"name": "Preventive", "count": prev_sum.completed_this_month},
            {"name": "Breakdown", "count": bd_sum.active_breakdowns + 8},
        ],
        spare_parts=[
            {"part_number": "SP-8842", "spare_name": "Bearing 6205", "stock": 12, "minimum_stock": 20, "vendor": "SKF India", "cost": 850},
            {"part_number": "SP-8838", "spare_name": "Hydraulic Seal", "stock": 5, "minimum_stock": 10, "vendor": "Bosch", "cost": 1200},
            {"part_number": "SP-8830", "spare_name": "Cutting Tool Insert", "stock": 45, "minimum_stock": 30, "vendor": "Sandvik", "cost": 320},
        ],
        work_orders=[
            {"work_order_number": "MWO-0042", "machine": "CNC-01", "priority": "high", "assigned_to": "Mahesh Patel", "status": "in_progress"},
            {"work_order_number": "MWO-0041", "machine": "Press-03", "priority": "critical", "assigned_to": "Ravi Kumar", "status": "assigned"},
        ],
        alerts=[
            {"type": "due", "message": "Preventive maintenance due tomorrow — CNC-01"},
            {"type": "breakdown", "message": "Press-03 breakdown — 4.5h downtime"},
            {"type": "spare", "message": "Low stock: Bearing 6205 (12/20)"},
            {"type": "completed", "message": "Lathe-02 maintenance completed by Ravi Kumar"},
        ],
    )

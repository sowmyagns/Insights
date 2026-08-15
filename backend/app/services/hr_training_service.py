"""Training programs, enrollments, dashboard aggregates."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.models.hr import TrainingEnrollment, TrainingProgram
from app.schemas.hr import (
    TrainingEnrollmentCreate,
    TrainingEnrollmentUpdate,
    TrainingProgramCreate,
    TrainingProgramUpdate,
)

OVERVIEW_COLORS = {
    "in_progress": "#6366f1",
    "completed": "#16a34a",
    "not_started": "#f59e0b",
    "upcoming": "#8b5cf6",
}

CATEGORY_COLORS = ["#6366f1", "#8b5cf6", "#16a34a", "#f59e0b", "#ec4899", "#0ea5e9"]


def _format_date(d: date | None) -> str:
    if not d:
        return "—"
    return d.strftime("%d %b %Y")


def _enrollment_counts(db: Session, tenant_id: int) -> dict[int, int]:
    rows = db.execute(
        select(TrainingEnrollment.program_id, func.count())
        .where(TrainingEnrollment.tenant_id == tenant_id)
        .group_by(TrainingEnrollment.program_id)
    ).all()
    return {int(pid): int(cnt) for pid, cnt in rows}


def _program_to_schema(prog: TrainingProgram, participants: int = 0) -> dict:
    return {
        "id": prog.id,
        "tenant_id": prog.tenant_id,
        "name": prog.name,
        "category": prog.category,
        "trainer": prog.trainer,
        "start_date": prog.start_date,
        "end_date": prog.end_date,
        "status": prog.status,
        "progress_pct": prog.progress_pct,
        "description": prog.description,
        "participants": participants,
    }


def _program_to_read(prog: TrainingProgram, participants: int = 0) -> dict:
    base = _program_to_schema(prog, participants)
    base["category"] = prog.category or "—"
    base["trainer"] = prog.trainer or "—"
    base["start_date"] = _format_date(prog.start_date)
    base["end_date"] = _format_date(prog.end_date)
    base["start_date_raw"] = prog.start_date.isoformat() if prog.start_date else None
    base["end_date_raw"] = prog.end_date.isoformat() if prog.end_date else None
    base["progress"] = prog.progress_pct
    return base


def list_training_programs(
    db: Session,
    tenant_id: int,
    *,
    search: str | None = None,
    status: str | None = None,
    category: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    q = select(TrainingProgram).where(TrainingProgram.tenant_id == tenant_id)
    if search:
        term = f"%{search.strip()}%"
        q = q.where(
            or_(
                TrainingProgram.name.ilike(term),
                TrainingProgram.category.ilike(term),
                TrainingProgram.trainer.ilike(term),
            )
        )
    if status:
        q = q.where(TrainingProgram.status == status.lower())
    if category:
        q = q.where(TrainingProgram.category.ilike(f"%{category.strip()}%"))

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    rows = db.scalars(
        q.order_by(TrainingProgram.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    counts = _enrollment_counts(db, tenant_id)
    items = [_program_to_schema(r, counts.get(r.id, 0)) for r in rows]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def get_training_program(db: Session, tenant_id: int, program_id: int) -> dict | None:
    row = db.scalars(
        select(TrainingProgram).where(
            TrainingProgram.id == program_id, TrainingProgram.tenant_id == tenant_id
        )
    ).first()
    if not row:
        return None
    cnt = db.scalar(
        select(func.count())
        .select_from(TrainingEnrollment)
        .where(
            TrainingEnrollment.tenant_id == tenant_id,
            TrainingEnrollment.program_id == program_id,
        )
    ) or 0
    return _program_to_schema(row, int(cnt))


def create_training_program(
    db: Session, tenant_id: int, payload: TrainingProgramCreate
) -> dict:
    data = payload.model_dump()
    if data.get("status"):
        data["status"] = data["status"].lower()
    row = TrainingProgram(tenant_id=tenant_id, **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _program_to_schema(row, 0)


def update_training_program(
    db: Session, tenant_id: int, program_id: int, payload: TrainingProgramUpdate
) -> dict | None:
    row = db.scalars(
        select(TrainingProgram).where(
            TrainingProgram.id == program_id, TrainingProgram.tenant_id == tenant_id
        )
    ).first()
    if not row:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "status" and value is not None:
            value = value.lower()
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    cnt = db.scalar(
        select(func.count())
        .select_from(TrainingEnrollment)
        .where(
            TrainingEnrollment.tenant_id == tenant_id,
            TrainingEnrollment.program_id == program_id,
        )
    ) or 0
    return _program_to_schema(row, int(cnt))


def delete_training_program(db: Session, tenant_id: int, program_id: int) -> bool:
    row = db.scalars(
        select(TrainingProgram).where(
            TrainingProgram.id == program_id, TrainingProgram.tenant_id == tenant_id
        )
    ).first()
    if not row:
        return False
    db.execute(
        delete(TrainingEnrollment).where(
            TrainingEnrollment.tenant_id == tenant_id,
            TrainingEnrollment.program_id == program_id,
        )
    )
    db.delete(row)
    db.commit()
    return True


def create_enrollment(
    db: Session, tenant_id: int, payload: TrainingEnrollmentCreate
) -> dict:
    prog = db.scalars(
        select(TrainingProgram).where(
            TrainingProgram.id == payload.program_id,
            TrainingProgram.tenant_id == tenant_id,
        )
    ).first()
    if not prog:
        raise ValueError("Training program not found")
    data = payload.model_dump()
    if data.get("status"):
        data["status"] = data["status"].lower()
    row = TrainingEnrollment(tenant_id=tenant_id, **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _enrollment_to_read(row, prog.name)


def update_enrollment(
    db: Session, tenant_id: int, enrollment_id: int, payload: TrainingEnrollmentUpdate
) -> dict | None:
    row = db.scalars(
        select(TrainingEnrollment).where(
            TrainingEnrollment.id == enrollment_id,
            TrainingEnrollment.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "status" and value is not None:
            value = value.lower()
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    prog = db.scalars(
        select(TrainingProgram).where(TrainingProgram.id == row.program_id)
    ).first()
    return _enrollment_to_read(row, prog.name if prog else None)


def delete_enrollment(db: Session, tenant_id: int, enrollment_id: int) -> bool:
    row = db.scalars(
        select(TrainingEnrollment).where(
            TrainingEnrollment.id == enrollment_id,
            TrainingEnrollment.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def _enrollment_to_read(row: TrainingEnrollment, program_name: str | None = None) -> dict:
    return {
        "id": row.id,
        "tenant_id": row.tenant_id,
        "program_id": row.program_id,
        "program_name": program_name,
        "employee_id": row.employee_id,
        "employee_name": row.employee_name,
        "status": row.status,
        "progress_pct": row.progress_pct,
        "certified_at": row.certified_at.isoformat() if row.certified_at else None,
        "certification_name": row.certification_name,
    }


def get_training_dashboard(
    db: Session,
    tenant_id: int,
    *,
    ongoing_page: int = 1,
    ongoing_page_size: int = 5,
    trend_range: str = "this_month",
) -> dict:
    today = date.today()
    month_start = today.replace(day=1)

    total_programs = db.scalar(
        select(func.count()).select_from(TrainingProgram).where(
            TrainingProgram.tenant_id == tenant_id
        )
    ) or 0

    status_rows = db.execute(
        select(TrainingProgram.status, func.count())
        .where(TrainingProgram.tenant_id == tenant_id)
        .group_by(TrainingProgram.status)
    ).all()
    status_map = {(s or "").lower(): int(c) for s, c in status_rows}

    in_progress = status_map.get("in_progress", 0)
    completed = status_map.get("completed", 0)
    not_started = status_map.get("not_started", 0)

    certifications_earned = db.scalar(
        select(func.count())
        .select_from(TrainingEnrollment)
        .where(
            TrainingEnrollment.tenant_id == tenant_id,
            TrainingEnrollment.certified_at.isnot(None),
        )
    ) or 0

    overview_total = total_programs or (in_progress + completed + not_started)
    overview_slices = []
    for key, label in (
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("not_started", "Not Started"),
    ):
        count = status_map.get(key, 0)
        pct = round(count * 100 / overview_total) if overview_total else 0
        overview_slices.append(
            {
                "label": label,
                "count": count,
                "pct": pct,
                "color": OVERVIEW_COLORS.get(key, "#94a3b8"),
            }
        )

    # Completion trend (last 7 days or month)
    if trend_range == "last_month":
        start = (month_start - timedelta(days=1)).replace(day=1)
        end = month_start - timedelta(days=1)
    elif trend_range == "quarter":
        quarter_month = ((today.month - 1) // 3) * 3 + 1
        start = today.replace(month=quarter_month, day=1)
        end = today
    else:
        start = today - timedelta(days=6)
        end = today

    completion_trend = []
    day = start
    while day <= end:
        avg = db.scalar(
            select(func.avg(TrainingProgram.progress_pct)).where(
                TrainingProgram.tenant_id == tenant_id,
                TrainingProgram.start_date <= day,
            )
        )
        pct = round(float(avg or 0))
        completion_trend.append({"date": day.strftime("%d %b"), "pct": pct})
        day += timedelta(days=1)

    # Top categories
    cat_rows = db.execute(
        select(TrainingProgram.category, func.count())
        .where(
            TrainingProgram.tenant_id == tenant_id,
            TrainingProgram.category.isnot(None),
        )
        .group_by(TrainingProgram.category)
        .order_by(func.count().desc())
        .limit(5)
    ).all()
    cat_total = sum(int(c) for _, c in cat_rows) or 1
    top_categories = [
        {
            "label": cat or "General",
            "pct": round(int(cnt) * 100 / cat_total),
            "color": CATEGORY_COLORS[i % len(CATEGORY_COLORS)],
        }
        for i, (cat, cnt) in enumerate(cat_rows)
    ]

    # Ongoing programs (in_progress)
    ongoing_q = select(TrainingProgram).where(
        TrainingProgram.tenant_id == tenant_id,
        TrainingProgram.status == "in_progress",
    )
    total_ongoing = db.scalar(
        select(func.count()).select_from(ongoing_q.subquery())
    ) or 0
    ongoing_page = max(1, ongoing_page)
    ongoing_page_size = min(max(1, ongoing_page_size), 100)
    ongoing_rows = db.scalars(
        ongoing_q.order_by(TrainingProgram.id.desc())
        .offset((ongoing_page - 1) * ongoing_page_size)
        .limit(ongoing_page_size)
    ).all()
    counts = _enrollment_counts(db, tenant_id)
    ongoing_programs = [_program_to_read(r, counts.get(r.id, 0)) for r in ongoing_rows]

    # Upcoming (not_started with future start or status upcoming)
    upcoming_rows = db.scalars(
        select(TrainingProgram)
        .where(
            TrainingProgram.tenant_id == tenant_id,
            or_(
                TrainingProgram.status == "not_started",
                TrainingProgram.status == "upcoming",
            ),
        )
        .order_by(TrainingProgram.start_date.asc().nullslast())
        .limit(10)
    ).all()
    upcoming_programs = [_program_to_read(r, counts.get(r.id, 0)) for r in upcoming_rows]

    # My summary (tenant-wide enrollment stats)
    enrolled = db.scalar(
        select(func.count())
        .select_from(TrainingEnrollment)
        .where(TrainingEnrollment.tenant_id == tenant_id)
    ) or 0
    completed_enroll = db.scalar(
        select(func.count())
        .select_from(TrainingEnrollment)
        .where(
            TrainingEnrollment.tenant_id == tenant_id,
            TrainingEnrollment.status == "completed",
        )
    ) or 0
    in_prog_enroll = db.scalar(
        select(func.count())
        .select_from(TrainingEnrollment)
        .where(
            TrainingEnrollment.tenant_id == tenant_id,
            TrainingEnrollment.status == "in_progress",
        )
    ) or 0
    my_summary = [
        {"key": "enrolled", "label": "Enrolled Programs", "count": enrolled},
        {"key": "completed", "label": "Completed", "count": completed_enroll},
        {"key": "in_progress", "label": "In Progress", "count": in_prog_enroll},
        {"key": "certifications", "label": "Certifications", "count": certifications_earned},
    ]

    # Recent certifications
    cert_rows = db.scalars(
        select(TrainingEnrollment)
        .where(
            TrainingEnrollment.tenant_id == tenant_id,
            TrainingEnrollment.certified_at.isnot(None),
        )
        .order_by(TrainingEnrollment.certified_at.desc())
        .limit(5)
    ).all()
    recent_certifications = [
        {
            "id": r.id,
            "name": r.certification_name or r.employee_name or "Certification",
            "date": _format_date(r.certified_at),
        }
        for r in cert_rows
    ]

    return {
        "total_programs": total_programs,
        "in_progress": in_progress,
        "completed": completed,
        "not_started": not_started,
        "certifications_earned": certifications_earned,
        "kpi_trends": {},
        "overview_slices": overview_slices,
        "overview_total": overview_total,
        "completion_trend": completion_trend,
        "top_categories": top_categories,
        "ongoing_programs": ongoing_programs,
        "total_ongoing": total_ongoing,
        "upcoming_programs": upcoming_programs,
        "my_summary": my_summary,
        "recent_certifications": recent_certifications,
    }

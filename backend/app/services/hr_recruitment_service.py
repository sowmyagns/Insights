"""Recruitment: job openings, applicants, dashboard aggregates."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.hr import JobOpening, RecruitmentApplicant
from app.schemas.hr import (
    JobOpeningCreate,
    JobOpeningUpdate,
    RecruitmentApplicantCreate,
    RecruitmentApplicantUpdate,
)

FUNNEL_DEFS = [
    ("applicants", "Applicants", "#6366f1", None),
    ("screening", "Screening", "#8b5cf6", ("screening", "review")),
    ("interview", "Interview", "#a855f7", ("interview",)),
    ("offer", "Offer", "#c026d3", ("offer",)),
    ("hired", "Hired", "#16a34a", ("hired",)),
]

SOURCE_COLORS = {
    "linkedin": "#0ea5e9",
    "referral": "#8b5cf6",
    "website": "#6366f1",
    "job board": "#f59e0b",
    "job_board": "#f59e0b",
    "agency": "#ec4899",
    "other": "#94a3b8",
}

AVATAR_TONES = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-indigo-100 text-indigo-700",
]


def _initials(name: str) -> str:
    parts = (name or "?").split()
    return "".join(p[0] for p in parts if p)[:2].upper() or "?"


def _avatar_tone(name: str) -> str:
    idx = sum(ord(c) for c in (name or "")) % len(AVATAR_TONES)
    return AVATAR_TONES[idx]


def _format_date(d: date | None) -> str:
    if not d:
        return "—"
    return d.strftime("%d %b %Y")


def _stage_label(stage: str) -> str:
    key = (stage or "applied").lower()
    labels = {
        "applied": "Applied",
        "screening": "Screening",
        "review": "Review",
        "interview": "Interview",
        "offer": "Offer",
        "hired": "Hired",
        "rejected": "Rejected",
    }
    return labels.get(key, stage.replace("_", " ").title() if stage else "—")


def _job_to_schema(job: JobOpening, applicant_count: int = 0) -> dict:
    return {
        "id": job.id,
        "tenant_id": job.tenant_id,
        "title": job.title,
        "department": job.department,
        "openings_count": job.openings_count,
        "status": job.status,
        "location": job.location,
        "description": job.description,
        "applicants_count": applicant_count,
    }


def _job_to_read(job: JobOpening, applicant_count: int = 0) -> dict:
    base = _job_to_schema(job, applicant_count)
    base["department"] = job.department or "—"
    base["openings"] = job.openings_count
    base["applicants"] = applicant_count
    return base


def _applicant_to_schema(row: RecruitmentApplicant, job_title: str | None = None) -> dict:
    title = job_title
    if title is None and row.job_opening:
        title = row.job_opening.title
    return {
        "id": row.id,
        "tenant_id": row.tenant_id,
        "job_opening_id": row.job_opening_id,
        "full_name": row.full_name,
        "email": row.email,
        "phone": row.phone,
        "source": row.source,
        "stage": row.stage,
        "status": row.status,
        "applied_on": row.applied_on,
        "notes": row.notes,
        "job_title": title,
    }


def _applicant_to_read(row: RecruitmentApplicant, job_title: str | None = None) -> dict:
    title = job_title
    if title is None and row.job_opening:
        title = row.job_opening.title
    base = _applicant_to_schema(row, title)
    return {
        **base,
        "name": row.full_name,
        "stage": _stage_label(row.stage),
        "applied_on": _format_date(row.applied_on),
        "applied_on_raw": row.applied_on.isoformat() if row.applied_on else None,
        "job_title": title or "—",
        "avatar": _initials(row.full_name),
        "avatar_tone": _avatar_tone(row.full_name),
    }


def _applicant_counts(db: Session, tenant_id: int) -> dict[int, int]:
    rows = db.execute(
        select(RecruitmentApplicant.job_opening_id, func.count())
        .where(
            RecruitmentApplicant.tenant_id == tenant_id,
            RecruitmentApplicant.job_opening_id.isnot(None),
        )
        .group_by(RecruitmentApplicant.job_opening_id)
    ).all()
    return {int(jid): int(cnt) for jid, cnt in rows if jid is not None}


def list_job_openings(
    db: Session,
    tenant_id: int,
    *,
    search: str | None = None,
    status: str | None = None,
    department: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    q = select(JobOpening).where(JobOpening.tenant_id == tenant_id)
    if search:
        term = f"%{search.strip()}%"
        q = q.where(
            or_(
                JobOpening.title.ilike(term),
                JobOpening.department.ilike(term),
                JobOpening.location.ilike(term),
            )
        )
    if status:
        q = q.where(JobOpening.status == status.lower())
    if department:
        q = q.where(JobOpening.department.ilike(f"%{department.strip()}%"))

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    rows = db.scalars(
        q.order_by(JobOpening.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    counts = _applicant_counts(db, tenant_id)
    items = [_job_to_schema(r, counts.get(r.id, 0)) for r in rows]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def get_job_opening(db: Session, tenant_id: int, job_id: int) -> dict | None:
    row = db.scalars(
        select(JobOpening).where(JobOpening.id == job_id, JobOpening.tenant_id == tenant_id)
    ).first()
    if not row:
        return None
    cnt = db.scalar(
        select(func.count())
        .select_from(RecruitmentApplicant)
        .where(
            RecruitmentApplicant.tenant_id == tenant_id,
            RecruitmentApplicant.job_opening_id == job_id,
        )
    ) or 0
    return _job_to_schema(row, int(cnt))


def create_job_opening(db: Session, tenant_id: int, payload: JobOpeningCreate) -> dict:
    data = payload.model_dump()
    if data.get("status"):
        data["status"] = data["status"].lower()
    row = JobOpening(tenant_id=tenant_id, **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _job_to_schema(row, 0)


def update_job_opening(
    db: Session, tenant_id: int, job_id: int, payload: JobOpeningUpdate
) -> dict | None:
    row = db.scalars(
        select(JobOpening).where(JobOpening.id == job_id, JobOpening.tenant_id == tenant_id)
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
        .select_from(RecruitmentApplicant)
        .where(
            RecruitmentApplicant.tenant_id == tenant_id,
            RecruitmentApplicant.job_opening_id == job_id,
        )
    ) or 0
    return _job_to_schema(row, int(cnt))


def delete_job_opening(db: Session, tenant_id: int, job_id: int) -> bool:
    row = db.scalars(
        select(JobOpening).where(JobOpening.id == job_id, JobOpening.tenant_id == tenant_id)
    ).first()
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def list_applicants(
    db: Session,
    tenant_id: int,
    *,
    search: str | None = None,
    status: str | None = None,
    stage: str | None = None,
    job_opening_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    q = (
        select(RecruitmentApplicant)
        .where(RecruitmentApplicant.tenant_id == tenant_id)
    )
    if search:
        term = f"%{search.strip()}%"
        q = q.where(
            or_(
                RecruitmentApplicant.full_name.ilike(term),
                RecruitmentApplicant.email.ilike(term),
                RecruitmentApplicant.source.ilike(term),
            )
        )
    if status:
        q = q.where(RecruitmentApplicant.status == status.lower())
    if stage:
        q = q.where(RecruitmentApplicant.stage == stage.lower())
    if job_opening_id:
        q = q.where(RecruitmentApplicant.job_opening_id == job_opening_id)

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    rows = db.scalars(
        q.order_by(RecruitmentApplicant.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    job_titles: dict[int, str] = {}
    job_ids = {r.job_opening_id for r in rows if r.job_opening_id}
    if job_ids:
        jobs = db.scalars(
            select(JobOpening).where(JobOpening.id.in_(job_ids))
        ).all()
        job_titles = {j.id: j.title for j in jobs}
    items = [
        _applicant_to_schema(r, job_titles.get(r.job_opening_id) if r.job_opening_id else None)
        for r in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def get_applicant(db: Session, tenant_id: int, applicant_id: int) -> dict | None:
    row = db.scalars(
        select(RecruitmentApplicant).where(
            RecruitmentApplicant.id == applicant_id,
            RecruitmentApplicant.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        return None
    job_title = None
    if row.job_opening_id:
        job = db.scalars(
            select(JobOpening).where(JobOpening.id == row.job_opening_id)
        ).first()
        job_title = job.title if job else None
    return _applicant_to_schema(row, job_title)


def create_applicant(
    db: Session, tenant_id: int, payload: RecruitmentApplicantCreate
) -> dict:
    data = payload.model_dump()
    if data.get("status"):
        data["status"] = data["status"].lower()
    if data.get("stage"):
        data["stage"] = data["stage"].lower()
    if not data.get("applied_on"):
        data["applied_on"] = date.today()
    if data.get("job_opening_id"):
        job = db.scalars(
            select(JobOpening).where(
                JobOpening.id == data["job_opening_id"],
                JobOpening.tenant_id == tenant_id,
            )
        ).first()
        if not job:
            raise ValueError("Job opening not found")
    row = RecruitmentApplicant(tenant_id=tenant_id, **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return get_applicant(db, tenant_id, row.id) or _applicant_to_schema(row)


def update_applicant(
    db: Session, tenant_id: int, applicant_id: int, payload: RecruitmentApplicantUpdate
) -> dict | None:
    row = db.scalars(
        select(RecruitmentApplicant).where(
            RecruitmentApplicant.id == applicant_id,
            RecruitmentApplicant.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in ("status", "stage") and value is not None:
            value = value.lower()
        if field == "job_opening_id" and value is not None:
            job = db.scalars(
                select(JobOpening).where(
                    JobOpening.id == value, JobOpening.tenant_id == tenant_id
                )
            ).first()
            if not job:
                raise ValueError("Job opening not found")
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return get_applicant(db, tenant_id, applicant_id)


def delete_applicant(db: Session, tenant_id: int, applicant_id: int) -> bool:
    row = db.scalars(
        select(RecruitmentApplicant).where(
            RecruitmentApplicant.id == applicant_id,
            RecruitmentApplicant.tenant_id == tenant_id,
        )
    ).first()
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def get_recruitment_dashboard(
    db: Session,
    tenant_id: int,
    *,
    applicant_page: int = 1,
    applicant_page_size: int = 5,
) -> dict:
    today = date.today()
    month_start = today.replace(day=1)

    total_openings = db.scalar(
        select(func.count())
        .select_from(JobOpening)
        .where(JobOpening.tenant_id == tenant_id, JobOpening.status == "open")
    ) or 0

    active_candidates = db.scalar(
        select(func.count())
        .select_from(RecruitmentApplicant)
        .where(
            RecruitmentApplicant.tenant_id == tenant_id,
            RecruitmentApplicant.status.in_(("new", "in_progress")),
        )
    ) or 0

    hired_this_month = db.scalar(
        select(func.count())
        .select_from(RecruitmentApplicant)
        .where(
            RecruitmentApplicant.tenant_id == tenant_id,
            RecruitmentApplicant.status == "hired",
            RecruitmentApplicant.applied_on >= month_start,
        )
    ) or 0

    offer_in_progress = db.scalar(
        select(func.count())
        .select_from(RecruitmentApplicant)
        .where(
            RecruitmentApplicant.tenant_id == tenant_id,
            or_(
                RecruitmentApplicant.stage == "offer",
                RecruitmentApplicant.status == "in_progress",
            ),
            RecruitmentApplicant.status != "hired",
            RecruitmentApplicant.status != "rejected",
        )
    ) or 0

    rejected_this_month = db.scalar(
        select(func.count())
        .select_from(RecruitmentApplicant)
        .where(
            RecruitmentApplicant.tenant_id == tenant_id,
            RecruitmentApplicant.status == "rejected",
            RecruitmentApplicant.applied_on >= month_start,
        )
    ) or 0

    total_applicants = db.scalar(
        select(func.count())
        .select_from(RecruitmentApplicant)
        .where(RecruitmentApplicant.tenant_id == tenant_id)
    ) or 0

    # Funnel counts
    all_applicants = total_applicants
    stage_rows = db.execute(
        select(RecruitmentApplicant.stage, func.count())
        .where(RecruitmentApplicant.tenant_id == tenant_id)
        .group_by(RecruitmentApplicant.stage)
    ).all()
    stage_map = {(s or "").lower(): int(c) for s, c in stage_rows}
    status_rows = db.execute(
        select(RecruitmentApplicant.status, func.count())
        .where(RecruitmentApplicant.tenant_id == tenant_id)
        .group_by(RecruitmentApplicant.status)
    ).all()
    status_map = {(s or "").lower(): int(c) for s, c in status_rows}

    def funnel_count(key: str, stages: tuple[str, ...] | None) -> int:
        if key == "applicants":
            return all_applicants
        if key == "hired":
            return status_map.get("hired", 0)
        if stages:
            return sum(stage_map.get(s, 0) for s in stages)
        return 0

    funnel_stages = []
    for key, label, color, stages in FUNNEL_DEFS:
        count = funnel_count(key, stages)
        pct = round(count * 100 / all_applicants) if all_applicants else 0
        funnel_stages.append(
            {"key": key, "label": label, "count": count, "pct": pct, "color": color}
        )

    # Job openings table (all open + recent closed, limit 10)
    counts = _applicant_counts(db, tenant_id)
    jobs = db.scalars(
        select(JobOpening)
        .where(JobOpening.tenant_id == tenant_id)
        .order_by(JobOpening.id.desc())
        .limit(10)
    ).all()
    job_openings = [_job_to_read(j, counts.get(j.id, 0)) for j in jobs]

    # Paginated recent applicants
    applicant_page = max(1, applicant_page)
    applicant_page_size = min(max(1, applicant_page_size), 100)
    applicant_rows = db.scalars(
        select(RecruitmentApplicant)
        .where(RecruitmentApplicant.tenant_id == tenant_id)
        .order_by(RecruitmentApplicant.id.desc())
        .offset((applicant_page - 1) * applicant_page_size)
        .limit(applicant_page_size)
    ).all()
    job_titles: dict[int, str] = {}
    job_ids = {r.job_opening_id for r in applicant_rows if r.job_opening_id}
    if job_ids:
        for j in db.scalars(select(JobOpening).where(JobOpening.id.in_(job_ids))).all():
            job_titles[j.id] = j.title
    recent_applicants = [
        _applicant_to_read(r, job_titles.get(r.job_opening_id) if r.job_opening_id else None)
        for r in applicant_rows
    ]

    # Source analytics
    source_rows = db.execute(
        select(RecruitmentApplicant.source, func.count())
        .where(RecruitmentApplicant.tenant_id == tenant_id)
        .group_by(RecruitmentApplicant.source)
    ).all()
    source_total = sum(int(c) for _, c in source_rows) or 0
    source_slices = []
    for src, cnt in source_rows:
        label = (src or "Other").strip() or "Other"
        key = label.lower().replace(" ", "_")
        color = SOURCE_COLORS.get(key, SOURCE_COLORS.get(label.lower(), "#94a3b8"))
        pct = round(int(cnt) * 100 / source_total) if source_total else 0
        source_slices.append({"label": label, "count": int(cnt), "pct": pct, "color": color})

    return {
        "total_openings": total_openings,
        "active_candidates": active_candidates,
        "hired_this_month": hired_this_month,
        "offer_in_progress": offer_in_progress,
        "rejected_this_month": rejected_this_month,
        "kpi_trends": {},
        "funnel_stages": funnel_stages,
        "job_openings": job_openings,
        "recent_applicants": recent_applicants,
        "total_applicants": total_applicants,
        "source_slices": source_slices,
        "source_total": source_total,
    }

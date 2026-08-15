"""Meetings CRUD and Google Calendar sync orchestration."""

from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models.meeting import Meeting, MeetingParticipant
from app.models.user import User
from app.schemas.meeting import MeetingCreate, MeetingUpdate
from app.services import google_calendar_service as gcal

MEETING_TYPES = (
    "internal",
    "client",
    "review",
    "standup",
    "interview",
    "training",
    "other",
)


def _participant_rows(emails: list[str]) -> list[MeetingParticipant]:
    return [MeetingParticipant(email=e) for e in emails]


def _meet_available(meeting: Meeting) -> bool:
    return bool(meeting.google_meet_url and meeting.google_meet_status == "available")


def meeting_to_read(
    meeting: Meeting,
    *,
    google_status: dict | None = None,
) -> dict:
    status = google_status or {}
    return {
        "id": meeting.id,
        "tenant_id": meeting.tenant_id,
        "created_by_user_id": meeting.created_by_user_id,
        "title": meeting.title,
        "meeting_type": meeting.meeting_type,
        "meeting_date": meeting.meeting_date,
        "start_time": meeting.start_time,
        "end_time": meeting.end_time,
        "timezone": meeting.timezone,
        "organizer": meeting.organizer,
        "location": meeting.location,
        "agenda": meeting.agenda,
        "description": meeting.description,
        "reminder_minutes": meeting.reminder_minutes,
        "create_google_meet_requested": meeting.create_google_meet_requested,
        "status": meeting.status,
        "google_calendar_event_id": meeting.google_calendar_event_id,
        "google_calendar_event_url": meeting.google_calendar_event_url,
        "google_meet_url": meeting.google_meet_url,
        "google_meet_status": meeting.google_meet_status,
        "participants": [
            {"email": p.email, "display_name": p.display_name} for p in meeting.participants
        ],
        "google_calendar_connected": bool(status.get("connected")),
        "google_calendar_account_email": status.get("account_email"),
        "meet_available": _meet_available(meeting),
    }


def get_meeting(
    db: Session, *, tenant_id: int, meeting_id: int
) -> Meeting | None:
    return db.scalars(
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.tenant_id == tenant_id)
        .options(selectinload(Meeting.participants))
    ).first()


def list_meetings(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
) -> dict:
    google_status = gcal.get_connection_status(db, tenant_id=tenant_id, user_id=user_id)
    total = db.scalar(
        select(func.count(Meeting.id)).where(Meeting.tenant_id == tenant_id)
    ) or 0
    rows = db.scalars(
        select(Meeting)
        .where(Meeting.tenant_id == tenant_id)
        .options(selectinload(Meeting.participants))
        .order_by(Meeting.meeting_date.desc(), Meeting.start_time.desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return {
        "items": [meeting_to_read(m, google_status=google_status) for m in rows],
        "total": int(total),
        "google_calendar_connected": google_status["connected"],
        "google_calendar_account_email": google_status["account_email"],
    }


def create_meeting(
    db: Session,
    *,
    tenant_id: int,
    user: User,
    payload: MeetingCreate,
) -> tuple[dict, str | None]:
    organizer = payload.organizer or user.full_name or user.email
    meeting = Meeting(
        tenant_id=tenant_id,
        created_by_user_id=user.id,
        title=payload.title.strip(),
        meeting_type=payload.meeting_type,
        meeting_date=payload.meeting_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        timezone=payload.timezone or get_settings().google_calendar_default_timezone,
        organizer=organizer,
        location=payload.location,
        agenda=payload.agenda,
        description=payload.description,
        reminder_minutes=payload.reminder_minutes,
        create_google_meet_requested=payload.create_google_meet,
        status="scheduled",
        participants=_participant_rows(payload.participants),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    warning: str | None = None
    google_status = gcal.get_connection_status(db, tenant_id=tenant_id, user_id=user.id)
    should_sync = google_status["connected"] and (
        payload.sync_google_calendar or payload.create_google_meet
    )

    if payload.sync_google_calendar and not google_status["connected"]:
        warning = "Meeting saved locally. Connect Google Calendar to sync events and create Meet links."
    elif payload.create_google_meet and not google_status["connected"]:
        warning = "Meeting saved locally. Connect Google Calendar to generate a Google Meet link."

    if should_sync:
        try:
            gcal.create_calendar_event(
                db,
                tenant_id=tenant_id,
                user_id=user.id,
                meeting=meeting,
                include_meet=payload.create_google_meet,
            )
            db.commit()
            db.refresh(meeting)
        except Exception as exc:
            warning = str(getattr(exc, "detail", exc)) if hasattr(exc, "detail") else str(exc)
            if payload.create_google_meet:
                meeting.google_meet_status = "failed"
                db.commit()
                db.refresh(meeting)

    google_status = gcal.get_connection_status(db, tenant_id=tenant_id, user_id=user.id)
    return meeting_to_read(meeting, google_status=google_status), warning


def update_meeting(
    db: Session,
    *,
    tenant_id: int,
    user: User,
    meeting_id: int,
    payload: MeetingUpdate,
) -> tuple[dict | None, str | None]:
    meeting = get_meeting(db, tenant_id=tenant_id, meeting_id=meeting_id)
    if not meeting:
        return None, None

    data = payload.model_dump(exclude_unset=True)
    participants = data.pop("participants", None)
    create_google_meet = data.pop("create_google_meet", None)
    sync_google_calendar = data.pop("sync_google_calendar", None)

    for key, value in data.items():
        setattr(meeting, key, value)

    if participants is not None:
        db.execute(
            delete(MeetingParticipant).where(MeetingParticipant.meeting_id == meeting.id)
        )
        meeting.participants = _participant_rows(participants)

    if create_google_meet is not None:
        meeting.create_google_meet_requested = create_google_meet

    db.commit()
    db.refresh(meeting)

    warning: str | None = None
    google_status = gcal.get_connection_status(db, tenant_id=tenant_id, user_id=user.id)
    if sync_google_calendar is False:
        pass
    elif meeting.google_calendar_event_id and google_status["connected"]:
        try:
            gcal.update_calendar_event(
                db,
                tenant_id=tenant_id,
                user_id=user.id,
                meeting=meeting,
                include_meet=meeting.create_google_meet_requested,
            )
            db.commit()
            db.refresh(meeting)
        except Exception as exc:
            warning = str(getattr(exc, "detail", exc)) if hasattr(exc, "detail") else str(exc)
    elif sync_google_calendar and google_status["connected"]:
        try:
            gcal.create_calendar_event(
                db,
                tenant_id=tenant_id,
                user_id=user.id,
                meeting=meeting,
                include_meet=bool(meeting.create_google_meet_requested),
            )
            db.commit()
            db.refresh(meeting)
        except Exception as exc:
            warning = str(getattr(exc, "detail", exc)) if hasattr(exc, "detail") else str(exc)

    google_status = gcal.get_connection_status(db, tenant_id=tenant_id, user_id=user.id)
    return meeting_to_read(meeting, google_status=google_status), warning


def delete_meeting(
    db: Session,
    *,
    tenant_id: int,
    user: User,
    meeting_id: int,
) -> bool:
    meeting = get_meeting(db, tenant_id=tenant_id, meeting_id=meeting_id)
    if not meeting:
        return False
    try:
        gcal.delete_calendar_event(
            db, tenant_id=tenant_id, user_id=user.id, meeting=meeting
        )
    except Exception:
        pass
    db.delete(meeting)
    db.commit()
    return True


def create_meet_for_meeting(
    db: Session,
    *,
    tenant_id: int,
    user: User,
    meeting_id: int,
) -> tuple[dict | None, str | None]:
    meeting = get_meeting(db, tenant_id=tenant_id, meeting_id=meeting_id)
    if not meeting:
        return None, None
    google_status = gcal.get_connection_status(db, tenant_id=tenant_id, user_id=user.id)
    if not google_status["connected"]:
        return meeting_to_read(meeting, google_status=google_status), (
            "Connect Google Calendar before creating a Meet link."
        )
    try:
        gcal.add_meet_to_existing_event(
            db, tenant_id=tenant_id, user_id=user.id, meeting=meeting
        )
        db.commit()
        db.refresh(meeting)
    except Exception as exc:
        db.commit()
        warning = str(getattr(exc, "detail", exc)) if hasattr(exc, "detail") else str(exc)
        google_status = gcal.get_connection_status(db, tenant_id=tenant_id, user_id=user.id)
        return meeting_to_read(meeting, google_status=google_status), warning

    google_status = gcal.get_connection_status(db, tenant_id=tenant_id, user_id=user.id)
    return meeting_to_read(meeting, google_status=google_status), None

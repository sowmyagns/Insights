import { useEffect, useState } from "react";
import { X } from "lucide-react";

import Button from "../common/Button";

const MEETING_TYPES = [
  { value: "", label: "Select type" },
  { value: "internal", label: "Internal" },
  { value: "client", label: "Client" },
  { value: "review", label: "Review" },
  { value: "standup", label: "Standup" },
  { value: "interview", label: "Interview" },
  { value: "training", label: "Training" },
  { value: "other", label: "Other" },
];

const REMINDER_OPTIONS = [
  { value: "", label: "Default" },
  { value: "0", label: "None" },
  { value: "5", label: "5 minutes before" },
  { value: "10", label: "10 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
];

const EMPTY_FORM = {
  title: "",
  meeting_type: "",
  meeting_date: "",
  start_time: "",
  end_time: "",
  organizer: "",
  participants: "",
  location: "",
  agenda: "",
  description: "",
  reminder_minutes: "",
  create_google_meet: true,
};

function toForm(meeting) {
  if (!meeting) return { ...EMPTY_FORM };
  const next = {
    title: meeting.title || "",
    meeting_type: meeting.meeting_type || "",
    meeting_date: meeting.meeting_date || "",
    start_time: meeting.start_time?.slice?.(0, 5) || meeting.start_time || "",
    end_time: meeting.end_time?.slice?.(0, 5) || meeting.end_time || "",
    organizer: meeting.organizer || "",
    participants: (meeting.participants || []).map((p) => p.email).join(", "),
    location: meeting.location || "",
    agenda: meeting.agenda || "",
    description: meeting.description || "",
    reminder_minutes:
      meeting.reminder_minutes != null ? String(meeting.reminder_minutes) : "",
    create_google_meet: Boolean(meeting.create_google_meet_requested),
  };
  if (meeting.createKind === "task") {
    next.create_google_meet = false;
    if (!next.meeting_type) next.meeting_type = "other";
  }
  if (meeting.createKind === "appointment") {
    next.create_google_meet = true;
    if (!next.meeting_type) next.meeting_type = "client";
  }
  return next;
}

const CREATE_TITLES = {
  event: "New event",
  task: "New task",
  appointment: "New appointment schedule",
};

function parseParticipants(raw) {
  return String(raw || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function MeetingFormModal({
  open,
  mode = "create",
  initial,
  organizerDefault = "",
  googleConnected = false,
  saving = false,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, organizer: organizerDefault });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      const next = toForm(initial);
      if (!next.organizer) next.organizer = organizerDefault;
      setForm(next);
      setErrors({});
    }
  }, [open, initial, organizerDefault]);

  if (!open) return null;

  const createKind = initial?.createKind || "event";
  const modalTitle =
    mode === "edit" ? "Edit Meeting" : CREATE_TITLES[createKind] || CREATE_TITLES.event;
  const submitLabel =
    mode === "edit"
      ? "Save Changes"
      : createKind === "task"
        ? "Create Task"
        : createKind === "appointment"
          ? "Create Appointment"
          : "Create Event";

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Meeting title is required.";
    if (!form.meeting_date) next.meeting_date = "Date is required.";
    if (!form.start_time) next.start_time = "Start time is required.";
    if (!form.end_time) next.end_time = "End time is required.";
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      next.end_time = "End time must be after start time.";
    }
    const emails = parseParticipants(form.participants);
    const invalid = emails.filter((e) => !isValidEmail(e));
    if (invalid.length) next.participants = `Invalid email: ${invalid[0]}`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const reminder =
      form.reminder_minutes === "" ? null : Number(form.reminder_minutes);
    onSubmit({
      title: form.title.trim(),
      meeting_type: form.meeting_type || null,
      meeting_date: form.meeting_date,
      start_time: form.start_time,
      end_time: form.end_time,
      organizer: form.organizer.trim() || null,
      participants: parseParticipants(form.participants),
      location: form.location.trim() || null,
      agenda: form.agenda.trim() || null,
      description: form.description.trim() || null,
      reminder_minutes: Number.isFinite(reminder) ? reminder : null,
      create_google_meet: Boolean(form.create_google_meet),
      sync_google_calendar: true,  // always attempt sync; backend skips if not connected
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-text)]">{modalTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <label className="block text-sm">
            <span className="ui-label">Meeting Title *</span>
            <input
              className="ui-input mt-1 w-full"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            {errors.title ? <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.title}</p> : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="ui-label">Meeting Type</span>
              <select
                className="ui-select mt-1 w-full"
                value={form.meeting_type}
                onChange={(e) => setForm((f) => ({ ...f, meeting_type: e.target.value }))}
              >
                {MEETING_TYPES.map((t) => (
                  <option key={t.value || "empty"} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="ui-label">Organizer</span>
              <input
                className="ui-input mt-1 w-full"
                value={form.organizer}
                onChange={(e) => setForm((f) => ({ ...f, organizer: e.target.value }))}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="ui-label">Date *</span>
              <input
                type="date"
                className="ui-input mt-1 w-full"
                value={form.meeting_date}
                onChange={(e) => setForm((f) => ({ ...f, meeting_date: e.target.value }))}
              />
              {errors.meeting_date ? (
                <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.meeting_date}</p>
              ) : null}
            </label>
            <label className="block text-sm">
              <span className="ui-label">Start Time *</span>
              <input
                type="time"
                className="ui-input mt-1 w-full"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              />
              {errors.start_time ? (
                <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.start_time}</p>
              ) : null}
            </label>
            <label className="block text-sm">
              <span className="ui-label">End Time *</span>
              <input
                type="time"
                className="ui-input mt-1 w-full"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              />
              {errors.end_time ? (
                <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.end_time}</p>
              ) : null}
            </label>
          </div>

          <label className="block text-sm">
            <span className="ui-label">Participants</span>
            <textarea
              className="ui-input mt-1 min-h-[72px] w-full"
              placeholder="email1@company.com, email2@company.com"
              value={form.participants}
              onChange={(e) => setForm((f) => ({ ...f, participants: e.target.value }))}
            />
            {errors.participants ? (
              <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.participants}</p>
            ) : (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Separate multiple emails with commas.</p>
            )}
          </label>

          <label className="block text-sm">
            <span className="ui-label">Location</span>
            <input
              className="ui-input mt-1 w-full"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </label>

          <label className="block text-sm">
            <span className="ui-label">Agenda</span>
            <textarea
              className="ui-input mt-1 min-h-[72px] w-full"
              value={form.agenda}
              onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
            />
          </label>

          <label className="block text-sm">
            <span className="ui-label">Description</span>
            <textarea
              className="ui-input mt-1 min-h-[72px] w-full"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>

          <label className="block text-sm sm:max-w-xs">
            <span className="ui-label">Reminder</span>
            <select
              className="ui-select mt-1 w-full"
              value={form.reminder_minutes}
              onChange={(e) => setForm((f) => ({ ...f, reminder_minutes: e.target.value }))}
            >
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.value || "default"} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          {createKind !== "task" ? (
            <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-3 space-y-2">
              {googleConnected ? (
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                  ✅ Google Calendar connected — this meeting will automatically appear on your Google Calendar.
                </p>
              ) : (
                <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                  ⚠️ Connect Google Calendar to auto-sync meetings.
                </p>
              )}
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--color-border)]"
                  checked={form.create_google_meet}
                  disabled={!googleConnected}
                  onChange={(e) => setForm((f) => ({ ...f, create_google_meet: e.target.checked }))}
                />
                Also create a Google Meet video link
                {!googleConnected ? (
                  <span className="text-xs text-[var(--color-text-muted)]">(connect Google Calendar first)</span>
                ) : null}
              </label>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-[var(--color-border-soft)] pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

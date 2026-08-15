import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, Pencil, Trash2, Video } from "lucide-react";

import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import MeetingFormModal from "../../components/meetings/MeetingFormModal";
import { useToast } from "../../context/ToastContext";
import useAuth from "../../hooks/useAuth";
import {
  createMeetingGoogleMeet,
  deleteMeeting,
  getGoogleCalendarStatus,
  getMeeting,
  updateMeeting,
} from "../../api/meetingsApi";
import { apiErrorMessage } from "../../utils/apiError";

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState(null);
  const [googleStatus, setGoogleStatus] = useState({ connected: false });
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingMeet, setCreatingMeet] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, statusRes] = await Promise.allSettled([
        getMeeting(id),
        getGoogleCalendarStatus(),
      ]);
      if (detailRes.status === "fulfilled") {
        setMeeting(detailRes.value?.data || null);
      } else {
        setMeeting(null);
      }
      if (statusRes.status === "fulfilled") {
        setGoogleStatus(statusRes.value?.data || { connected: false });
      }
    } catch {
      setMeeting(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      const res = await updateMeeting(id, payload);
      const warning = res?.data?.warning;
      addToast(warning || "Meeting updated.", warning ? "warning" : "success");
      setFormOpen(false);
      load();
    } catch (err) {
      addToast(apiErrorMessage(err, "Unable to update meeting."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMeeting(id);
      addToast("Meeting deleted.", "success");
      navigate("/meetings");
    } catch (err) {
      addToast(apiErrorMessage(err, "Unable to delete meeting."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateMeet = async () => {
    setCreatingMeet(true);
    try {
      const res = await createMeetingGoogleMeet(id);
      const msg = res?.data?.message;
      if (msg) addToast(msg, "warning");
      else addToast("Google Meet link created.", "success");
      load();
    } catch (err) {
      addToast(apiErrorMessage(err, "Unable to create Google Meet link."), "error");
    } finally {
      setCreatingMeet(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 pb-4">
        <Loader label="Loading meeting…" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="ui-card p-8 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Meeting not found.</p>
        <Button type="button" variant="secondary" className="mt-4" onClick={() => navigate("/meetings")}>
          Back to Meetings
        </Button>
      </div>
    );
  }

  const hasMeet = Boolean(meeting.google_meet_url);
  const meetPending = meeting.google_meet_status === "pending";

  return (
    <div className="min-w-0 space-y-5 pb-4">
      <PageHeader
        backTo="/meetings"
        backLabel="Meetings"
        subtitle={meeting.title}
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="ui-card space-y-4 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Meeting Details</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="ui-label">Date</dt>
              <dd className="mt-1 text-sm">{formatDate(meeting.meeting_date)}</dd>
            </div>
            <div>
              <dt className="ui-label">Time</dt>
              <dd className="ui-num mt-1 text-sm">
                {formatTime(meeting.start_time)} – {formatTime(meeting.end_time)}
              </dd>
            </div>
            <div>
              <dt className="ui-label">Organizer</dt>
              <dd className="mt-1 text-sm">{meeting.organizer || "—"}</dd>
            </div>
            <div>
              <dt className="ui-label">Meeting Type</dt>
              <dd className="mt-1 text-sm capitalize">{meeting.meeting_type || "—"}</dd>
            </div>
            <div>
              <dt className="ui-label">Location</dt>
              <dd className="mt-1 text-sm">{meeting.location || "—"}</dd>
            </div>
            <div>
              <dt className="ui-label">Status</dt>
              <dd className="mt-1">
                <StatusBadge tone={meeting.status === "cancelled" ? "danger" : "info"}>
                  {meeting.status}
                </StatusBadge>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="ui-label">Participants</dt>
              <dd className="mt-1 text-sm">
                {(meeting.participants || []).length
                  ? (meeting.participants || []).map((p) => p.email).join(", ")
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="ui-label">Agenda</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                {meeting.agenda || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="ui-label">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                {meeting.description || "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="ui-card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Google Meet</h2>
          <div>
            <p className="ui-label">Connection Status</p>
            <div className="mt-1">
              <StatusBadge tone={googleStatus.connected ? "success" : "neutral"}>
                {googleStatus.connected ? "Connected" : "Not Connected"}
              </StatusBadge>
            </div>
            {googleStatus.account_email ? (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{googleStatus.account_email}</p>
            ) : null}
          </div>

          <div>
            <p className="ui-label">Meeting URL</p>
            {hasMeet ? (
              <a
                href={meeting.google_meet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
              >
                <Video className="h-4 w-4" /> Join Google Meet
              </a>
            ) : meetPending ? (
              <p className="mt-1 text-sm text-[var(--color-warning)]">Meet link is being generated…</p>
            ) : (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">No Meet link yet.</p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {hasMeet ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => window.open(meeting.google_meet_url, "_blank", "noopener,noreferrer")}
              >
                <Video className="h-4 w-4" /> Join Meeting
              </Button>
            ) : googleStatus.connected ? (
              <Button type="button" variant="primary" onClick={handleCreateMeet} disabled={creatingMeet}>
                <Video className="h-4 w-4" />
                {creatingMeet ? "Creating…" : "Create Google Meet"}
              </Button>
            ) : null}
            {meeting.google_calendar_event_url ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  window.open(meeting.google_calendar_event_url, "_blank", "noopener,noreferrer")
                }
              >
                <Calendar className="h-4 w-4" /> Open in Google Calendar
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <MeetingFormModal
        open={formOpen}
        mode="edit"
        initial={meeting}
        organizerDefault={user?.full_name || user?.email || ""}
        googleConnected={googleStatus.connected}
        saving={saving}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete meeting?"
        message="Are you sure you want to delete this meeting?"
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}

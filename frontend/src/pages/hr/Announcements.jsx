import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { createAnnouncement, deleteAnnouncement, getAnnouncements, updateAnnouncement } from "../../api/announcementsApi";

const PAGE_SIZES = [10, 20, 50];
const EMPTY_FORM = { title: "", body: "", publish_date: "", expiry_date: "", is_published: 1 };

function displayDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}-${month}-${year}` : value;
}

function monthLabel() {
  return "all dates";
}

function AnnouncementModal({ announcement, onClose, onSaved }) {
  const { addToast } = useToast();
  const [form, setForm] = useState(() => announcement ? {
    title: announcement.title || "",
    body: announcement.body || "",
    publish_date: announcement.publish_date || "",
    expiry_date: announcement.expiry_date || "",
    is_published: announcement.is_published ?? 1,
  } : { ...EMPTY_FORM, publish_date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim() || !form.publish_date) {
      addToast("Title, details, and publish date are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), body: form.body.trim(), expiry_date: form.expiry_date || null };
      if (announcement) await updateAnnouncement(announcement.id, payload);
      else await createAnnouncement(payload);
      addToast(announcement ? "Announcement updated" : "Announcement published", "success");
      onSaved();
    } catch (error) {
      addToast(error.response?.data?.detail || "Could not save announcement.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-[#1a1a1f]">{announcement ? "Edit Announcement" : "Add Announcement"}</h2>
            <p className="mt-0.5 text-[12px] text-[#8a8a95]">Publish a clear update for your organization.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="grid h-8 w-8 place-items-center rounded-full bg-[#f5f5f7] text-[#6b6b76] hover:bg-[#eaeaf0]" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-1.5 block text-[12px] font-semibold text-[#4a4a55]">Announcement Title <span className="text-red-500">*</span></span><input className="ui-input w-full" value={form.title} onChange={setField("title")} placeholder="Enter announcement title" maxLength={200} autoFocus /></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-[12px] font-semibold text-[#4a4a55]">Details <span className="text-red-500">*</span></span><textarea className="ui-textarea min-h-[130px] w-full" value={form.body} onChange={setField("body")} placeholder="Write the announcement details" maxLength={5000} /><span className="mt-1 block text-right text-[11px] text-[#9a9aa5]">{form.body.length}/5000</span></label>
          <label><span className="mb-1.5 block text-[12px] font-semibold text-[#4a4a55]">Publish Date <span className="text-red-500">*</span></span><input className="ui-input w-full" type="date" value={form.publish_date} onChange={setField("publish_date")} /></label>
          <label><span className="mb-1.5 block text-[12px] font-semibold text-[#4a4a55]">Expiry Date <span className="font-normal text-[#9a9aa5]">(optional)</span></span><input className="ui-input w-full" type="date" value={form.expiry_date} min={form.publish_date || undefined} onChange={setField("expiry_date")} /></label>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#4a4a55] sm:col-span-2"><input type="checkbox" checked={Boolean(form.is_published)} onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked ? 1 : 0 }))} /> Publish immediately</label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#ececf0] px-5 py-4"><button type="button" onClick={onClose} disabled={saving} className="ui-btn-secondary">Cancel</button><button type="submit" disabled={saving} className="ui-btn-primary disabled:opacity-50">{saving ? "Saving..." : announcement ? "Save Changes" : "Publish Announcement"}</button></div>
      </form>
    </div>
  );
}

function DetailsModal({ announcement, onClose }) {
  if (!announcement) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#ececf0] px-5 py-4"><div><h2 className="text-[18px] font-bold text-[#1a1a1f]">{announcement.title}</h2><p className="mt-1 text-[12px] text-[#6b6b76]">Published {displayDate(announcement.publish_date)}{announcement.expiry_date ? ` · Expires ${displayDate(announcement.expiry_date)}` : ""}</p></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-[#f5f5f7] text-[#6b6b76] hover:bg-[#eaeaf0]" aria-label="Close details"><X className="h-4 w-4" /></button></div><div className="max-h-[60vh] overflow-y-auto px-5 py-5"><p className="whitespace-pre-wrap break-words text-[14px] leading-7 text-[#3f3f49]">{announcement.body}</p></div><div className="flex justify-end border-t border-[#ececf0] px-5 py-4"><button type="button" onClick={onClose} className="ui-btn-secondary">Close</button></div></div></div>;
}

function DeleteModal({ announcement, onClose, onConfirm, busy }) {
  if (!announcement) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h2 className="text-[18px] font-bold text-[#1a1a1f]">Delete announcement?</h2><p className="mt-2 text-[13px] text-[#6b6b76]">This will permanently remove “{announcement.title}”.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className="ui-btn-secondary">Cancel</button><button type="button" onClick={onConfirm} disabled={busy} className="rounded-lg bg-[#dc2626] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">{busy ? "Deleting..." : "Delete"}</button></div></div></div>;
}

export default function Announcements() {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAnnouncements();
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setRows([]);
      setError(requestError.response?.data?.detail || "Could not load announcements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [query]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => [row.title, row.body, row.created_by].filter(Boolean).join(" ").toLowerCase().includes(normalized));
  }, [rows, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = filtered.length ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, filtered.length);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const confirmDelete = async () => {
    setDeletingBusy(true);
    try {
      await deleteAnnouncement(deleting.id);
      addToast("Announcement deleted", "success");
      setDeleting(null);
      await load();
    } catch (requestError) {
      addToast(requestError.response?.data?.detail || "Could not delete announcement.", "error");
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1f]">Announcements</h1><p className="mt-1 text-[13px] text-[#6b6b76]">Publish and manage company announcements.</p></div><button type="button" onClick={() => setEditing({ ...EMPTY_FORM, publish_date: new Date().toISOString().slice(0, 10) })} className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"><Plus className="h-4 w-4" /> Add Announcement</button></div>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{[{ label: "Total", value: rows.length, color: "#0f6d84" }, { label: "Published", value: rows.filter((row) => row.is_published).length, color: "#15803d" }, { label: "Filtered", value: filtered.length, color: "#6b4eff" }].map((item) => <div key={item.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3"><p className="text-[11px] font-medium text-[#6b6b76]">{item.label}</p><p className="mt-0.5 text-[22px] font-bold tabular-nums" style={{ color: item.color }}>{item.value}</p></div>)}</div>
        <div className="ui-card p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-start gap-3"><div className="relative w-full sm:w-56 sm:flex-none"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search announcements" className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[#d0d0d8] focus:bg-white" /></div></div>
          {error ? <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"><span>{error}</span><button type="button" onClick={load} className="font-semibold underline">Retry</button></div> : null}
          <div className="overflow-hidden rounded-lg border border-[#ececf0]"><div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left text-[13px]"><thead><tr className="border-b border-[#e8e8ee] bg-[#f5f5f5] text-[12px] font-medium text-[#6b6b76]"><th className="px-4 py-3">SR No.</th><th className="px-4 py-3">Announcement Title</th><th className="px-4 py-3">Publish Date</th><th className="px-4 py-3">Expiry Date</th><th className="px-4 py-3">Created By</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={7}><Loader label="Loading announcements..." /></td></tr> : pageRows.map((row, index) => <tr key={row.id} className="border-b border-[#f0f0f4] text-[#1a1a1f] last:border-b-0 hover:bg-[#fafafa]"><td className="px-4 py-3.5 text-[#6b6b76]">{(page - 1) * pageSize + index + 1}</td><td className="max-w-[320px] px-4 py-3.5"><div className="truncate font-semibold" title={row.title}>{row.title}</div><div className="mt-0.5 max-w-[320px] truncate text-[12px] text-[#8a8a95]" title={row.body}>{row.body}</div></td><td className="whitespace-nowrap px-4 py-3.5 text-[#4a4a55]">{displayDate(row.publish_date)}</td><td className="whitespace-nowrap px-4 py-3.5 text-[#4a4a55]">{displayDate(row.expiry_date)}</td><td className="px-4 py-3.5 text-[#4a4a55]">{row.created_by || "-"}</td><td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${row.is_published ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>{row.is_published ? "Published" : "Draft"}</span></td><td className="px-4 py-3.5"><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(row)} className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]" title="Edit" aria-label={`Edit ${row.title}`}><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setDeleting(row)} className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444]" title="Delete" aria-label={`Delete ${row.title}`}><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)}</tbody></table></div>{!loading && pageRows.length === 0 ? <div className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No announcements found for {monthLabel(month)}.</div> : null}</div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#6b6b76]"><div className="flex items-center gap-2"><span>Rows per page:</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded border border-[#e2e2e8] bg-white px-2 py-1 outline-none">{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select><span>{from}-{to} of {filtered.length}</span></div><div className="flex items-center gap-1"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button><span className="grid h-8 min-w-8 place-items-center rounded border border-[var(--color-action-teal)] bg-[var(--color-action-teal)] px-2 text-[13px] font-semibold text-white">{page}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button></div></div>
        </div>
      </div>
      {editing ? <AnnouncementModal announcement={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} /> : null}
      <DetailsModal announcement={viewing} onClose={() => setViewing(null)} />
      <DeleteModal announcement={deleting} busy={deletingBusy} onClose={() => setDeleting(null)} onConfirm={confirmDelete} />
    </div>
  );
}

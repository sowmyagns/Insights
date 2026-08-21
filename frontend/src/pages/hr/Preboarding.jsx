import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { inputClass } from "../../design-system/classes";

const PAGE_SIZES = [20, 50, 100];
const PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[440px] flex-col overflow-hidden rounded-l-xl bg-white shadow-2xl animate-[slideInRight_0.28s_ease-out]";

const DEPARTMENTS = ["Sales", "Accountant", "Production", "Operator", "Storage", "HR"];
const STATUSES = ["Offer Sent", "Docs Pending", "Ready to Join"];
const TASKS = ["Document Collection", "ID Verification", "System Access", "Joining Confirmation"];

const STATUS_COLORS = {
  "Offer Sent":    { bg: "#dcfce7", text: "#15803d" },
  "Docs Pending":  { bg: "#fef9c3", text: "#854d0e" },
  "Ready to Join": { bg: "#dcfce7", text: "#15803d" },
};

const WORKFLOW_STEPS = [
  { id: "offers",  label: "Manage Offers",    detail: "Track offer progress" },
  { id: "docs",    label: "Manage Documents", detail: "Collect candidate files" },
  { id: "joiners", label: "New Joiners",      detail: "Prepare employee handoff" },
];

const EMPTY = {
  full_name: "", email: "", phone: "", designation: "",
  department: "", expected_joining: "", status: "Offer Sent", next_task: "Document Collection",
};

function SoftField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[#8a8a95]">
        {label}{required ? <span className="text-[#e11d48]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function CandidateFormPanel({ open, candidate, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (candidate) {
      setForm({
        full_name: candidate.full_name || "",
        email: candidate.email || "",
        phone: candidate.phone || "",
        designation: candidate.designation || "",
        department: candidate.department || "",
        expected_joining: candidate.expected_joining || "",
        status: candidate.status || "Offer Sent",
        next_task: candidate.next_task || "Document Collection",
      });
    } else {
      setForm(EMPTY);
    }
    setError("");
  }, [open, candidate]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) { setError("Full name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError("Enter a valid email address."); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        designation: form.designation.trim() || null,
        department: form.department || null,
        expected_joining: form.expected_joining || null,
        status: form.status,
        next_task: form.next_task || null,
      };
      const response = candidate?.id
        ? await axiosInstance.patch(`/hr/preboarding/${candidate.id}`, payload)
        : await axiosInstance.post("/hr/preboarding", payload);
      onSaved(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-end bg-black/40"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form onSubmit={handleSubmit} className={PANEL_CLASS} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececf0] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">
            {candidate ? "Edit Candidate" : "Add Candidate"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#1a1a1f] hover:bg-[#f5f5f7]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            <SoftField label="Full Name" required>
              <input value={form.full_name} onChange={set("full_name")} placeholder="Enter full name" className={inputClass} />
            </SoftField>

            <div className="grid grid-cols-2 gap-3">
              <SoftField label="Email" required>
                <input type="email" value={form.email} onChange={set("email")} placeholder="Enter email" className={inputClass} />
              </SoftField>
              <SoftField label="Phone">
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="Mobile number" className={inputClass} />
              </SoftField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SoftField label="Designation">
                <input value={form.designation} onChange={set("designation")} placeholder="e.g. Engineer" className={inputClass} />
              </SoftField>
              <SoftField label="Department">
                <select value={form.department} onChange={set("department")} className={inputClass}>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </SoftField>
            </div>

            <SoftField label="Expected Joining Date">
              <input type="date" value={form.expected_joining} onChange={set("expected_joining")} className={inputClass} />
            </SoftField>

            <div className="mt-3 border-t border-[#ececf0] pt-3">
              <p className="mb-2 text-[12px] font-semibold text-[#1a1a1f]">Preboarding Stage</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => {
                  const active = form.status === s;
                  const c = STATUS_COLORS[s] || { bg: "#f3f4f6", text: "#6b7280" };
                  return (
                    <button
                      key={s} type="button"
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className="rounded-full border px-3 py-1.5 text-[12px] font-semibold transition"
                      style={{
                        background: active ? c.bg : "#f9f9fb",
                        color: active ? c.text : "#6b6b76",
                        borderColor: active ? c.text : "#e2e2e8",
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#ececf0] pt-3">
              <SoftField label="Next Task">
                <select value={form.next_task} onChange={set("next_task")} className={inputClass}>
                  {TASKS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </SoftField>
            </div>

            {error && (
              <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#ececf0] px-5 py-3.5">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full py-3 text-[14px]">Cancel</button>
          <button type="submit" disabled={saving} className="ui-btn-primary py-3 text-[14px] disabled:opacity-60">
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function DeleteModal({ open, busy, onClose, onConfirm }) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white px-8 py-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 grid h-[72px] w-[72px] place-items-center rounded-full bg-[#fee2e2]">
          <Trash2 className="h-9 w-9 text-[#ef4444]" strokeWidth={1.75} />
        </div>
        <h3 className="text-[24px] font-bold leading-tight text-[#1a1a1f]">Delete Candidate?</h3>
        <p className="mt-3 text-[14px] leading-relaxed text-[#5a5a66]">
          This action cannot be undone.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-4">
          <button type="button" disabled={busy} onClick={onClose} className="ui-btn-secondary w-full py-3 text-[14px]">No</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="ui-btn-danger w-full py-3 text-[14px]">
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Preboarding() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState("manage");
  const [step, setStep] = useState("offers");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await axiosInstance.get("/hr/preboarding");
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setRecords([]);
      setLoadError(err?.response?.data?.detail || err?.message || "Could not load preboarding candidates.");
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active   = records.filter((r) => !r.is_archived);
  const archived = records.filter((r) => r.is_archived);

  const stepRecords = step === "docs"
    ? active.filter((r) => r.status === "Docs Pending")
    : step === "joiners"
      ? active.filter((r) => r.status === "Ready to Join")
      : active;

  const sourceRecords = tab === "manage" ? stepRecords : archived;
  const list = sourceRecords.filter((r) =>
    !search || (r.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = list.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const thisWeek = active.filter((r) => {
    if (!r.expected_joining) return false;
    const diff = (new Date(r.expected_joining) - new Date()) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;

  const quickUpdate = async (id, patch) => {
    try {
      const response = await axiosInstance.patch(`/hr/preboarding/${id}`, patch);
      setRecords((current) => current.map((record) => record.id === id ? response.data : record));
    } catch (err) {
      setLoadError(err?.response?.data?.detail || err?.message || "Could not update candidate.");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await axiosInstance.delete(`/hr/preboarding/${deleting.id}`);
      setRecords((current) => current.filter((record) => record.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      setLoadError(err?.response?.data?.detail || err?.message || "Could not delete candidate.");
    }
    finally { setDeletingBusy(false); }
  };

  const COLS_OFFERS  = ["SR No.", "Candidate", "Designation", "Department", "Expected Joining", "Status", "Actions"];
  const COLS_DOCS    = ["SR No.", "Candidate", "Email", "Next Task", "Status", "Actions"];
  const COLS_JOINERS = ["SR No.", "Candidate", "Designation", "Department", "Joining Date", "Contact", "Actions"];
  const COLS_ARCH    = ["SR No.", "Candidate", "Designation", "Department", "Status", "Actions"];
  const cols = tab === "archived" ? COLS_ARCH : step === "docs" ? COLS_DOCS : step === "joiners" ? COLS_JOINERS : COLS_OFFERS;

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">Preboarding</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Manage candidates before they officially join.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add Candidate
          </button>
        </div>

        {/* KPI strip */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Preboarding", value: active.length,                                           color: "#0f6d84" },
            { label: "Docs Pending",      value: active.filter((r) => r.status === "Docs Pending").length,  color: "#854d0e" },
            { label: "Joining This Week", value: thisWeek,                                                color: "#1d4ed8" },
            { label: "Ready to Join",     value: active.filter((r) => r.status === "Ready to Join").length, color: "#15803d" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b76]">{k.label}</p>
              <p className="mt-1.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#e4e4ea] bg-white shadow-sm">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-[#ececf0] px-5">
            {[{ id: "manage", label: "Manage Candidates" }, { id: "archived", label: "Archived" }].map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(1); }}
                className={`border-b-2 px-4 py-3 text-[13px] font-semibold transition-all ${
                  tab === t.id
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[#6b6b76] hover:text-[#1a1a1f]"
                }`}
                style={{ marginBottom: -1 }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Workflow steps */}
          {tab === "manage" && (
            <div className="flex flex-wrap gap-2 border-b border-[#f0f0f4] px-5 py-4">
              {WORKFLOW_STEPS.map((ws, idx) => (
                <button
                  key={ws.id}
                  onClick={() => { setStep(ws.id); setPage(1); }}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-all ${
                    step === ws.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[#e2e2e8] bg-white text-[#6b6b76] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    step === ws.id ? "bg-white/25 text-white" : "bg-[#f0f0f4] text-[#6b6b76]"
                  }`}>
                    {idx + 1}
                  </span>
                  {ws.label}
                </button>
              ))}
            </div>
          )}

          {/* Search toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#f0f0f4] px-5 py-4">
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search candidate…"
                className="w-full rounded-lg border border-[#e8e8ee] bg-[#f8f8fb] py-2 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[var(--color-primary)] focus:bg-white transition-colors"
              />
            </div>
            {search && (
              <button onClick={() => setSearch("")} className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] font-semibold text-[#6b6b76] hover:bg-[#f5f5f7] transition-colors">
                ✕ Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                  {cols.map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={cols.length} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">Loading…</td></tr>
                  ) : loadError ? (
                    <tr>
                      <td colSpan={cols.length} className="px-4 py-12 text-center">
                        <p className="text-[13px] font-semibold text-[var(--color-danger)]">{loadError}</p>
                        <button type="button" onClick={load} className="mt-3 text-[12px] font-semibold text-[var(--color-primary)] hover:underline">
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={cols.length} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No candidates found</td></tr>
                  ) : rows.map((r, i) => {
                    const sc = STATUS_COLORS[r.status] || { bg: "#f3f4f6", text: "#6b7280" };
                    return (
                      <tr key={r.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                        <td className="px-4 py-3.5 text-[#6b6b76]">{(page - 1) * pageSize + i + 1}</td>

                        {/* Candidate name cell - always col 2 */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[13px] font-bold text-[var(--color-primary)]">
                              {(r.full_name || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-[13px] font-semibold text-[#1a1a1f]">{r.full_name || "—"}</div>
                              {tab !== "archived" && step === "docs" && <div className="text-[11px] text-[#6b6b76]">{r.email || ""}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Offers columns */}
                        {tab !== "archived" && step === "offers" && <>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.designation || "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.department || "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{r.expected_joining || "Not set"}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: sc.bg, color: sc.text }}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <button disabled={r.status === "Ready to Join"} onClick={() => quickUpdate(r.id, { status: r.status === "Offer Sent" ? "Docs Pending" : "Ready to Join" })}
                                className="rounded-lg border border-[#e2e2e8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1a1a1f] hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-40">
                                {r.status === "Offer Sent" ? "→ Docs" : r.status === "Docs Pending" ? "→ Ready" : "Ready"}
                              </button>
                              <button onClick={() => { setEditing(r); setFormOpen(true); }} className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[#e4e6fc]" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                              <button onClick={() => setDeleting(r)} className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada]" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </>}

                        {/* Docs columns */}
                        {tab !== "archived" && step === "docs" && <>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.email || "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.next_task || "Document Collection"}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: sc.bg, color: sc.text }}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => quickUpdate(r.id, { status: "Ready to Join" })}
                                className="rounded-lg border border-[#e2e2e8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1a1a1f] hover:bg-[#f5f5f7]">
                                → Ready
                              </button>
                              <button onClick={() => { setEditing(r); setFormOpen(true); }} className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[#e4e6fc]" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                              <button onClick={() => setDeleting(r)} className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada]" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </>}

                        {/* Joiners columns */}
                        {tab !== "archived" && step === "joiners" && <>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.designation || "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.department || "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{r.expected_joining || "Not set"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.email || r.phone || "—"}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => quickUpdate(r.id, { is_archived: true })}
                                className="rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90">
                                Complete Handoff
                              </button>
                              <button onClick={() => { setEditing(r); setFormOpen(true); }} className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[#e4e6fc]" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </>}

                        {/* Archived columns */}
                        {tab === "archived" && <>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.designation || "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.department || "—"}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: sc.bg, color: sc.text }}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <button onClick={() => setDeleting(r)} className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada]" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                          </td>
                        </>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f4] px-5 py-3.5 text-[12px] text-[#6b6b76]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded border border-[#e2e2e8] bg-white px-2 py-1 outline-none">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{total === 0 ? "0-0 of 0" : `${from}-${to} of ${total}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors" aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" className="grid h-8 min-w-[32px] place-items-center rounded-lg border px-2 text-[13px] font-semibold text-white" style={{ background: "var(--color-primary)", borderColor: "var(--color-primary)" }}>
                {page}
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors" aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

      <CandidateFormPanel
        open={formOpen}
        candidate={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={(saved) => {
          setRecords((current) => {
            const exists = current.some((record) => record.id === saved.id);
            return exists
              ? current.map((record) => record.id === saved.id ? saved : record)
              : [saved, ...current];
          });
          setFormOpen(false);
          setEditing(null);
        }}
      />
      <DeleteModal
        open={Boolean(deleting)}
        busy={deletingBusy}
        onClose={() => !deletingBusy && setDeleting(null)}
        onConfirm={confirmDelete}
      />
      </div>
  );
}

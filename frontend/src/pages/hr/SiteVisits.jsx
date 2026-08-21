import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Eye,
  FileSpreadsheet,
} from "lucide-react";

import { api } from "../api";
import { inputClass } from "../../design-system/classes";
import { exportToExcel } from "../../utils/exportUtils";
import { useToast } from "../../context/ToastContext";

/* ─── constants ─────────────────────────────────────────────────────────────── */

const PAGE_SIZES = [10, 20, 50];

const VISIT_TYPES = ["Sales", "Support", "Demo", "Site Survey", "Client Meeting", "Other"];

const TYPE_COLORS = {
  Sales:            { bg: "#dbeafe", text: "#1d4ed8" },
  Support:          { bg: "#dcfce7", text: "#15803d" },
  Demo:             { bg: "#f3e8ff", text: "#7e22ce" },
  "Site Survey":    { bg: "#fef9c3", text: "#854d0e" },
  "Client Meeting": { bg: "#ffedd5", text: "#9a3412" },
  Other:            { bg: "#f3f4f6", text: "#4b5563" },
};

const PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-l-xl bg-white shadow-2xl animate-[slideInRight_0.28s_ease-out]";

const EMPTY_FORM = {
  employee_id: "",
  visit_date: new Date().toISOString().slice(0, 10),
  visit_type: "Sales",
  purpose: "",
  client_name: "",
  check_in_time: "",
  check_out_time: "",
  notes: "",
};

/* ─── helpers ────────────────────────────────────────────────────────────────── */

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ─── SoftField label ────────────────────────────────────────────────────────── */
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

/* ─── Slide-in form panel ───────────────────────────────────────────────────── */
function SiteVisitFormPanel({ open, visit, employees, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { addToast } = useToast();

  useEffect(() => {
    if (!open) return;
    if (visit) {
      setForm({
        employee_id: String(visit.employee_id || ""),
        visit_date: visit.visit_date || new Date().toISOString().slice(0, 10),
        visit_type: visit.visit_type || "Sales",
        purpose: visit.purpose || "",
        client_name: visit.client_name || "",
        check_in_time: visit.check_in_time || "",
        check_out_time: visit.check_out_time || "",
        notes: visit.notes || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError("");
  }, [open, visit]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id) { setError("Please select an employee."); return; }
    if (!form.visit_date)  { setError("Visit date is required."); return; }
    if (form.check_in_time && form.check_out_time && form.check_out_time <= form.check_in_time) {
      setError("Check-out time must be after check-in time.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        employee_id: Number(form.employee_id),
        visit_date: form.visit_date,
        visit_type: form.visit_type || null,
        purpose: form.purpose.trim() || null,
        client_name: form.client_name.trim() || null,
        check_in_time: form.check_in_time || null,
        check_out_time: form.check_out_time || null,
        notes: form.notes.trim() || null,
      };
      if (visit?.id) await api.siteVisits.update(visit.id, payload);
      else await api.siteVisits.create(payload);
      addToast(visit?.id ? "Visit updated." : "Visit added.", "success");
      onSaved();
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
      <form
        onSubmit={handleSubmit}
        className={PANEL_CLASS}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececf0] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">
            {visit ? "Edit Site Visit" : "Log Site Visit"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#1a1a1f] hover:bg-[#f5f5f7]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4">
          <div className="space-y-3">

            {/* Employee */}
            <SoftField label="Employee" required>
              <select value={form.employee_id} onChange={set("employee_id")} className={inputClass}>
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </SoftField>

            {/* Visit type + date */}
            <div className="grid grid-cols-2 gap-3">
              <SoftField label="Type of Visit" required>
                <select value={form.visit_type} onChange={set("visit_type")} className={inputClass}>
                  {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </SoftField>
              <SoftField label="Visit Date" required>
                <input type="date" value={form.visit_date} onChange={set("visit_date")} className={inputClass} />
              </SoftField>
            </div>

            {/* Client name + Purpose */}
            <SoftField label="Client / Company Name">
              <input value={form.client_name} onChange={set("client_name")} placeholder="e.g. ABC Corp" className={inputClass} />
            </SoftField>
            <SoftField label="Purpose">
              <input value={form.purpose} onChange={set("purpose")} placeholder="Brief purpose of visit" className={inputClass} />
            </SoftField>

            {/* Check-in / Check-out times */}
            <div className="grid grid-cols-2 gap-3">
              <SoftField label="Check-in Time">
                <input type="time" value={form.check_in_time} onChange={set("check_in_time")} className={inputClass} />
              </SoftField>
              <SoftField label="Check-out Time">
                <input type="time" value={form.check_out_time} onChange={set("check_out_time")} className={inputClass} />
              </SoftField>
            </div>

            {/* Notes */}
            <div className="border-t border-[#ececf0] pt-3">
              <SoftField label="Notes">
                <textarea
                  value={form.notes}
                  onChange={set("notes")}
                  placeholder="Additional remarks…"
                  rows={3}
                  className={`${inputClass} min-h-[68px] resize-y`}
                />
              </SoftField>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#ececf0] px-5 py-3.5">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full py-3 text-[14px]">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="ui-btn-primary py-3 text-[14px] disabled:opacity-60">
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

/* ─── Delete modal ───────────────────────────────────────────────────────────── */
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
        <h3 className="text-[24px] font-bold leading-tight text-[#1a1a1f]">Delete Site Visit?</h3>
        <p className="mt-3 text-[14px] leading-relaxed text-[#5a5a66]">This action cannot be undone.</p>
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

/* ─── View modal ─────────────────────────────────────────────────────────────── */
function ViewModal({ visit, onClose }) {
  if (!visit) return null;
  const tc = TYPE_COLORS[visit.visit_type] || TYPE_COLORS.Other;
  const rows = [
    { label: "Employee",         value: visit.employee_name || "—" },
    { label: "Type",             value: visit.visit_type || "—" },
    { label: "Visit Date",       value: fmtDate(visit.visit_date) },
    { label: "Client / Company", value: visit.client_name || "—" },
    { label: "Purpose",          value: visit.purpose || "—" },
    { label: "Check-in Time",    value: visit.check_in_time || "—" },
    { label: "Check-out Time",   value: visit.check_out_time || "—" },
    { label: "Check-in Address", value: visit.check_in_address || "—" },
    { label: "Check-out Addr.",  value: visit.check_out_address || "—" },
    { label: "Notes",            value: visit.notes || "—" },
  ];
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">Site Visit Details</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#1a1a1f] hover:bg-[#f5f5f7]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 border-b border-[#ececf0] px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[15px] font-bold text-[var(--color-primary)]">
            {getInitials(visit.employee_name || "?")}
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#1a1a1f]">{visit.employee_name || "Unknown"}</p>
            <span
              className="mt-0.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: tc.bg, color: tc.text }}
            >
              {visit.visit_type || "—"}
            </span>
          </div>
        </div>
        <div className="max-h-[55vh] divide-y divide-[#f0f0f4] overflow-y-auto px-5">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 py-3">
              <span className="min-w-[130px] text-[12px] font-medium text-[#8a8a95]">{label}</span>
              <span className="flex-1 text-right text-[13px] font-medium text-[#1a1a1f]">{value}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#ececf0] px-5 py-3.5">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full py-2.5 text-[14px]">Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Main SiteVisits page ───────────────────────────────────────────────────── */
export default function SiteVisits({ employees = [] }) {
  const { addToast } = useToast();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.siteVisits.list();
      setVisits(Array.isArray(data) ? data : []);
    } catch {
      setVisits([]);
      addToast("Failed to load site visits", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  /* derived */
  const filtered = visits.filter((v) => {
    const q = search.trim().toLowerCase();
    const text = `${v.employee_name} ${v.client_name} ${v.purpose} ${v.visit_type}`.toLowerCase();
    return (!q || text.includes(q)) && (typeFilter === "all" || v.visit_type === typeFilter);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  /* KPIs */
  const typeCount = (t) => visits.filter((v) => v.visit_type === t).length;

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.siteVisits.delete(deleting.id);
      setDeleting(null);
      addToast("Site visit deleted.", "success");
      load();
    } catch {
      addToast("Failed to delete.", "error");
    } finally {
      setDeletingBusy(false);
    }
  };

  const onExport = () => {
    exportToExcel(
      filtered.map((v) => ({
        Employee: v.employee_name || "",
        Type: v.visit_type || "",
        "Visit Date": v.visit_date || "",
        "Client / Company": v.client_name || "",
        Purpose: v.purpose || "",
        "Check-in": v.check_in_time || "",
        "Check-out": v.check_out_time || "",
        "Check-in Address": v.check_in_address || "",
        "Check-out Address": v.check_out_address || "",
        Notes: v.notes || "",
      })),
      [],
      "site-visits"
    );
    addToast("Exported to Excel", "success");
  };

  const COLS = ["SR No.", "Employee", "Type", "Client / Company", "Purpose", "Date", "Check-in", "Check-out", "Actions"];

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        {/* ── Page header ── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">Site Visits</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Track and manage employee field visits and client meetings.
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Log Visit
          </button>
        </div>

        {/* ── KPI strip ── */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Visits",    value: visits.length,          color: "#0f6d84" },
            { label: "Sales Visits",    value: typeCount("Sales"),      color: "#1d4ed8" },
            { label: "Client Meetings", value: typeCount("Client Meeting"), color: "#7e22ce" },
            { label: "Site Surveys",    value: typeCount("Site Survey"), color: "#854d0e" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b76]">{k.label}</p>
              <p className="mt-1.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div className="rounded-xl border border-[#e4e4ea] bg-white shadow-sm">

          {/* Filters toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#f0f0f4] px-5 py-4">
            {/* Search */}
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search employee, client, purpose…"
                className="w-full rounded-lg border border-[#e8e8ee] bg-[#f8f8fb] py-2 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[var(--color-primary)] focus:bg-white transition-colors"
              />
            </div>

            {/* Clear search */}
            {search && (
              <button
                onClick={() => setSearch("")}
                className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] font-semibold text-[#6b6b76] hover:bg-[#f5f5f7] transition-colors"
              >
                ✕ Clear
              </button>
            )}

            {/* Visit type filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">All Types</option>
              {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>

            {/* Export */}
            <button
              type="button"
              onClick={onExport}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] font-semibold text-[#4a4a55] hover:bg-[#f5f5f7] transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#16a34a]" /> Export
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                  {COLS.map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={COLS.length} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-[#8a8a96]">
                        <MapPin className="h-10 w-10 opacity-30" />
                        <p className="text-[13px]">No site visits found.</p>
                        <button
                          onClick={() => { setEditing(null); setFormOpen(true); }}
                          className="mt-1 text-[13px] font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          + Log a visit
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((v, i) => {
                    const tc = TYPE_COLORS[v.visit_type] || TYPE_COLORS.Other;
                    return (
                      <tr key={v.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                        {/* SR */}
                        <td className="px-4 py-3.5 text-[#6b6b76]">{(page - 1) * pageSize + i + 1}</td>

                        {/* Employee */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[12px] font-bold text-[var(--color-primary)]">
                              {getInitials(v.employee_name || "?")}
                            </div>
                            <span className="text-[13px] font-semibold text-[#1a1a1f]">
                              {v.employee_name || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3.5">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{ background: tc.bg, color: tc.text }}
                          >
                            {v.visit_type || "—"}
                          </span>
                        </td>

                        {/* Client */}
                        <td className="max-w-[160px] truncate px-4 py-3.5 text-[#4a4a55]" title={v.client_name || ""}>
                          {v.client_name || "—"}
                        </td>

                        {/* Purpose */}
                        <td className="max-w-[180px] truncate px-4 py-3.5 text-[#4a4a55]" title={v.purpose || ""}>
                          {v.purpose || "—"}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#4a4a55]">{fmtDate(v.visit_date)}</td>

                        {/* Check-in */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#4a4a55]">{v.check_in_time || "—"}</td>

                        {/* Check-out */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#4a4a55]">{v.check_out_time || "—"}</td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewing(v)}
                              className="grid h-8 w-8 place-items-center rounded-full bg-[#e0f2f7] text-[#0f6d84] hover:bg-[#c8eaf2] transition-colors"
                              title="View"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setEditing(v); setFormOpen(true); }}
                              className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[#e4e6fc] transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleting(v)}
                              className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada] transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f4] px-5 py-3.5 text-[12px] text-[#6b6b76]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded border border-[#e2e2e8] bg-white px-2 py-1 outline-none"
              >
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{total === 0 ? "0–0 of 0" : `${from}–${to} of ${total}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="grid h-8 min-w-[32px] place-items-center rounded-lg border px-2 text-[13px] font-semibold text-white"
                style={{ background: "var(--color-primary)", borderColor: "var(--color-primary)" }}
              >
                {page}
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals ── */}
      <SiteVisitFormPanel
        open={formOpen}
        visit={editing}
        employees={employees}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
      />
      <ViewModal visit={viewing} onClose={() => setViewing(null)} />
      <DeleteModal
        open={Boolean(deleting)}
        busy={deletingBusy}
        onClose={() => !deletingBusy && setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

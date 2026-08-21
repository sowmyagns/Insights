import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { api } from "../api";
import { inputClass } from "../../design-system/classes";
import { exportToExcel } from "../../utils/exportUtils";
import { useToast } from "../../context/ToastContext";

/* ─── constants ─────────────────────────────────────────────────────────────── */

const PAGE_SIZES = [10, 20, 50];

const CATEGORIES = [
  "Travel", "Meals", "Office Supplies", "Client Entertainment", "Software", "Other",
];

const STATUS_COLORS = {
  pending:  { bg: "#fef9c3", text: "#854d0e" },
  approved: { bg: "#dcfce7", text: "#15803d" },
  rejected: { bg: "#fee2e2", text: "#dc2626" },
};

const WORKFLOW_STEPS = [
  { id: "my",        label: "My Expenses",       detail: "Submit & track your claims"          },
  { id: "approvals", label: "Expense Approvals",  detail: "Review & approve pending requests"   },
  { id: "overview",  label: "Overview",            detail: "Full expense summary"                },
];

const PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[440px] flex-col overflow-hidden rounded-l-xl bg-white shadow-2xl animate-[slideInRight_0.28s_ease-out]";

const EMPTY_FORM = {
  employee_id: "",
  category: "Travel",
  name: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  note: "",
};

/* ─── helpers ────────────────────────────────────────────────────────────────── */

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

function fmtINR(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function parseMeta(description) {
  try {
    const v = JSON.parse(description || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return { note: description || "" };
  }
}

function normalizeExpense(row) {
  const meta = parseMeta(row.description);
  return {
    ...row,
    date: row.expense_date || row.date || "",
    name: row.vendor || meta.name || "Expense",
    employee_id: String(meta.employee_id || row.employee_id || ""),
    status: meta.status || row.status || "pending",
    note: meta.note || "",
  };
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ─── SoftField label wrapper (matches Preboarding) ─────────────────────────── */
function SoftField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[#8a8a95]">
        {label}
        {required ? <span className="text-[#e11d48]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

/* ─── Slide-in form panel ───────────────────────────────────────────────────── */
function ExpenseFormPanel({ open, expense, employees, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { addToast } = useToast();

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setForm({
        employee_id: String(expense.employee_id || ""),
        category: expense.category || "Travel",
        name: expense.name || "",
        amount: String(expense.amount || ""),
        date: expense.date || new Date().toISOString().slice(0, 10),
        note: expense.note || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError("");
  }, [open, expense]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id) { setError("Please select an employee."); return; }
    if (!form.name.trim()) { setError("Expense name is required."); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError("Enter a valid amount."); return; }
    if (!form.date) { setError("Date is required."); return; }

    setSaving(true);
    setError("");
    try {
      const description = JSON.stringify({
        employee_id: form.employee_id,
        name: form.name.trim(),
        note: (form.note || "").trim(),
        status: expense?.status || "pending",
      });
      const payload = {
        category: form.category,
        vendor: form.name.trim(),
        amount: Number(form.amount),
        expense_date: form.date,
        description,
      };
      if (expense?.id) await api.expenses.update(expense.id, payload);
      else await api.expenses.create(payload);
      addToast(expense?.id ? "Expense updated." : "Expense added.", "success");
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
            {expense ? "Edit Expense" : "Add Expense"}
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
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </SoftField>

            {/* Category + Date */}
            <div className="grid grid-cols-2 gap-3">
              <SoftField label="Category" required>
                <select value={form.category} onChange={set("category")} className={inputClass}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </SoftField>
              <SoftField label="Date" required>
                <input
                  type="date"
                  value={form.date}
                  onChange={set("date")}
                  className={inputClass}
                />
              </SoftField>
            </div>

            {/* Expense name */}
            <SoftField label="Expense Name" required>
              <input
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Client travel, office supplies"
                className={inputClass}
              />
            </SoftField>

            {/* Amount */}
            <SoftField label="Amount (₹)" required>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={set("amount")}
                placeholder="0.00"
                className={inputClass}
              />
            </SoftField>

            {/* Notes */}
            <div className="border-t border-[#ececf0] pt-3">
              <SoftField label="Notes / Details">
                <textarea
                  value={form.note}
                  onChange={set("note")}
                  placeholder="Add supporting details or context…"
                  rows={3}
                  className={`${inputClass} min-h-[72px] resize-y`}
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
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-secondary w-full py-3 text-[14px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="ui-btn-primary py-3 text-[14px] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

/* ─── Delete modal ──────────────────────────────────────────────────────────── */
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
        <h3 className="text-[24px] font-bold leading-tight text-[#1a1a1f]">Delete Expense?</h3>
        <p className="mt-3 text-[14px] leading-relaxed text-[#5a5a66]">
          This action cannot be undone.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="ui-btn-secondary w-full py-3 text-[14px]"
          >
            No
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="ui-btn-danger w-full py-3 text-[14px]"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── View detail modal ──────────────────────────────────────────────────────── */
function ViewModal({ expense, employeeNames, onClose }) {
  if (!expense) return null;
  const sc = STATUS_COLORS[expense.status] || { bg: "#f3f4f6", text: "#6b7280" };
  const details = [
    { label: "Employee",     value: employeeNames[String(expense.employee_id)] || "Unassigned" },
    { label: "Category",     value: expense.category || "—" },
    { label: "Date",         value: fmtDate(expense.date) },
    { label: "Amount",       value: fmtINR(expense.amount) },
    { label: "Notes",        value: expense.note || "—" },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">Expense Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#1a1a1f] hover:bg-[#f5f5f7]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Avatar + name + status */}
        <div className="flex items-center gap-3 border-b border-[#ececf0] px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[15px] font-bold text-[var(--color-primary)]">
            {getInitials(expense.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-[#1a1a1f]">{expense.name}</p>
            <span
              className="mt-0.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
              style={{ background: sc.bg, color: sc.text }}
            >
              {expense.status}
            </span>
          </div>
        </div>
        <div className="divide-y divide-[#f0f0f4] px-5">
          {details.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 py-3">
              <span className="min-w-[110px] text-[12px] font-medium text-[#8a8a95]">{label}</span>
              <span className="flex-1 text-right text-[13px] font-medium text-[#1a1a1f]">{value}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#ececf0] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-secondary w-full py-2.5 text-[14px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
export default function Expenses({ employees = [], apiMode = true, refreshFromApi }) {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get("view") || "expenses-my";
  // map query param to step id
  const activeStep =
    viewParam === "expenses-approvals" ? "approvals"
    : viewParam === "expenses-overview" ? "overview"
    : "my";

  const { addToast } = useToast();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const employeeNames = Object.fromEntries(
    employees.map((e) => [String(e.id), e.name || e.full_name || `Employee #${e.id}`])
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.expenses.list({ year: new Date().getFullYear() });
      setExpenses(Array.isArray(data) ? data.map(normalizeExpense) : []);
    } catch {
      setExpenses([]);
      addToast("Failed to load expenses", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { if (apiMode) load(); }, [apiMode, load]);

  // Reset on view change
  useEffect(() => {
    setPage(1);
    setSearch("");
    setStatusFilter("all");
  }, [activeStep]);

  /* ── derived ── */
  const filtered = expenses.filter((e) => {
    const q = search.trim().toLowerCase();
    const empName = employeeNames[e.employee_id] || "";
    const text = `${e.name} ${e.category} ${e.note} ${empName}`.toLowerCase();
    return (!q || text.includes(q)) && (statusFilter === "all" || e.status === statusFilter);
  });

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  /* ── KPI counts ── */
  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const pendingCount = expenses.filter((e) => e.status === "pending").length;
  const approvedCount = expenses.filter((e) => e.status === "approved").length;
  const rejectedCount = expenses.filter((e) => e.status === "rejected").length;

  /* ── actions ── */
  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.expenses.delete(deleting.id);
      setDeleting(null);
      addToast("Expense deleted.", "success");
      load();
    } catch {
      addToast("Failed to delete expense.", "error");
    } finally {
      setDeletingBusy(false);
    }
  };

  const setApproval = async (expense, nextStatus) => {
    try {
      await api.expenses.approve(expense.id, nextStatus);
      addToast(`Expense ${nextStatus}.`, "success");
      load();
    } catch {
      addToast("Failed to update status.", "error");
    }
  };

  const onExport = () => {
    exportToExcel(
      filtered.map((e) => ({
        ...e,
        employee: employeeNames[e.employee_id] || e.employee_id || "",
      })),
      [
        { key: "employee",  label: "Employee" },
        { key: "category",  label: "Category" },
        { key: "name",      label: "Expense Name" },
        { key: "amount",    label: "Amount" },
        { key: "date",      label: "Date" },
        { key: "status",    label: "Status" },
        { key: "note",      label: "Notes" },
      ],
      "expenses"
    );
    addToast("Exported to Excel", "success");
  };

  const isApprovals = activeStep === "approvals";
  const isOverview  = activeStep === "overview";
  const isMy        = activeStep === "my";

  /* ── table columns ── */
  const COLS = isApprovals
    ? ["SR No.", "Employee", "Category", "Expense Name", "Date", "Amount", "Status", "Actions"]
    : isOverview
    ? ["SR No.", "Employee", "Category", "Expense Name", "Date", "Amount", "Status"]
    : ["SR No.", "Employee", "Category", "Expense Name", "Date", "Amount", "Status", "Actions"];

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        {/* ── Page header ── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">
              Expense Management
            </h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Track, submit and approve employee expense claims.
            </p>
          </div>
          {isMy && (
            <button
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" /> Add Expense
            </button>
          )}
        </div>

        {/* ── KPI strip ── */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Expenses",  value: expenses.length,   color: "#0f6d84" },
            { label: "Total Amount",    value: fmtINR(totalAmount), color: "#6b4eff" },
            { label: "Pending",         value: pendingCount,       color: "#854d0e" },
            { label: "Approved",        value: approvedCount,      color: "#15803d" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b76]">{k.label}</p>
              <p className="mt-1.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>
                {k.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div className="rounded-xl border border-[#e4e4ea] bg-white shadow-sm">

          {/* Workflow step pills */}
          <div className="flex flex-wrap gap-2 border-b border-[#f0f0f4] px-5 py-4">
            {WORKFLOW_STEPS.map((ws, idx) => (
              <a
                key={ws.id}
                href={`?view=expenses-${ws.id}`}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-all ${
                  activeStep === ws.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[#e2e2e8] bg-white text-[#6b6b76] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    activeStep === ws.id
                      ? "bg-white/25 text-white"
                      : "bg-[#f0f0f4] text-[#6b6b76]"
                  }`}
                >
                  {idx + 1}
                </span>
                {ws.label}
              </a>
            ))}
          </div>

          {/* Search + filter toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#f0f0f4] px-5 py-4">
            {/* Search */}
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, category…"
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
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
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
            <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                  {COLS.map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={COLS.length} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">
                      No expense records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((exp, i) => {
                    const sc = STATUS_COLORS[exp.status] || { bg: "#f3f4f6", text: "#6b7280" };
                    const empName = employeeNames[String(exp.employee_id)] || exp.employee_id || "Unassigned";

                    return (
                      <tr
                        key={exp.id}
                        className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors"
                      >
                        {/* SR */}
                        <td className="px-4 py-3.5 text-[#6b6b76]">
                          {(page - 1) * pageSize + i + 1}
                        </td>

                        {/* Employee with avatar */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[12px] font-bold text-[var(--color-primary)]">
                              {getInitials(empName)}
                            </div>
                            <span className="text-[13px] font-semibold text-[#1a1a1f]">
                              {empName}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5 text-[#4a4a55]">{exp.category}</td>

                        {/* Expense name */}
                        <td className="max-w-[180px] truncate px-4 py-3.5 font-medium text-[#1a1a1f]" title={exp.name}>
                          {exp.name}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#4a4a55]">
                          {fmtDate(exp.date)}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 font-bold text-[#1a1a1f]">
                          {fmtINR(exp.amount)}
                        </td>

                        {/* Status badge */}
                        <td className="px-4 py-3.5">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                            style={{ background: sc.bg, color: sc.text }}
                          >
                            {exp.status}
                          </span>
                        </td>

                        {/* Actions — hidden in overview */}
                        {!isOverview && (
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              {/* View */}
                              <button
                                onClick={() => setViewing(exp)}
                                className="grid h-8 w-8 place-items-center rounded-full bg-[#e0f2f7] text-[#0f6d84] hover:bg-[#c8eaf2] transition-colors"
                                title="View"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {/* Edit — only my expenses, only pending */}
                              {isMy && exp.status === "pending" && (
                                <button
                                  onClick={() => { setEditing(exp); setFormOpen(true); }}
                                  className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[#e4e6fc] transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Approve / Reject — only in approvals, only pending */}
                              {isApprovals && exp.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => setApproval(exp, "approved")}
                                    className="rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 transition-opacity"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setApproval(exp, "rejected")}
                                    className="rounded-lg border border-[#e2e2e8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#ef4444] hover:bg-[#fee2e2] transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {/* Delete — only in my expenses */}
                              {isMy && (
                                <button
                                  onClick={() => setDeleting(exp)}
                                  className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada] transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
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
      <ExpenseFormPanel
        open={formOpen}
        expense={editing}
        employees={employees}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => { setFormOpen(false); setEditing(null); load(); refreshFromApi?.(); }}
      />
      <ViewModal
        expense={viewing}
        employeeNames={employeeNames}
        onClose={() => setViewing(null)}
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

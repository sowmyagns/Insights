import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { inputClass } from "../../design-system/classes";

const PAGE_SIZES = [20, 50, 100];
const LEAVE_TYPES = [
  "Casual Leave", "Compensatory Off", "Earned Leave", "Leave Without Pay",
  "Maternity Leave", "Paternity Leave", "Sabbatical Leave", "Sick Leave",
];
const PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-l-xl bg-white shadow-2xl animate-[slideInRight_0.28s_ease-out]";
const EMPTY = { name: "", effective_from: "", effective_to: "", leave_types: [], description: "" };

function SoftField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[#8a8a95]">
        {label}{required && <span className="text-[#e11d48]"> *</span>}
      </span>
      {children}
    </label>
  );
}

function PlanFormPanel({ open, plan, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (plan) {
      let lt = [];
      try { lt = plan.leave_types ? JSON.parse(plan.leave_types) : []; } catch { lt = []; }
      setForm({
        name: plan.name || "",
        effective_from: plan.effective_from || "",
        effective_to: plan.effective_to || "",
        leave_types: Array.isArray(lt) ? lt : [],
        description: plan.description || "",
      });
    } else {
      setForm(EMPTY);
    }
    setError("");
  }, [open, plan]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleType = (t) => setForm((f) => ({
    ...f,
    leave_types: f.leave_types.includes(t)
      ? f.leave_types.filter((x) => x !== t)
      : [...f.leave_types, t],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Plan name is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        name: form.name.trim(),
        effective_from: form.effective_from || null,
        effective_to: form.effective_to || null,
        leave_types: form.leave_types,
        description: form.description || null,
      };
      if (plan?.id) {
        await axiosInstance.patch(`/hr/leave-plans/${plan.id}`, payload);
      } else {
        await axiosInstance.post("/hr/leave-plans", payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Save failed.");
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-end bg-black/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <form onSubmit={handleSubmit} className={PANEL_CLASS} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececf0] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">{plan ? "Edit Leave Plan" : " Leave Plan"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[#f5f5f7]"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-3">
          <SoftField label="Plan Name" required>
            <input value={form.name} onChange={set("name")} placeholder="e.g. Annual Leave Plan 2025" className={inputClass} />
          </SoftField>
          <div className="grid grid-cols-2 gap-3">
            <SoftField label="Effective From">
              <input type="date" value={form.effective_from} onChange={set("effective_from")} className={inputClass} />
            </SoftField>
            <SoftField label="Effective To">
              <input type="date" value={form.effective_to} onChange={set("effective_to")} className={inputClass} />
            </SoftField>
          </div>
          <div>
            <p className="mb-2 text-[12px] font-medium text-[#8a8a95]">Leave Types Included</p>
            <div className="flex flex-wrap gap-2">
              {LEAVE_TYPES.map((t) => {
                const active = form.leave_types.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleType(t)}
                    className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                      active
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[#e2e2e8] bg-white text-[#6b6b76] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    }`}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <SoftField label="Description">
            <textarea value={form.description} onChange={set("description")} placeholder="Optional description" rows={3} className={inputClass + " resize-none"} />
          </SoftField>
          {error && <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</div>}
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#ececf0] px-5 py-3.5">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full py-3 text-[14px]">Cancel</button>
          <button type="submit" disabled={saving} className="ui-btn-primary py-3 text-[14px] disabled:opacity-60">
            {saving ? "Saving…" : "Save Plan"}
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="w-full max-w-[420px] rounded-2xl bg-white px-8 py-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 grid h-[72px] w-[72px] place-items-center rounded-full bg-[#fee2e2]">
          <Trash2 className="h-9 w-9 text-[#ef4444]" strokeWidth={1.75} />
        </div>
        <h3 className="text-[22px] font-bold text-[#1a1a1f]">Delete Leave Plan?</h3>
        <p className="mt-2 text-[14px] text-[#5a5a66]">This action cannot be undone.</p>
        <div className="mt-7 grid grid-cols-2 gap-4">
          <button disabled={busy} onClick={onClose} className="ui-btn-secondary w-full py-3 text-[14px]">No</button>
          <button disabled={busy} onClick={onConfirm} className="ui-btn-danger w-full py-3 text-[14px]">{busy ? "Deleting…" : "Delete"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function LeavePlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/hr/leave-plans");
      setPlans(Array.isArray(res.data) ? res.data : []);
    } catch { setPlans([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = plans.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = plans.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await axiosInstance.delete(`/hr/leave-plans/${deleting.id}`);
      setDeleting(null); load();
    } catch { /* ignore */ }
    finally { setDeletingBusy(false); }
  };

  const parseTypes = (lt) => {
    try { return lt ? JSON.parse(lt) : []; } catch { return []; }
  };

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-[var(--color-text)]">Leave Plans</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Configure and manage leave plans for your organization.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Leave Plan
          </button>
        </div>

        {/* KPI strip */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Total Plans", value: plans.length, color: "var(--color-primary)" },
            { label: "Active Plans", value: plans.filter((p) => !p.effective_to || p.effective_to >= new Date().toISOString().slice(0, 10)).length, color: "#15803d" },
            { label: "Leave Types Covered", value: [...new Set(plans.flatMap((p) => parseTypes(p.leave_types)))].length, color: "#1d4ed8" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3">
              <p className="text-[11px] font-medium text-[#6b6b76]">{k.label}</p>
              <p className="mt-0.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="ui-card p-4 sm:p-5">
          <div className="overflow-hidden rounded-lg border border-[#ececf0]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#e8e8ee] bg-[#f5f5f5] text-[12px] font-medium text-[#6b6b76]">
                    {["SR No.", "Plan Name", "Effective From", "Effective To", "Leave Types", "Created By", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No leave plans found</td></tr>
                  ) : rows.map((r, i) => {
                    const types = parseTypes(r.leave_types);
                    return (
                      <tr key={r.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa]">
                        <td className="px-4 py-3.5 text-[#6b6b76]">{(page - 1) * pageSize + i + 1}</td>
                        <td className="px-4 py-3.5 font-semibold text-[#1a1a1f]">{r.name}</td>
                        <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{r.effective_from || "—"}</td>
                        <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{r.effective_to || "—"}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {types.length === 0 ? <span className="text-[#9a9aa5]">—</span> : types.slice(0, 3).map((t) => (
                              <span key={t} className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">{t}</span>
                            ))}
                            {types.length > 3 && <span className="text-[11px] text-[#6b6b76]">+{types.length - 3}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[#6b6b76]">{r.created_by || "—"}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => { setEditing(r); setFormOpen(true); }}
                              className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[#e4e6fc]">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleting(r)}
                              className="grid h-7 w-7 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada]">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#6b6b76]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded border border-[#e2e2e8] bg-white px-2 py-1 outline-none">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{total === 0 ? "0-0 of 0" : `${from}-${to} of ${total}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="grid h-8 min-w-8 place-items-center rounded border px-2 text-[13px] font-semibold text-white"
                style={{ background: "var(--color-action-teal)", borderColor: "var(--color-action-teal)" }}>
                {page}
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <PlanFormPanel
        open={formOpen}
        plan={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
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

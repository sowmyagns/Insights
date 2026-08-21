import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft, ChevronRight, Eye, Package,
  Pencil, Plus, Search, Trash2, X, FileSpreadsheet,
} from "lucide-react";

import { api } from "../api";
import { inputClass } from "../../design-system/classes";
import { exportToExcel } from "../../utils/exportUtils";
import { useToast } from "../../context/ToastContext";

/* ─── constants ──────────────────────────────────────────────────────────── */
const PAGE_SIZES = [10, 20, 50];
const CATEGORIES = ["Laptop", "Desktop", "Mobile", "Vehicle", "Furniture", "Equipment", "Other"];
const STATUSES   = ["Active", "Available", "Allocated", "Under Maintenance", "Retired"];

const STATUS_COLORS = {
  Active:              { bg: "#dcfce7", text: "#15803d" },
  Available:           { bg: "#dbeafe", text: "#1d4ed8" },
  Allocated:           { bg: "#f3e8ff", text: "#7e22ce" },
  "Under Maintenance": { bg: "#fef9c3", text: "#854d0e" },
  Retired:             { bg: "#f3f4f6", text: "#4b5563" },
};

const COLS = ["SR No.", "Asset", "Category", "Assigned To", "Location", "Purchase Date", "Status", "Actions"];

const PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[440px] flex-col overflow-hidden rounded-l-xl bg-white shadow-2xl animate-[slideInRight_0.28s_ease-out]";

const EMPTY_FORM = {
  asset_code: "", name: "", category: "", status: "Active",
  assigned_to: "", location: "", purchase_date: "", purchase_cost: "",
};

/* ─── helpers ────────────────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  return (!y || !m || !d) ? iso : `${d}-${m}-${y}`;
}
function fmtINR(n) {
  const num = Number(n || 0);
  return num ? `₹${num.toLocaleString("en-IN")}` : "—";
}
function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ─── SoftField ──────────────────────────────────────────────────────────── */
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

/* ─── Slide-in form panel ────────────────────────────────────────────────── */
function AssetFormPanel({ open, asset, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { addToast } = useToast();

  useEffect(() => {
    if (!open) return;
    setForm(
      asset
        ? {
            asset_code:    asset.asset_code    || "",
            name:          asset.name          || "",
            category:      asset.category      || "",
            status:        asset.status        || "Active",
            assigned_to:   asset.assigned_to   || "",
            location:      asset.location      || "",
            purchase_date: asset.purchase_date || "",
            purchase_cost: asset.purchase_cost != null ? String(asset.purchase_cost) : "",
          }
        : EMPTY_FORM
    );
    setError("");
  }, [open, asset]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asset_code.trim()) { setError("Asset code is required."); return; }
    if (!form.name.trim())       { setError("Asset name is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        asset_code:    form.asset_code.trim(),
        name:          form.name.trim(),
        category:      form.category      || null,
        status:        form.status,
        assigned_to:   form.assigned_to.trim()  || null,
        location:      form.location.trim()     || null,
        purchase_date: form.purchase_date       || null,
        purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : 0,
      };
      if (asset?.id) await api.assets.update(asset.id, payload);
      else           await api.assets.create(payload);
      addToast(asset?.id ? "Asset updated." : "Asset added.", "success");
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Save failed.");
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-end bg-black/40"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form className={PANEL_CLASS} onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececf0] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">{asset ? "Edit Asset" : "Add Asset"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#1a1a1f] hover:bg-[#f5f5f7]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            <SoftField label="Asset Code" required>
              <input value={form.asset_code} onChange={set("asset_code")} placeholder="e.g. AST-001" className={inputClass} />
            </SoftField>
            <SoftField label="Asset Name" required>
              <input value={form.name} onChange={set("name")} placeholder="e.g. Office Laptop" className={inputClass} />
            </SoftField>
            <div className="grid grid-cols-2 gap-3">
              <SoftField label="Category">
                <select value={form.category} onChange={set("category")} className={inputClass}>
                  <option value="">Select type</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </SoftField>
              <SoftField label="Status">
                <select value={form.status} onChange={set("status")} className={inputClass}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </SoftField>
            </div>
            <SoftField label="Assigned To">
              <input value={form.assigned_to} onChange={set("assigned_to")} placeholder="Employee name" className={inputClass} />
            </SoftField>
            <SoftField label="Location">
              <input value={form.location} onChange={set("location")} placeholder="Office or branch" className={inputClass} />
            </SoftField>
            <div className="grid grid-cols-2 gap-3">
              <SoftField label="Purchase Date">
                <input type="date" value={form.purchase_date} onChange={set("purchase_date")} className={inputClass} />
              </SoftField>
              <SoftField label="Purchase Cost (₹)">
                <input
                  type="number" min="0" step="0.01"
                  value={form.purchase_cost} onChange={set("purchase_cost")}
                  placeholder="0.00" className={inputClass}
                />
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

/* ─── Delete modal ───────────────────────────────────────────────────────── */
function DeleteModal({ open, busy, assetName, onClose, onConfirm }) {
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
        <h3 className="text-[24px] font-bold leading-tight text-[#1a1a1f]">Delete Asset?</h3>
        <p className="mt-3 text-[14px] leading-relaxed text-[#5a5a66]">
          <span className="font-semibold">{assetName}</span> will be permanently removed.
          <br />This action cannot be undone.
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

/* ─── View modal ─────────────────────────────────────────────────────────── */
function ViewModal({ asset, onClose }) {
  if (!asset) return null;
  const sc = STATUS_COLORS[asset.status] || { bg: "#f3f4f6", text: "#6b7280" };
  const details = [
    { label: "Asset Code",    value: asset.asset_code    || "—" },
    { label: "Category",      value: asset.category      || "—" },
    { label: "Status",        value: asset.status        || "—" },
    { label: "Assigned To",   value: asset.assigned_to   || "Unassigned" },
    { label: "Location",      value: asset.location      || "—" },
    { label: "Purchase Date", value: fmtDate(asset.purchase_date) },
    { label: "Purchase Cost", value: fmtINR(asset.purchase_cost) },
  ];
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">Asset Details</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#1a1a1f] hover:bg-[#f5f5f7]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 border-b border-[#ececf0] px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[15px] font-bold text-[var(--color-primary)]">
            {getInitials(asset.name)}
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#1a1a1f]">{asset.name}</p>
            <span
              className="mt-0.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: sc.bg, color: sc.text }}
            >
              {asset.status}
            </span>
          </div>
        </div>
        <div className="divide-y divide-[#f0f0f4] px-5">
          {details.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 py-3">
              <span className="min-w-[120px] text-[12px] font-medium text-[#8a8a95]">{label}</span>
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

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function AssetManagement() {
  const { addToast } = useToast();
  const [assets, setAssets]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter]     = useState("");
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [formOpen, setFormOpen]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [viewing, setViewing]         = useState(null);
  const [deleting, setDeleting]       = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.assets.list();
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      setAssets([]);
      addToast("Failed to load assets", "error");
    } finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, categoryFilter, statusFilter]);

  /* ── filter ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      const text = [a.asset_code, a.name, a.category, a.assigned_to, a.location, a.status]
        .filter(Boolean).join(" ").toLowerCase();
      return (
        (!q || text.includes(q)) &&
        (!categoryFilter || a.category === categoryFilter) &&
        (!statusFilter   || a.status   === statusFilter)
      );
    });
  }, [assets, search, categoryFilter, statusFilter]);

  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows       = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from       = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to         = Math.min(page * pageSize, total);

  /* ── KPI counts — one per status ── */
  const kpis = {
    total:       assets.length,
    active:      assets.filter((a) => a.status === "Active").length,
    available:   assets.filter((a) => a.status === "Available").length,
    allocated:   assets.filter((a) => a.status === "Allocated").length,
    maintenance: assets.filter((a) => a.status === "Under Maintenance").length,
    retired:     assets.filter((a) => a.status === "Retired").length,
  };

  /* ── actions ── */
  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.assets.delete(deleting.id);
      setDeleting(null);
      addToast("Asset deleted.", "success");
      load();
    } catch { addToast("Failed to delete asset.", "error"); }
    finally { setDeletingBusy(false); }
  };

  const onExport = () => {
    exportToExcel(
      filtered.map((a) => ({
        "Asset Code":    a.asset_code    || "",
        "Asset Name":    a.name          || "",
        "Category":      a.category      || "",
        "Status":        a.status        || "",
        "Assigned To":   a.assigned_to   || "",
        "Location":      a.location      || "",
        "Purchase Date": a.purchase_date || "",
        "Purchase Cost": a.purchase_cost || 0,
      })),
      [],
      "assets"
    );
    addToast("Exported to Excel", "success");
  };

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        {/* ── Page header ── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">Asset Management</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Track all company-owned equipment and lifecycle status.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add Asset
          </button>
        </div>

        {/* ── KPI strip — matches Preboarding style exactly ── */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total Assets",      value: kpis.total,       color: "#0f6d84" },
            { label: "Active",            value: kpis.active,      color: "#15803d" },
            { label: "Available",         value: kpis.available,   color: "#1d4ed8" },
            { label: "Allocated",         value: kpis.allocated,   color: "#7e22ce" },
            { label: "Under Maintenance", value: kpis.maintenance, color: "#854d0e" },
            { label: "Retired",           value: kpis.retired,     color: "#4b5563" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b76]">{k.label}</p>
              <p className="mt-1.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div className="rounded-xl border border-[#e4e4ea] bg-white shadow-sm">

          {/* Search + filter toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#f0f0f4] px-5 py-4">
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, code, assigned to…"
                className="w-full rounded-lg border border-[#e8e8ee] bg-[#f8f8fb] py-2 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[var(--color-primary)] focus:bg-white transition-colors"
              />
            </div>
            {search && (
              <button onClick={() => setSearch("")} className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] font-semibold text-[#6b6b76] hover:bg-[#f5f5f7] transition-colors">
                ✕ Clear
              </button>
            )}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
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
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">{h}</th>
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
                        <Package className="h-10 w-10 opacity-30" />
                        <p className="text-[13px]">No assets found.</p>
                        <button
                          onClick={() => { setEditing(null); setFormOpen(true); }}
                          className="mt-1 text-[13px] font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          + Add your first asset
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : rows.map((asset, i) => {
                  const sc = STATUS_COLORS[asset.status] || { bg: "#f3f4f6", text: "#6b7280" };
                  return (
                    <tr key={asset.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                      {/* SR No */}
                      <td className="px-4 py-3.5 text-[#6b6b76]">{(page - 1) * pageSize + i + 1}</td>
                      {/* Asset */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[12px] font-bold text-[var(--color-primary)]">
                            {getInitials(asset.name)}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-[#1a1a1f]">{asset.name || "—"}</div>
                            <div className="text-[11px] text-[#6b6b76]">{asset.asset_code || ""}</div>
                          </div>
                        </div>
                      </td>
                      {/* Category */}
                      <td className="px-4 py-3.5 text-[#4a4a55]">{asset.category || "—"}</td>
                      {/* Assigned To */}
                      <td className="px-4 py-3.5 text-[#4a4a55]">
                        {asset.assigned_to || <span className="italic text-[#9a9aa5]">Unassigned</span>}
                      </td>
                      {/* Location */}
                      <td className="px-4 py-3.5 text-[#4a4a55]">{asset.location || "—"}</td>
                      {/* Purchase Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-[#4a4a55]">{fmtDate(asset.purchase_date)}</td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          {asset.status || "—"}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewing(asset)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#e0f2f7] text-[#0f6d84] hover:bg-[#c8eaf2] transition-colors"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setEditing(asset); setFormOpen(true); }}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[#e4e6fc] transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleting(asset)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada] transition-colors"
                            title="Delete"
                          >
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
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals ── */}
      <AssetFormPanel
        open={formOpen}
        asset={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
      />
      <ViewModal asset={viewing} onClose={() => setViewing(null)} />
      <DeleteModal
        open={Boolean(deleting)}
        busy={deletingBusy}
        assetName={deleting?.name || ""}
        onClose={() => !deletingBusy && setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

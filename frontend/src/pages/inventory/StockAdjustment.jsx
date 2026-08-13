import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Plus, XCircle } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import StoreManagerNav from "../../components/inventory/StoreManagerNav";
import { useToast } from "../../context/ToastContext";
import useAuth from "../../hooks/useAuth";
import usePageRefresh from "../../hooks/usePageRefresh";
import { isStoreManager } from "../../config/permissions";
import {
  createStockAdjustment,
  getInventoryDashboard,
  getStockAdjustments,
  getWarehouses,
  updateStockAdjustmentStatus,
} from "../../api/inventoryApi";
import { ADJUSTMENT_REASONS } from "../../data/inventoryMasterData";

const APPROVAL_FLOW = ["Store Executive", "Store Manager", "Inventory Manager"];

function itemLabel(item) {
  const code = item.product_code || item.code || item.item_code;
  const name = item.name || "Item";
  return code ? `${code} — ${name}` : name;
}

export default function StockAdjustment() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const storeMode = isStoreManager(user);
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    adjustment_date: new Date().toISOString().slice(0, 10),
    warehouse_id: "",
    item_id: "",
    new_qty: "",
    reason: "Physical Count",
  });
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [adjRes, whRes, itemsRes] = await Promise.allSettled([
        getStockAdjustments(),
        getWarehouses(),
        getInventoryDashboard(),
      ]);


      if (adjRes.status === "fulfilled" && adjRes.value?.data) {
        setAdjustments(adjRes.value.data);
      } else {
        setAdjustments([]);
      }
      if (whRes.status === "fulfilled") setWarehouses(whRes.value?.data || []);
      if (itemsRes.status === "fulfilled") setItems(itemsRes.value?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  usePageRefresh(() => load(true));

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createStockAdjustment({
        adjustment_date: form.adjustment_date || null,
        warehouse_id: Number(form.warehouse_id),
        item_id: Number(form.item_id),
        new_qty: Number(form.new_qty),
        reason: form.reason,
      });
      addToast("Adjustment recorded — pending approval");
      setForm({
        adjustment_date: new Date().toISOString().slice(0, 10),
        warehouse_id: "",
        item_id: "",
        new_qty: "",
        reason: "Physical Count",
      });
      load();
    } catch {
      addToast("Adjustment failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (adjustmentId, newStatus) => {
    setUpdatingId(adjustmentId);
    try {
      await updateStockAdjustmentStatus(adjustmentId, {
        status: newStatus,
        approved_by: "Store Manager",
      });
      addToast(`Adjustment updated to ${newStatus}`);
      await load();
    } catch {
      addToast("Failed to update status", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = [
    { key: "adjustment_date", label: "Date" },
    { key: "warehouse_name", label: "Warehouse" },
    { key: "item_name", label: "Item" },
    { key: "old_qty", label: "Old Qty" },
    { key: "new_qty", label: "New Qty" },
    {
      key: "difference",
      label: "Difference",
      render: (r) => (
        <span className={r.difference < 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
          {r.difference > 0 ? `+${r.difference}` : r.difference}
        </span>
      ),
    },
    { key: "reason", label: "Reason" },
    { key: "approved_by", label: "Approved By", render: (r) => r.approved_by || "Pending" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
            r.status === "approved"
              ? "bg-green-100 text-green-800"
              : r.status === "rejected"
              ? "bg-red-100 text-red-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => {
        const isBusy = updatingId === r.id;
        if (r.status === "pending" || r.status === "pending_approval") {
          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleStatusChange(r.id, "approved")}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleStatusChange(r.id, "rejected")}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          );
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        {storeMode ? <StoreManagerNav /> : null}
        <Loader label="Loading adjustments..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {storeMode ? <StoreManagerNav /> : null}
      <header>
        <p className="ui-subtitle">
          Audit-ready stock corrections with multi-level approval workflow.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Plus className="h-4 w-4" /> New Adjustment
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm">
              Adjustment Date
              <input
                type="date"
                required
                value={form.adjustment_date}
                onChange={(e) => setForm((f) => ({ ...f, adjustment_date: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              Warehouse
              <select
                value={form.warehouse_id}
                onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              Item
              <select
                value={form.item_id}
                onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {itemLabel(i)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              New Quantity
              <input
                type="number"
                min="0"
                value={form.new_qty}
                onChange={(e) => setForm((f) => ({ ...f, new_qty: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              Reason
              <select
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                {ADJUSTMENT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={submitting} className="ui-btn-primary w-full">
              {submitting ? "Saving..." : "Record Adjustment"}
            </button>
          </form>

          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700">
              <ClipboardCheck className="h-3.5 w-3.5" /> Approval Workflow
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              {APPROVAL_FLOW.map((s, i) => (
                <span key={s} className="flex items-center gap-1">
                  <span className="font-semibold text-[#2563EB]">{s}</span>
                  {i < 2 && "→"}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex justify-between">
            <h2 className="text-sm font-bold text-slate-800">Adjustment History</h2>
          </div>
          <DataTable columns={columns} data={adjustments} showSearch={false} />
        </section>
      </div>
    </div>
  );
}

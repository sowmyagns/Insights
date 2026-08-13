import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Plus, Truck, XCircle } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import {
  createStockTransfer,
  getInventoryDashboard,
  getStockTransfers,
  getWarehouses,
  updateStockTransferStatus,
} from "../../api/inventoryApi";
import { TRANSFER_STATUSES } from "../../data/inventoryMasterData";
import useTenantId from "../../hooks/useTenantId";
import usePageRefresh from "../../hooks/usePageRefresh";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  in_transit: "bg-indigo-100 text-indigo-800",
  received: "bg-teal-100 text-teal-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function StockTransfer() {
  const tenantId = useTenantId();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    transfer_number: "",
    transfer_date: new Date().toISOString().slice(0, 10),
    from_warehouse_id: "",
    to_warehouse_id: "",
    item_id: "",
    batch_number: "",
    quantity: "",
    vehicle: "",
    driver: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [trRes, whRes, itemsRes] = await Promise.allSettled([
        getStockTransfers(),
        getWarehouses(),
        getInventoryDashboard(),
      ]);


      if (trRes.status === "fulfilled" && trRes.value?.data) {
        setTransfers(trRes.value.data);
      } else {
        setTransfers([]);
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
    if (form.from_warehouse_id === form.to_warehouse_id) {
      addToast("From & To warehouses must differ", "error");
      return;
    }
    setSubmitting(true);
    try {
      await createStockTransfer({
        transfer_number: form.transfer_number || null,
        transfer_date: form.transfer_date || null,
        from_warehouse_id: Number(form.from_warehouse_id),
        to_warehouse_id: Number(form.to_warehouse_id),
        item_id: Number(form.item_id),
        batch_number: form.batch_number || null,
        quantity: Number(form.quantity),
        vehicle: form.vehicle || null,
        driver: form.driver || null,
        notes: form.notes || null,
      });
      addToast("Transfer created — pending approval");
      setForm({
        transfer_number: "",
        transfer_date: new Date().toISOString().slice(0, 10),
        from_warehouse_id: "",
        to_warehouse_id: "",
        item_id: "",
        batch_number: "",
        quantity: "",
        vehicle: "",
        driver: "",
        notes: "",
      });
      load();
    } catch {
      addToast("Transfer failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (transferId, newStatus) => {
    setUpdatingId(transferId);
    try {
      await updateStockTransferStatus(transferId, {
        status: newStatus,
        approved_by: "Store Manager",
      });
      addToast(`Transfer updated to ${newStatus.replace(/_/g, " ")}`);
      await load();
    } catch {
      addToast("Failed to update status", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const historyColumns = [
    { key: "transfer_number", label: "Transfer No" },
    { key: "transfer_date", label: "Date" },
    { key: "from_warehouse", label: "From" },
    { key: "to_warehouse", label: "To" },
    { key: "item_name", label: "Item" },
    { key: "quantity", label: "Qty" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
            STATUS_COLORS[r.status] || "bg-slate-100 text-slate-700"
          }`}
        >
          {r.status?.replace(/_/g, " ")}
        </span>
      ),
    },
    { key: "approved_by", label: "Approved By", render: (r) => r.approved_by || "—" },
    {
      key: "actions",
      label: "Actions",
      render: (r) => {
        const isBusy = updatingId === r.id;
        if (r.status === "pending_approval") {
          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleStatusChange(r.id, "approved")}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleStatusChange(r.id, "rejected")}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          );
        }
        if (r.status === "approved") {
          return (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleStatusChange(r.id, "in_transit")}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              <Truck className="h-3.5 w-3.5" /> Dispatch
            </button>
          );
        }
        if (r.status === "in_transit") {
          return (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleStatusChange(r.id, "completed")}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
            </button>
          );
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
  ];

  if (loading) return <Loader label="Loading stock transfers..." />;

  return (
    <div className="space-y-5 pb-4">
      <header>
        <p className="ui-eyebrow">Inventory</p>
        <h2 className="mt-0.5 ui-title">Stock Transfer</h2>
        <p className="ui-subtitle">
          Initiate or approve material transfers from Main Store to Shop Floor Store.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="ui-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Plus className="h-4 w-4 text-teal-700" /> Create Transfer
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Transfer No <span className="text-xs text-slate-400">(Optional)</span>
              <input
                placeholder="Auto-generated if empty"
                value={form.transfer_number}
                onChange={(e) => setForm((f) => ({ ...f, transfer_number: e.target.value }))}
                className="ui-input mt-1 w-full"
              />
            </label>

            <label className="text-sm">
              Transfer Date
              <input
                type="date"
                required
                value={form.transfer_date}
                onChange={(e) => setForm((f) => ({ ...f, transfer_date: e.target.value }))}
                className="ui-input mt-1 w-full"
              />
            </label>

            <label className="text-sm">
              From Warehouse
              <select
                value={form.from_warehouse_id}
                onChange={(e) => setForm((f) => ({ ...f, from_warehouse_id: e.target.value }))}
                required
                className="ui-input mt-1 w-full"
              >
                <option value="">Select</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              To Warehouse
              <select
                value={form.to_warehouse_id}
                onChange={(e) => setForm((f) => ({ ...f, to_warehouse_id: e.target.value }))}
                required
                className="ui-input mt-1 w-full"
              >
                <option value="">Select</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm sm:col-span-2">
              Item
              <select
                value={form.item_id}
                onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))}
                required
                className="ui-input mt-1 w-full"
              >
                <option value="">Select</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.sku} - {i.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Batch
              <input
                value={form.batch_number}
                onChange={(e) => setForm((f) => ({ ...f, batch_number: e.target.value }))}
                className="ui-input mt-1 w-full"
              />
            </label>

            <label className="text-sm">
              Qty
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                required
                className="ui-input mt-1 w-full"
              />
            </label>

            <label className="text-sm">
              Vehicle
              <input
                value={form.vehicle}
                onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))}
                className="ui-input mt-1 w-full"
              />
            </label>

            <label className="text-sm">
              Driver
              <input
                value={form.driver}
                onChange={(e) => setForm((f) => ({ ...f, driver: e.target.value }))}
                className="ui-input mt-1 w-full"
              />
            </label>

            <label className="text-sm sm:col-span-2">
              Notes
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="ui-input mt-1 w-full"
                rows={2}
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="ui-btn-primary sm:col-span-2"
            >
              {submitting ? "Creating..." : "Create Transfer"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200/90 bg-slate-50 p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-800">Status Flow</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            {TRANSFER_STATUSES.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 capitalize shadow-sm">
                  {s.replace(/_/g, " ")}
                </span>
                {i < TRANSFER_STATUSES.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                )}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="ui-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Truck className="h-4 w-4 text-teal-700" /> Transfer History
          </h2>
        </div>
        <DataTable columns={historyColumns} data={transfers} showSearch={false} />
      </section>
    </div>
  );
}

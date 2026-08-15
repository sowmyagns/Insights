import { useCallback, useEffect, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { RotateCcw } from "lucide-react";

import Loader from "../../components/common/Loader";
import StoreManagerNav from "../../components/inventory/StoreManagerNav";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/common/Button";
import {
  createStoreStockReturn,
  getInventoryDashboard,
  getWarehouses,
} from "../../api/inventoryApi";
import {
  MANUFACTURING_EVENTS,
  notifyManufacturingSpine,
} from "../../utils/manufacturingEvents";

function itemLabel(item) {
  const code = item.product_code || item.code || item.item_code;
  const name = item.name || "Item";
  const stock = item.total_quantity ?? 0;
  return code ? `${code} — ${name} (Stock: ${stock})` : `${name} (Stock: ${stock})`;
}

export default function StoreStockReturn() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [form, setForm] = useState({
    warehouse_id: "",
    item_id: "",
    quantity: "",
    operator_name: "",
    machine: "",
    notes: "",
  });

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [itemsRes, whRes] = await Promise.allSettled([
        getInventoryDashboard(),
        getWarehouses(),
      ]);


      setItems(itemsRes.status === "fulfilled" ? itemsRes.value?.data || [] : []);
      setWarehouses(whRes.status === "fulfilled" ? whRes.value?.data || [] : []);
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
      const res = await createStoreStockReturn({
        warehouse_id: Number(form.warehouse_id),
        item_id: Number(form.item_id),
        quantity: Number(form.quantity),
        operator_name: form.operator_name || null,
        machine: form.machine || null,
        notes: form.notes || null,
      });
      setLastResult(res.data);
      addToast(`Returned ${res.data.quantity} — stock ${res.data.previous_stock} → ${res.data.current_stock}`);
      notifyManufacturingSpine(MANUFACTURING_EVENTS.INVENTORY_CHANGED, {});
      setForm((f) => ({ ...f, quantity: "", notes: "" }));
      load();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Stock return failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <StoreManagerNav />
        <Loader label="Loading Stock Return…" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <StoreManagerNav />
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ui-subtitle">
            Return unused material to the warehouse. Stock increases automatically.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <RotateCcw className="h-4 w-4 text-[var(--color-primary)]" /> Return Material
          </div>
          <label className="block text-sm">
            Warehouse
            <select required value={form.warehouse_id} onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm">
              <option value="">Select</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            Product
            <select required value={form.item_id} onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm">
              <option value="">Select</option>
              {items.map((i) => <option key={i.id} value={i.id}>{itemLabel(i)}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            Quantity Returned
            <input type="number" min="1" required value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" />
          </label>
          <label className="block text-sm">
            Operator (optional)
            <input value={form.operator_name} onChange={(e) => setForm((f) => ({ ...f, operator_name: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" />
          </label>
          <label className="block text-sm">
            Machine (optional)
            <input value={form.machine} onChange={(e) => setForm((f) => ({ ...f, machine: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" />
          </label>
          <Button variant="primary" type="submit" disabled={submitting} className="w-full py-3">
            {submitting ? "Saving…" : "Save Return"}
          </Button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-bold text-slate-800">Last return</h2>
          {lastResult ? (
            <div className="mt-4 space-y-2">
              <p className="font-mono text-sm font-semibold text-[var(--color-primary)]">{lastResult.transaction_number}</p>
              <p className="text-lg font-bold">{lastResult.item_name}</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-700">
                {lastResult.previous_stock} → {lastResult.current_stock}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Returned quantity is added back to warehouse stock instantly.</p>
          )}
        </div>
      </div>
    </div>
  );
}

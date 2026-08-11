import { useCallback, useEffect, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { PackagePlus } from "lucide-react";

import Loader from "../../components/common/Loader";
import StoreManagerNav from "../../components/inventory/StoreManagerNav";
import { useToast } from "../../context/ToastContext";
import {
  createStoreStockIn,
  getInventoryDashboard,
  getSuppliers,
  getWarehouses,
} from "../../api/inventoryApi";
import {
  MANUFACTURING_EVENTS,
  notifyManufacturingSpine,
} from "../../utils/manufacturingEvents";

function itemLabel(item) {
  const code = item.product_code || item.code || item.item_code;
  const name = item.name || "Item";
  const stock = item.total_quantity ?? item.current_stock ?? 0;
  return code ? `${code} — ${name} (Stock: ${stock})` : `${name} (Stock: ${stock})`;
}

export default function StoreStockIn() {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [form, setForm] = useState({
    warehouse_id: "",
    item_id: "",
    quantity: "",
    supplier_name: "",
    batch_number: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, whRes, supRes] = await Promise.allSettled([
        getInventoryDashboard(),
        getWarehouses(),
        getSuppliers(),
      ]);

  usePageRefresh(load);

      setItems(itemsRes.status === "fulfilled" ? itemsRes.value?.data || [] : []);
      setWarehouses(whRes.status === "fulfilled" ? whRes.value?.data || [] : []);
      setSuppliers(supRes.status === "fulfilled" ? supRes.value?.data || [] : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createStoreStockIn({
        warehouse_id: Number(form.warehouse_id),
        item_id: Number(form.item_id),
        quantity: Number(form.quantity),
        supplier_name: form.supplier_name || null,
        batch_number: form.batch_number || null,
        notes: form.notes || null,
      });
      setLastResult(res.data);
      addToast(`Stock In ${res.data.transaction_number}: ${res.data.previous_stock} → ${res.data.current_stock}`);
      notifyManufacturingSpine(MANUFACTURING_EVENTS.INVENTORY_CHANGED, {
        item_id: form.item_id,
      });
      setForm((f) => ({ ...f, quantity: "", batch_number: "", notes: "" }));
      load();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Stock In failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <StoreManagerNav />
        <Loader label="Loading Stock In…" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <StoreManagerNav />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-500">
            Receive materials into a warehouse. Stock updates immediately.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <PackagePlus className="h-4 w-4 text-[var(--color-primary)]" />
            Receive Material
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Warehouse</span>
            <select
              required
              value={form.warehouse_id}
              onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Product</span>
            <select
              required
              value={form.item_id}
              onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="">Select product</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{itemLabel(i)}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Received Quantity</span>
            <input
              type="number"
              min="1"
              required
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              placeholder="e.g. 5000"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Supplier (optional)</span>
            <input
              list="supplier-list"
              value={form.supplier_name}
              onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))}
              placeholder="Supplier name"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
            <datalist id="supplier-list">
              {suppliers.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Batch / Lot (optional)</span>
            <input
              value={form.batch_number}
              onChange={(e) => setForm((f) => ({ ...f, batch_number: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Notes (optional)</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>

          <button type="submit" disabled={submitting} className="ui-btn-primary w-full py-3 text-base">
            {submitting ? "Saving…" : "Save Stock In"}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-bold text-slate-800">Last transaction</h2>
          {lastResult ? (
            <div className="mt-4 space-y-3">
              <p className="font-mono text-sm font-semibold text-[var(--color-primary)]">
                {lastResult.transaction_number}
              </p>
              <p className="text-lg font-bold text-slate-900">{lastResult.item_name}</p>
              <p className="text-sm text-slate-600">{lastResult.warehouse_name}</p>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Stock</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
                  {lastResult.previous_stock} → {lastResult.current_stock}
                </p>
              </div>
              <p className="text-xs text-slate-500">Received by {lastResult.received_by || "—"}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              After you save, stock increases automatically and a transaction number is generated.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

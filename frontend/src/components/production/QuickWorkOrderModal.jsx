import { useState, useEffect } from "react";
import { X, Cpu } from "lucide-react";
import { SHIFTS } from "../../data/productionPlanningMasterData";
import { getMachines, quickCreateWorkOrder } from "../../api/productionApi";
import { fetchProductsWithFallback } from "../../utils/productOptions";

export default function QuickWorkOrderModal({ order, onClose, onSuccess, addToast }) {
  const [machines, setMachines] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const poNumber = order?.order_number || order?.id || "";
  const initialWoNumber = poNumber ? `WO-${poNumber}` : `WO-${Date.now().toString().slice(-6)}`;

  const [form, setForm] = useState({
    work_order_number: initialWoNumber,
    product_name: order?.product_name || "",
    product_id: order?.product_id || "",
    planned_quantity: order?.planned_quantity || 100,
    customer_name: order?.buyer_company || order?.customer_name || "",
    machine_id: order?.machine_id || "",
    operator_name: order?.operator_name || "",
    shift: typeof order?.shift === "object" ? order?.shift?.id || "General" : order?.shift || "General",
    priority: order?.priority || "medium",
    start_date: order?.start_date ? String(order.start_date).slice(0, 16) : "",
    due_date: order?.due_date ? String(order.due_date).slice(0, 16) : "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingOptions(true);
    Promise.all([getMachines().catch(() => ({ data: [] })), fetchProductsWithFallback().catch(() => [])])
      .then(([mRes, pRes]) => {
        setMachines(mRes?.data || []);
        const prods = Array.isArray(pRes) ? pRes : pRes?.data || [];
        setProducts(prods);
        // Prefill product only when opened from a production order
        if (order?.product_id) {
          setForm((prev) => ({
            ...prev,
            product_id: String(order.product_id),
            product_name: order.product_name || prev.product_name,
          }));
        }
      })
      .finally(() => setLoadingOptions(false));
  }, [order?.product_id, order?.product_name]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "product_id") {
      const selected = products.find((p) => String(p.id) === String(value));
      setForm((prev) => ({
        ...prev,
        product_id: value,
        product_name: selected?.name || selected?.sku || prev.product_name,
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.product_id) {
      addToast?.("Select a product to create the work order", "error");
      return;
    }
    setSaving(true);
    const woNum = form.work_order_number?.trim() || `WO-${Date.now().toString().slice(-6)}`;
    const shiftVal =
      typeof form.shift === "object" ? form.shift?.label || form.shift?.id || "General" : form.shift || "General";

    try {
      const res = await quickCreateWorkOrder({
        production_order_id: order?.id ? Number(order.id) : null,
        work_order_number: woNum,
        product_id: Number(form.product_id),
        planned_quantity: Number(form.planned_quantity || 0),
        customer_name: form.customer_name || null,
        machine_id: form.machine_id ? Number(form.machine_id) : null,
        shift: shiftVal,
        operator_name: form.operator_name || null,
        priority: form.priority || "medium",
        planned_start: form.start_date || null,
        planned_end: form.due_date || null,
      });
      const created = res?.data || {};
      addToast?.(`Work Order ${created.work_order_number || woNum} created successfully`, "success");
      onSuccess?.({
        id: created.id,
        work_order_number: created.work_order_number || woNum,
        status: created.status || "planned",
      });
      onClose?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      addToast?.(typeof detail === "string" ? detail : "Failed to create work order", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-wo-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-700">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 id="quick-wo-title" className="text-base font-bold text-slate-900">
              New Work Order
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="ui-label">Work Order Number</span>
              <input name="work_order_number" value={form.work_order_number} onChange={handleChange} required className="ui-input" />
            </label>
            <label className="block space-y-1">
              <span className="ui-label">Product</span>
              {order?.product_id ? (
                <input value={form.product_name} readOnly className="ui-input bg-slate-50" />
              ) : (
                <select name="product_id" value={form.product_id} onChange={handleChange} required disabled={loadingOptions} className="ui-select">
                  <option value="">{loadingOptions ? "Loading products…" : "Select product…"}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.sku}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="ui-label">Planned Quantity</span>
              <input type="number" name="planned_quantity" min="1" value={form.planned_quantity} onChange={handleChange} required className="ui-input" />
            </label>
            <label className="block space-y-1">
              <span className="ui-label">Machine</span>
              <select name="machine_id" value={form.machine_id} onChange={handleChange} className="ui-select">
                <option value="">Select Machine…</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.code}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="ui-label">Customer</span>
              <input name="customer_name" value={form.customer_name} onChange={handleChange} className="ui-input" />
            </label>
            <label className="block space-y-1">
              <span className="ui-label">Operator</span>
              <input name="operator_name" value={form.operator_name} onChange={handleChange} className="ui-input" />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="ui-label">Shift</span>
              <select name="shift" value={form.shift} onChange={handleChange} className="ui-select">
                {SHIFTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="ui-label">Priority</span>
              <select name="priority" value={form.priority} onChange={handleChange} className="ui-select">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="ui-btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="ui-btn-primary" disabled={saving || loadingOptions}>
              {saving ? "Creating…" : "Create Work Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

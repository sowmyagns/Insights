import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ClipboardList, CheckCircle, Cpu } from "lucide-react";

import { createProductionOrder, getMachines, getProducts } from "../../api/productionApi";
import useTenantId from "../../hooks/useTenantId";
import { useToast } from "../../context/ToastContext";

const SHIFT_OPTIONS = [
  { id: "General Shift (9:00 AM – 6:00 PM)", label: "General Shift (9:00 AM – 6:00 PM)" },
  { id: "Morning Shift (6:00 AM – 2:00 PM)", label: "Morning Shift (6:00 AM – 2:00 PM)" },
  { id: "Evening Shift (2:00 PM – 10:00 PM)", label: "Evening Shift (2:00 PM – 10:00 PM)" },
  { id: "Night Shift (10:00 PM – 6:00 AM)", label: "Night Shift (10:00 PM – 6:00 AM)" },
];

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
];

const STATUS_OPTIONS = [
  { id: "planned", label: "Planned" },
  { id: "draft", label: "Draft" },
  { id: "in_progress", label: "In Progress" },
  { id: "on_hold", label: "On Hold" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function CreateProductionOrderModal({
  open,
  onClose,
  onSaved,
  initialOrder = null,
  productsList = [],
  machinesList = [],
}) {
  const tenantId = useTenantId();
  const { addToast } = useToast();

  const [machines, setMachines] = useState(machinesList);
  const [products, setProducts] = useState(productsList);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    product_no: "",
    machine_id: "",
    operator_name: "",
    operator_id: "",
    planned_quantity: "",
    size: "",
    priority: "medium",
    shift: "General Shift (9:00 AM – 6:00 PM)",
    status: "planned",
    start_date: "",
    due_date: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (machinesList && machinesList.length > 0) {
      setMachines(machinesList);
    } else {
      getMachines()
        .then((res) => setMachines(res.data || []))
        .catch(() => {});
    }

    if (productsList && productsList.length > 0) {
      setProducts(productsList);
    } else {
      getProducts()
        .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
        .catch(() => {});
    }
  }, [machinesList, productsList]);

  useEffect(() => {
    if (initialOrder) {
      setForm({
        product_no: initialOrder.product_no || initialOrder.order_number || initialOrder.product_name || "",
        machine_id: initialOrder.machine_id ? String(initialOrder.machine_id) : "",
        operator_name: initialOrder.operator_name || "",
        operator_id: initialOrder.operator_id || "",
        planned_quantity: initialOrder.planned_quantity || "",
        size: initialOrder.size || initialOrder.output_quantity_size || "",
        priority: (initialOrder.priority || "medium").toLowerCase(),
        shift: initialOrder.shift || "General Shift (9:00 AM – 6:00 PM)",
        status: (initialOrder.status || "planned").toLowerCase(),
        start_date: initialOrder.start_date ? String(initialOrder.start_date).slice(0, 16) : "",
        due_date: initialOrder.due_date ? String(initialOrder.due_date).slice(0, 16) : "",
      });
    } else {
      setForm({
        product_no: "",
        machine_id: "",
        operator_name: "",
        operator_id: "",
        planned_quantity: "",
        size: "",
        priority: "medium",
        shift: "General Shift (9:00 AM – 6:00 PM)",
        status: "planned",
        start_date: "",
        due_date: "",
      });
    }
    setErrors({});
  }, [initialOrder, open]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.product_no.trim()) {
      errs.product_no = "Product No is required";
    }
    if (!form.planned_quantity || Number(form.planned_quantity) <= 0) {
      errs.planned_quantity = "Planned Quantity is required and must be > 0";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const selectedMachine = machines.find((m) => String(m.id) === String(form.machine_id));
      const matchedProduct = products.find(
        (p) =>
          p.product_code?.toLowerCase() === form.product_no.trim().toLowerCase() ||
          p.name?.toLowerCase() === form.product_no.trim().toLowerCase() ||
          p.sku?.toLowerCase() === form.product_no.trim().toLowerCase()
      );

      const payload = {
        tenant_id: tenantId,
        product_id: matchedProduct?.id || 1,
        product_name: matchedProduct?.name || form.product_no,
        order_number: form.product_no.startsWith("PO-") || form.product_no.startsWith("PROD-") 
          ? form.product_no 
          : `PO-${form.product_no}`,
        product_no: form.product_no,
        machine_id: form.machine_id ? Number(form.machine_id) : null,
        machine_name: selectedMachine ? (selectedMachine.name || selectedMachine.code) : null,
        operator_name: form.operator_name || null,
        operator_id: form.operator_id || null,
        planned_quantity: Number(form.planned_quantity),
        produced_quantity: initialOrder?.produced_quantity || 0,
        size: form.size || null,
        output_quantity_size: form.size || null,
        priority: form.priority,
        shift: form.shift,
        status: form.status,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
      };

      const res = await createProductionOrder(payload);
      const newOrder = res?.data || payload;

      addToast(
        initialOrder ? "Production Order updated successfully" : "Production Order created successfully",
        "success"
      );

      onSaved?.(newOrder);
      onClose();
    } catch (err) {
      console.error(err);
      addToast(err?.message || "Failed to create production order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.();
      }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-700">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {initialOrder ? "Edit Production Order" : "New Production Order"}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-400">
                Fill in the details to create a production order
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5 max-h-[78vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">

            {/* PRODUCT NO * */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                PRODUCT NO <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.product_no}
                onChange={(e) => handleChange("product_no", e.target.value)}
                placeholder="e.g. PROD-1042"
                list="products-datalist"
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 ${
                  errors.product_no ? "border-red-300 bg-red-50/50" : "border-slate-200 bg-white"
                }`}
              />
              <datalist id="products-datalist">
                {products.map((p) => (
                  <option key={p.id} value={p.product_code || p.name}>
                    {p.name} ({p.category || "Product"})
                  </option>
                ))}
              </datalist>
              {errors.product_no && (
                <p className="mt-1 text-xs text-red-500">{errors.product_no}</p>
              )}
            </div>

            {/* SELECT MACHINE (optional) */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                SELECT MACHINE <span className="text-slate-400 font-normal text-[10px]">(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={form.machine_id}
                  onChange={(e) => handleChange("machine_id", e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-10 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                >
                  <option value="">Select machine (optional)</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.code} ({m.status || "Available"})
                    </option>
                  ))}
                </select>
                <Cpu className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            {/* OPERATOR NAME */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                OPERATOR NAME
              </label>
              <input
                type="text"
                value={form.operator_name}
                onChange={(e) => handleChange("operator_name", e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            {/* OPERATOR ID */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                OPERATOR ID
              </label>
              <input
                type="text"
                value={form.operator_id}
                onChange={(e) => handleChange("operator_id", e.target.value)}
                placeholder="e.g. OP-104"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            {/* PLANNED QUANTITY * */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                PLANNED QUANTITY <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.planned_quantity}
                onChange={(e) => handleChange("planned_quantity", e.target.value)}
                placeholder="e.g. 500"
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 ${
                  errors.planned_quantity ? "border-red-300 bg-red-50/50" : "border-slate-200 bg-white"
                }`}
              />
              {errors.planned_quantity && (
                <p className="mt-1 text-xs text-red-500">{errors.planned_quantity}</p>
              )}
            </div>

            {/* OUTPUT QUANTITY SIZE */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                OUTPUT QUANTITY SIZE
              </label>
              <input
                type="text"
                value={form.size}
                onChange={(e) => handleChange("size", e.target.value)}
                placeholder="e.g. Large, XL, 500ml"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            {/* PRIORITY */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                PRIORITY
              </label>
              <div className="relative">
                <select
                  value={form.priority}
                  onChange={(e) => handleChange("priority", e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            {/* SHIFT */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                SHIFT
              </label>
              <div className="relative">
                <select
                  value={form.shift}
                  onChange={(e) => handleChange("shift", e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                >
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            {/* STATUS (Full Width) */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                STATUS
              </label>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            {/* START DATE & TIME */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                START DATE & TIME
              </label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => handleChange("start_date", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            {/* DUE DATE & TIME */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                DUE DATE & TIME
              </label>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => handleChange("due_date", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-cta)] px-6 py-2.5 text-sm font-bold text-slate-900 shadow-md hover:bg-yellow-400 transition-all hover:shadow-lg disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4 stroke-[2.5]" />
              {submitting
                ? "Saving..."
                : initialOrder
                ? "Save Changes"
                : "Create Production Order"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

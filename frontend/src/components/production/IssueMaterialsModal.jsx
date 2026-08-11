import { useState, useEffect } from "react";
import { X, Package, Cpu, Layers, Warehouse, CheckCircle } from "lucide-react";
import { getMachines, issueWorkOrderMaterials, updateProductionOrderMachine } from "../../api/productionApi";
import { fetchProductsWithFallback } from "../../utils/productOptions";
import { notifyManufacturingSpine, MANUFACTURING_EVENTS } from "../../utils/manufacturingEvents";
import useTenantId from "../../hooks/useTenantId";

const WAREHOUSES = [
  { id: "WH-MAIN", name: "Main Store (WH-MAIN)" },
  { id: "WH-PROD", name: "Production Store (WH-PROD)" },
  { id: "WH-FG", name: "FG Warehouse (WH-FG)" },
];

export default function IssueMaterialsModal({ workOrder, onClose, onSuccess, addToast }) {
  const tenantId = useTenantId();
  const [machines, setMachines] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const woNumber = workOrder?.work_order_number || `WO-${Date.now().toString().slice(-6)}`;
  const prodName = workOrder?.product_name || "Product";

  const [form, setForm] = useState({
    work_order_number: woNumber,
    product_name: prodName,
    quantity: workOrder?.planned_quantity || 100,
    machine_id: workOrder?.machine_id || "",
    raw_material_id: "",
    raw_material_name: "",
    warehouse_id: "WH-MAIN",
    operator_name: workOrder?.operator_name || "",
    remarks: "",
  });

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);
    Promise.all([
      getMachines().catch(() => ({ data: [] })),
      fetchProductsWithFallback().catch(() => []),
    ]).then(([mRes, pRes]) => {
      if (!active) return;
      setMachines(mRes?.data || []);
      const allProds = Array.isArray(pRes) ? pRes : (pRes?.data || []);
      setRawMaterials(allProds);
      if (allProds.length > 0) {
        const firstMat = allProds[0];
        setForm((prev) => ({
          ...prev,
          raw_material_id: String(firstMat.id),
          raw_material_name: firstMat.name || firstMat.sku || "Raw Material",
        }));
      }
    }).finally(() => {
      if (active) setLoadingOptions(false);
    });
    return () => { active = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "raw_material_id") {
      const selectedMat = rawMaterials.find((m) => String(m.id) === String(value));
      setForm((prev) => ({
        ...prev,
        raw_material_id: value,
        raw_material_name: selectedMat ? (selectedMat.name || selectedMat.sku) : "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const selectedMachine = machines.find((m) => String(m.id) === String(form.machine_id));
    const machineName = selectedMachine ? (selectedMachine.name || selectedMachine.code || `Machine #${selectedMachine.id}`) : (form.machine_id ? `Machine #${form.machine_id}` : "");
    const selectedMat = rawMaterials.find((m) => String(m.id) === String(form.raw_material_id));
    const matName = selectedMat?.name || form.raw_material_name || "Raw Material";
    const plannedQty = Number(form.quantity) || workOrder?.planned_quantity || 100;

    // Backend API updates if integer ID
    if (workOrder && typeof workOrder.id === "number") {
      try {
        await issueWorkOrderMaterials(workOrder.id, form.warehouse_id).catch(() => null);
        if (form.machine_id) {
          const poId = workOrder.production_order_id || workOrder.id;
          await updateProductionOrderMachine(poId, Number(form.machine_id)).catch(() => null);
        }
      } catch {}
    }

    // Comprehensive Local Storage Persistence for Work Orders, Production Orders & Allocations
    try {
      // 1. Update Work Orders
      const storedWOs = localStorage.getItem("smrt_local_work_orders") || localStorage.getItem("smrt_work_orders");
      const localWOs = storedWOs ? JSON.parse(storedWOs) : [];
      let updatedWOs = localWOs.map((w) => {
        if (w.id === workOrder?.id || w.work_order_number === woNumber || (workOrder?.id && String(w.id) === String(workOrder.id))) {
          return {
            ...w,
            materials_issued: true,
            machine_id: form.machine_id || w.machine_id || "",
            machine_name: machineName || w.machine_name || "Unassigned",
            operator_name: form.operator_name || w.operator_name || "",
            raw_material_id: form.raw_material_id || w.raw_material_id,
            raw_material_name: matName,
            planned_quantity: plannedQty,
            warehouse_id: form.warehouse_id,
            status: w.status === "planned" || w.status === "draft" ? "material_ready" : w.status,
          };
        }
        return w;
      });

      // If workOrder not found in array, create or push it
      const exists = updatedWOs.some((w) => w.id === workOrder?.id || w.work_order_number === woNumber);
      if (!exists && workOrder) {
        updatedWOs.unshift({
          ...workOrder,
          work_order_number: woNumber,
          materials_issued: true,
          machine_id: form.machine_id || "",
          machine_name: machineName || "Unassigned",
          operator_name: form.operator_name || "",
          raw_material_id: form.raw_material_id,
          raw_material_name: matName,
          planned_quantity: plannedQty,
          warehouse_id: form.warehouse_id,
          status: workOrder.status === "planned" || workOrder.status === "draft" ? "material_ready" : (workOrder.status || "planned"),
        });
      }

      localStorage.setItem("smrt_local_work_orders", JSON.stringify(updatedWOs));
      localStorage.setItem("smrt_work_orders", JSON.stringify(updatedWOs));

      // 2. Update linked Production Order
      const storedPOs = localStorage.getItem("smrt_local_production_orders");
      if (storedPOs) {
        const localPOs = JSON.parse(storedPOs);
        const poId = workOrder?.production_order_id || workOrder?.id;
        const updatedPOs = localPOs.map((po) => {
          if ((poId && String(po.id) === String(poId)) || (po.order_number && String(po.order_number) === String(workOrder?.production_order_number || workOrder?.order_number))) {
            return {
              ...po,
              machine_id: form.machine_id || po.machine_id,
              machine_name: machineName || po.machine_name,
              operator_name: form.operator_name || po.operator_name,
              planned_quantity: plannedQty,
              materials_issued: true,
              status: po.status === "draft" || po.status === "planned" ? "machine_assigned" : po.status,
            };
          }
          return po;
        });
        localStorage.setItem("smrt_local_production_orders", JSON.stringify(updatedPOs));
      }
    } catch {}

    notifyManufacturingSpine(MANUFACTURING_EVENTS.WORK_ORDER_UPDATED, {
      workOrderId: workOrder?.id,
      workOrderNumber: woNumber,
      machineId: form.machine_id,
      machineName,
      operatorName: form.operator_name,
      materialsIssued: true,
    });

    const successMsg = machineName 
      ? `Materials issued & machine (${machineName}) allocated to ${woNumber}`
      : `Materials issued successfully for ${woNumber} (${matName})`;

    addToast?.(successMsg, "success");
    setSubmitting(false);
    onSuccess?.({
      ...workOrder,
      materials_issued: true,
      raw_material_name: matName,
      machine_id: form.machine_id,
      machine_name: machineName,
      operator_name: form.operator_name,
      planned_quantity: plannedQty,
    });
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Issue Materials Form</h3>
              <p className="text-xs text-slate-500">{woNumber} · {prodName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Work Order Number
              </label>
              <input
                type="text"
                name="work_order_number"
                value={form.work_order_number}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Target Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Raw Material Selector (⭐ Dropdown as requested) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-cyan-600" /> Raw Material <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-slate-400">Select material to issue</span>
            </label>
            <select
              name="raw_material_id"
              value={form.raw_material_id}
              onChange={handleChange}
              disabled={loadingOptions}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            >
              {loadingOptions ? (
                <option value="">Loading raw materials...</option>
              ) : rawMaterials.length === 0 ? (
                <option value="">No raw materials found</option>
              ) : (
                rawMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.sku ? `${m.sku} — ` : ""}{m.name}{m.current_stock != null ? ` (Stock: ${m.current_stock} ${m.unit || "Pcs"})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Machine Selector Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-blue-600" /> Machine Allocation
            </label>
            <select
              name="machine_id"
              value={form.machine_id}
              onChange={handleChange}
              disabled={loadingOptions}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select Machine (Optional)</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code}) — {m.status || "idle"}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Warehouse className="h-3.5 w-3.5 text-amber-600" /> Issue From Warehouse
            </label>
            <select
              name="warehouse_id"
              value={form.warehouse_id}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {WAREHOUSES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assigned Operator Name
            </label>
            <input
              type="text"
              name="operator_name"
              placeholder="e.g. Ravi Kumar"
              value={form.operator_name}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {submitting ? "Issuing..." : (
                <>
                  <CheckCircle className="h-4 w-4" /> Issue Materials
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

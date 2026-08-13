import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Package,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ChevronUp,
  Plus,
  Boxes,
  Tag,
  Warehouse as WarehouseIcon,
} from "lucide-react";

import { createInventoryItem, getSuppliers, getWarehouses } from "../../api/inventoryApi";
import useTenantId from "../../hooks/useTenantId";

const RAW_MATERIAL_CATEGORIES = [
  "Metals", "Plastics", "Chemicals", "Liquids", "Hardware", "Rubber", "Electrical", "Raw Materials", "Consumables"
];

const FINISHED_GOOD_CATEGORIES = [
  "Finished Goods", "Assemblies", "Machined Parts", "Hardware", "Electrical", "Spare Parts"
];

const DEFAULT_WAREHOUSES = [
  "Main Store",
  "Raw Material Store",
  "Production Store",
  "FG Store",
  "QC Store",
  "Packing Material Warehouse",
  "Water Storage Tank",
  "Warehouse 1",
];

const PAGE_BG = "var(--color-bg)";
const YELLOW = "#F5C518";

/* ─── Collapsible Section Component (matching Create Production) ─────────────── */
function CollapsibleSection({ title, subtitle, expanded, onToggle, children }) {
  return (
    <div className="border-t border-slate-100 py-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="ml-4 flex items-center gap-1.5 rounded-full border border-[#F5C518] bg-white px-4 py-1.5 text-[13px] font-semibold text-slate-800 hover:bg-yellow-50 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Hide</>
          ) : (
            <><Plus className="h-3.5 w-3.5" /> Add</>
          )}
        </button>
      </div>
      {expanded && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {children}
        </div>
      )}
    </div>
  );
}

export default function CreateItem() {
  const tenantId = useTenantId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") === "finished_good"
    ? "finished_good"
    : "raw_material";

  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // Section collapse states
  const [showStock, setShowStock] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showFinishedDetails, setShowFinishedDetails] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [form, setForm] = useState({
    tenant_id: tenantId,
    supplier_id: "",
    sku: "",
    barcode: "",
    name: "",
    description: "",
    category: initialType === "finished_good" ? "Finished Goods" : "Metals",
    warehouse_name: "Main Store",
    batch_number: "",
    quantity: "0",
    reserved: "0",
    unit: initialType === "finished_good" ? "pcs" : "kg",
    unit_cost: "",
    reorder_level: "0",
    status: "in_stock",
    customer_name: "",
    serial_number: "",
    expiry_date: "",
    production_date: "",
    warranty: "",
    item_type: initialType,
  });

  const isFinishedGood = form.item_type === "finished_good";
  const backPath = isFinishedGood
    ? "/inventory/finished-goods"
    : "/inventory/raw-materials";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    getSuppliers(tenantId)
      .then((r) => setSuppliers(r.data || []))
      .catch(() => {});

    getWarehouses()
      .then((r) => {
        const whList = r.data || [];
        if (whList.length > 0) {
          setWarehouses(whList.map((w) => w.name));
          setForm((f) => ({ ...f, warehouse_name: whList[0].name }));
        } else {
          setWarehouses(DEFAULT_WAREHOUSES);
        }
      })
      .catch(() => setWarehouses(DEFAULT_WAREHOUSES));
  }, [tenantId]);

  const handleTypeChange = (newType) => {
    setForm((f) => ({
      ...f,
      item_type: newType,
      category: newType === "finished_good" ? "Finished Goods" : "Metals",
      unit: newType === "finished_good" ? "pcs" : "kg",
    }));
  };

  const handleAutoGenerateSku = () => {
    const prefix = isFinishedGood ? "FG" : "RM";
    const rand = Math.floor(1000 + Math.random() * 9000);
    const categoryCode = (form.category || "GEN").slice(0, 3).toUpperCase();
    const newSku = `${prefix}-${categoryCode}-${rand}`;
    setForm((f) => ({ ...f, sku: newSku }));
    if (fieldErrors.sku) {
      setFieldErrors((e) => ({ ...e, sku: null }));
    }
  };

  const toggleShowAll = () => {
    const next = !showAll;
    setShowAll(next);
    setShowStock(next);
    setShowPricing(next);
    setShowFinishedDetails(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name?.trim()) errs.name = `${isFinishedGood ? "Product" : "Material"} Name is required`;
    if (!form.sku?.trim()) errs.sku = `${isFinishedGood ? "Product" : "Material"} SKU is required`;
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setError("");
    try {
      const payload = {
        tenant_id: Number(tenantId) || 1,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        sku: form.sku.trim(),
        barcode: form.barcode?.trim() || null,
        name: form.name.trim(),
        description: form.description?.trim() || null,
        category: form.category || (isFinishedGood ? "Finished Goods" : "General"),
        warehouse_name: form.warehouse_name || "Main Store",
        batch_number: form.batch_number?.trim() || null,
        quantity: Number(form.quantity) || 0,
        reserved: Number(form.reserved) || 0,
        unit: form.unit || (isFinishedGood ? "pcs" : "kg"),
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        reorder_level: Number(form.reorder_level) || 0,
        status: "in_stock",
        customer_name: form.customer_name?.trim() || null,
        serial_number: form.serial_number?.trim() || null,
        expiry_date: form.expiry_date || null,
        production_date: form.production_date || null,
        warranty: form.warranty?.trim() || null,
        item_type: form.item_type,
      };
      await createInventoryItem(payload);
      navigate(backPath);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((d) => d.msg || d.message).join(", ")
          : `Failed to create ${isFinishedGood ? "finished good" : "raw material"}. Please try again.`
      );
    } finally {
      setSaving(false);
    }
  };

  const categories = isFinishedGood ? FINISHED_GOOD_CATEGORIES : RAW_MATERIAL_CATEGORIES;

  return (
    <div className="min-h-full py-8 pb-16" style={{ background: PAGE_BG }}>
      {/* Centered Form Wrapper */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Back Link */}
        <div className="mb-4">
          <Link
            to={backPath}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#2563EB] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {isFinishedGood ? "Finished Goods" : "Raw Materials"}
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <p className="mt-1 text-xs text-slate-500">
            {isFinishedGood
              ? "Add a new manufactured finished product to your inventory catalog."
              : "Add a new raw material item to your inventory catalog."}
          </p>
        </div>

        {/* Main Card Form styled like Create Production */}
        <div className="rounded-2xl border border-[#e4e4ea] bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Top Mandatory Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* SKU */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    {isFinishedGood ? "Product Stock Keeping Unit (SKU)" : "Material Stock Keeping Unit (SKU)"} <span className="text-red-500">* *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSku}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] hover:underline"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" /> Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder={isFinishedGood ? "e.g. FG-GEAR-1001" : "e.g. RM-STEEL-001"}
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
                />
                <p className="mt-1 text-[11px] text-slate-400">{isFinishedGood ? "Unique finished product code" : "Unique raw material code"}</p>
                {fieldErrors.sku && <p className="mt-1 text-[11px] font-medium text-red-500">{fieldErrors.sku}</p>}
              </div>

              {/* Material Code / Barcode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isFinishedGood ? "Product Code" : "Material Code"}
                </label>
                <input
                  type="text"
                  placeholder={isFinishedGood ? "Optional product code" : "Optional material code"}
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Material / Product Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isFinishedGood ? "Product Name" : "Material Name"} <span className="text-red-500">* *</span>
              </label>
              <input
                type="text"
                required
                placeholder={isFinishedGood ? "e.g. Precision Hydraulic Gearbox" : "e.g. Stainless Steel Sheet 2mm"}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
              />
              {fieldErrors.name && <p className="mt-1 text-[11px] font-medium text-red-500">{fieldErrors.name}</p>}
            </div>

            {/* Category & Warehouse */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warehouse</label>
                <select
                  value={form.warehouse_name}
                  onChange={(e) => setForm((f) => ({ ...f, warehouse_name: e.target.value }))}
                  className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
                >
                  {warehouses.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ─── Collapsible Section 1: Stock Details ─────────────────────────── */}
            <CollapsibleSection
              title={isFinishedGood ? "Stock Details" : "Stock & Inventory Details"}
              subtitle="Quantity (QTY), Reserved Qty, Unit, Batch Number"
              expanded={showStock}
              onToggle={() => setShowStock(!showStock)}
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Batch Number</label>
                <input
                  type="text"
                  placeholder={isFinishedGood ? "e.g. BATCH-FG-001" : "e.g. BATCH-RM-001"}
                  value={form.batch_number}
                  onChange={(e) => setForm((f) => ({ ...f, batch_number: e.target.value }))}
                  className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Quantity (QTY)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.quantity}
                  onFocus={(e) => { const t = e.target; setTimeout(() => t.select(), 0); }}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (/^0+[1-9]/.test(val)) val = val.replace(/^0+/, "");
                    setForm((f) => ({ ...f, quantity: val }));
                  }}
                  className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
                />
                <p className="mt-1 text-[11px] text-slate-400">Initial physical stock count</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reserved Qty</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.reserved}
                  onFocus={(e) => { const t = e.target; setTimeout(() => t.select(), 0); }}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (/^0+[1-9]/.test(val)) val = val.replace(/^0+/, "");
                    setForm((f) => ({ ...f, reserved: val }));
                  }}
                  className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
                />
                <p className="mt-1 text-[11px] text-slate-400">Allocated or reserved stock</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Unit</label>
                <input
                  type="text"
                  placeholder="KGS, GMS, LTR, MTR, SQMTR, SHEET, DRUM, PCS"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
                />
                <p className="mt-1 text-[11px] text-slate-400">Default: {isFinishedGood ? "PCS" : "KGS"}</p>
              </div>
            </CollapsibleSection>

            {/* ─── Collapsible Section 2: Pricing & Reorder ────────────────────── */}
            <CollapsibleSection
              title="Pricing & Reorder Details"
              subtitle="Unit Cost (₹), Reorder Level, Preferred Supplier"
              expanded={showPricing}
              onToggle={() => setShowPricing(!showPricing)}
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Unit Cost (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.unit_cost}
                  onFocus={(e) => { const t = e.target; setTimeout(() => t.select(), 0); }}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (/^0+[1-9]/.test(val)) val = val.replace(/^0+/, "");
                    setForm((f) => ({ ...f, unit_cost: val }));
                  }}
                  className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reorder Level</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.reorder_level}
                  onFocus={(e) => { const t = e.target; setTimeout(() => t.select(), 0); }}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (/^0+[1-9]/.test(val)) val = val.replace(/^0+/, "");
                    setForm((f) => ({ ...f, reorder_level: val }));
                  }}
                  className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
                />
                <p className="mt-1 text-[11px] text-slate-400">Alert when stock falls below this level</p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Preferred Supplier</label>
                <select
                  value={form.supplier_id}
                  onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
                  className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
                >
                  <option value="">Select Preferred Supplier (Optional)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </CollapsibleSection>

            {/* ─── Collapsible Section 3: Finished Goods Additional Details ───── */}
            {isFinishedGood && (
              <CollapsibleSection
                title="Production & Customer Details"
                subtitle="Customer Name, Serial Number, Dates, Warranty"
                expanded={showFinishedDetails}
                onToggle={() => setShowFinishedDetails(!showFinishedDetails)}
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Bosch / Tata Motors"
                    value={form.customer_name}
                    onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                    className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-998210"
                    value={form.serial_number}
                    onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                    className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Production Date</label>
                  <input
                    type="date"
                    value={form.production_date}
                    onChange={(e) => setForm((f) => ({ ...f, production_date: e.target.value }))}
                    className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                    className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warranty Period</label>
                  <input
                    type="text"
                    placeholder="e.g. 12 Months / 2 Years"
                    value={form.warranty}
                    onChange={(e) => setForm((f) => ({ ...f, warranty: e.target.value }))}
                    className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white transition-colors"
                  />
                </div>
              </CollapsibleSection>
            )}

            {/* Show All Fields Toggle Button (Pill Button like image) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={toggleShowAll}
                className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
              >
                {showAll ? "− Hide Optional Fields" : "+ Show All Fields"}
              </button>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
              <Link
                to={backPath}
                className="rounded-full border border-[#e4e4ea] bg-[#f3f3f6] px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-[#ececf0] transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-semibold text-[#1a1a1f] shadow-xs disabled:opacity-60 transition-all hover:opacity-95"
                style={{ background: YELLOW }}
              >
                <Plus className="h-4 w-4" />
                {saving
                  ? "Saving..."
                  : isFinishedGood
                  ? "Create Finished Good"
                  : "Create Raw Material"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
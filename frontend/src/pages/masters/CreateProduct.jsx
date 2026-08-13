import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";

import PageHeader from "../../components/common/PageHeader";
import { FormRow, Input, Select, Textarea } from "../../components/common/FormField";
import { useToast } from "../../context/ToastContext";
import useTenantId from "../../hooks/useTenantId";
import { createProduct, getProductDetail, updateProduct } from "../../api/productsApi";
import { PRODUCT_UNITS, WAREHOUSES } from "../../data/productsMasterData";

const CATEGORY_OPTIONS = [
  "Raw Material",
  "WIP",
  "Finished Goods",
  "Consumables",
  "Spare Parts",
  "Packaging Material",
  "Utility / Raw Material",
].map((c) => ({ value: c, label: c }));

const UNIT_OPTIONS = PRODUCT_UNITS.map((u) => ({ value: u, label: u }));
const WAREHOUSE_OPTIONS = WAREHOUSES.map((w) => ({ value: w, label: w }));
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const EMPTY = {
  product_code: "",
  name: "",
  category: "Finished Goods",
  unit: "Pcs",
  warehouse: "Main Store",
  min_stock: "1",
  max_stock: "100",
  current_stock: "0",
  description: "",
  status: "active",
};

export default function CreateProduct() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const tenantId = useTenantId();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    setLoading(true);
    getProductDetail(id)
      .then((res) => {
        if (cancelled) return;
        const p = res.data || {};
        setForm({
          product_code: p.product_code || p.code || "",
          name: p.name || "",
          category: p.category || "Finished Goods",
          unit: p.unit || p.unit_of_measure || "Pcs",
          warehouse: p.warehouse || "Main Store",
          min_stock: String(p.min_stock ?? 1),
          max_stock: String(p.max_stock ?? 100),
          current_stock: String(p.current_stock ?? 0),
          description: p.description || "",
          status: p.status || "active",
          _sku: p.sku || "",
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load material.");
          addToast("Could not load material", "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, addToast]);

  const set = (key, value) => {
    let val = value;
    if (["current_stock", "min_stock", "max_stock"].includes(key) && typeof val === "string") {
      if (/^0+[1-9]/.test(val)) {
        val = val.replace(/^0+/, "");
      }
    }
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const numericOk = (v) => v === "" || /^(0|[1-9]\d*)(\.\d+)?$/.test(String(v));

  const autoSku = (name, code) => {
    const base = String(code || name || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24);
    return base || `SKU-${Date.now().toString().slice(-6)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errs = {};
    if (!form.name.trim()) errs.name = "Material name is required";
    if (!numericOk(form.min_stock)) errs.min_stock = "Enter a valid number";
    if (!numericOk(form.current_stock)) errs.current_stock = "Enter a valid number";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    const minStock = Number(form.min_stock) || 0;
    const currentStock = Number(form.current_stock) || 0;
    const maxStock = Number(form.max_stock) || (minStock ? minStock * 10 : 100);
    const sku = (form._sku || "").trim() || autoSku(form.name, form.product_code);

    const payload = {
      tenant_id: Number(tenantId) || 1,
      sku,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category || "Finished Goods",
      unit_cost: null,
      unit_price: null,
      min_stock: minStock,
      current_stock: currentStock,
      max_stock: maxStock,
      unit: form.unit || "Pcs",
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateProduct(id, payload);
        addToast("Material updated", "success");
      } else {
        await createProduct(payload);
        addToast("Material created", "success");
      }
      navigate("/masters/products");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg || d.message).filter(Boolean).join(", ")
            : isEdit
              ? "Failed to update material."
              : "Failed to create material.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-slate-500">Loading material…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <Link
        to="/masters/products"
        className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to materials
      </Link>

      <PageHeader
        title={isEdit ? "Edit Material" : "Add Materials"}
        subtitle="Enter material details on this page, then save."
      />

      <form onSubmit={handleSubmit} className="ui-card space-y-4 p-5 sm:p-6">
        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <FormRow>
          <Input
            label="Material name"
            required
            autoFocus
            placeholder="e.g. HDPE Bottle 500ml"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={fieldErrors.name}
          />
          <Input
            label="Material code"
            placeholder="Optional"
            value={form.product_code}
            onChange={(e) => set("product_code", e.target.value)}
          />
        </FormRow>

        <FormRow className="sm:grid-cols-3">
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            options={CATEGORY_OPTIONS}
          />
          <Select
            label="Unit"
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            options={UNIT_OPTIONS}
          />
          <Select
            label="Warehouse"
            value={form.warehouse}
            onChange={(e) => set("warehouse", e.target.value)}
            options={WAREHOUSE_OPTIONS}
          />
        </FormRow>

        <Select
          label="Status"
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
          options={STATUS_OPTIONS}
        />

        <FormRow className="sm:grid-cols-3">
          <Input
            label="Current stock"
            type="number"
            min="0"
            step="1"
            value={form.current_stock}
            onChange={(e) => set("current_stock", e.target.value)}
            error={fieldErrors.current_stock}
          />
          <Input
            label="Min stock"
            type="number"
            min="0"
            step="1"
            value={form.min_stock}
            onChange={(e) => set("min_stock", e.target.value)}
            error={fieldErrors.min_stock}
          />
          <Input
            label="Max stock"
            type="number"
            min="0"
            step="1"
            value={form.max_stock}
            onChange={(e) => set("max_stock", e.target.value)}
          />
        </FormRow>

        <Textarea
          label="Description"
          rows={3}
          placeholder="Optional notes"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <Link
            to="/masters/products"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="ui-btn-primary min-w-[9rem] disabled:opacity-60">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add Materials"}
          </button>
        </div>
      </form>
    </div>
  );
}

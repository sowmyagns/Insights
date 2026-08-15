import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";

import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import { createProduct } from "../../api/productsApi";
import { createSalesOrder } from "../../api/salesApi";
import { fetchCustomersWithFallback, resolveCustomerId } from "../../utils/customerOptions";
import { fetchProductsWithFallback } from "../../utils/productOptions";
import useTenantId from "../../hooks/useTenantId";

import Button from "../../components/common/Button";
const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

const UNITS = ["pcs", "nos", "kg", "ltr", "box", "set", "mtr"];

function emptyLine() {
  return { product_id: "", item_description: "", quantity: "1", unit: "pcs", unit_price: "" };
}

/** Inline quick-add product modal — saves to backend API for tenant */
function QuickAddProductModal({ onClose, onAdded }) {
  const tenantId = useTenantId();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit_price, setUnitPrice] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    if (unit_price !== "" && !isNaN(Number(unit_price)) && Number(unit_price) < 0) {
      alert("Price cannot be negative.");
      return;
    }
    setSaving(true);
    try {
      const generatedSku = sku.trim() || `SKU-${Date.now()}`;
      const res = await createProduct({
        tenant_id: Number(tenantId) || 1,
        name: name.trim(),
        sku: generatedSku,
        product_code: generatedSku,
        unit_price: Number(unit_price) || 0,
        unit,
      }).catch(() => null);

      const newProduct = res?.data || {
        id: `local-${Date.now()}`,
        name: name.trim(),
        sku: generatedSku,
        product_code: generatedSku,
        unit_price: Number(unit_price) || 0,
        unit,
        quantity: Number(quantity) || 1,
      };
      onAdded(newProduct);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Quick Add Product</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <label className="block text-xs font-semibold text-slate-600">
          Product Name *
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Steel Rod 10mm" className={inputClass} />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          SKU / Code
          <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. SR-10MM" className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-slate-600">
            Unit Price (₹)
            <input type="number" min="0" value={unit_price} onChange={(e) => setUnitPrice(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Unit
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Quantity
            <input type="number" min="0.001" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={handleSave} disabled={!name.trim()} className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50">Add Product</button>
        </div>
      </div>
    </div>
  );
}

export default function CreateSalesOrder() {
  const tenantId = useTenantId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editKey = searchParams.get("edit") || "";
  const isEdit = Boolean(editKey);

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [form, setForm] = useState({
    tenant_id: tenantId,
    customer_id: searchParams.get("customer_id") || "",
    order_number: "",
    reference_number: searchParams.get("reference") || "",
    order_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    status: "draft",
  });
  const [lines, setLines] = useState([emptyLine()]);

  useEffect(() => {
    Promise.all([
      fetchCustomersWithFallback().catch(() => []),
      fetchProductsWithFallback().catch(() => []),
    ]).then(([custs, prods]) => {
      setCustomers(custs);
      setProducts(Array.isArray(prods) ? prods : []);

      // Pre-fill form if editing
      if (editKey) {
        const stored = localStorage.getItem("smrt_sales_orders");
        const localOrders = stored ? JSON.parse(stored) : [];
        const so = localOrders.find(
          (o) => String(o.order_number || o.so_number).toLowerCase() === editKey.toLowerCase()
        );
        if (so) {
          // resolve customer_id from name if needed
          const matchedCust = custs.find(
            (c) => String(c.id) === String(so.customer_id) ||
                   String(c.name).toLowerCase() === String(so.customer_name || "").toLowerCase()
          );
          setForm({
            tenant_id: tenantId,
            customer_id: matchedCust ? String(matchedCust.id) : so.customer_id || "",
            order_number: so.order_number || so.so_number || "",
            reference_number: so.reference_number || "",
            order_date: String(so.order_date || so.so_date || "").slice(0, 10),
            due_date: String(so.due_date || "").slice(0, 10),
            status: so.status || "draft",
          });
          if (so.line_items?.length) {
            setLines(so.line_items.map((l) => ({
              product_id: String(l.product_id || ""),
              item_description: l.item_description || "",
              quantity: String(l.quantity || "1"),
              unit: l.unit || "pcs",
              unit_price: String(l.unit_price || ""),
            })));
          }
        }
      }
    })
    .catch(() => setError("Could not load customers/products."))
    .finally(() => setLoading(false));
  }, [editKey]);

  const totalAmount = useMemo(() =>
    lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0)
  , [lines]);

  const updateLine = (index, patch) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if (patch.product_id !== undefined) {
          const product = products.find((p) => String(p.id) === String(patch.product_id));
          if (product) {
            next.item_description = product.name;
            next.unit_price = product.unit_price != null ? String(product.unit_price) : next.unit_price;
          }
        }
        return next;
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validLines = lines.filter((l) => l.item_description && Number(l.quantity) > 0);
    if (!validLines.length) {
      setError("Add at least one product line.");
      return;
    }
    setSaving(true);

    const selectedCustomer = customers.find(
      (c) => String(c.id) === String(form.customer_id)
    );
    const custName = selectedCustomer?.name || selectedCustomer?.company || form.customer_id || "Customer";
    const soNo = form.order_number?.trim() || `SO-${Date.now()}`;
    const soDate = form.order_date || new Date().toISOString().slice(0, 10);

    let createdId = `so-${Date.now()}`;

    if (!isEdit) {
      try {
        const customerId = await resolveCustomerId(form.customer_id, customers, tenantId);
        const res = await createSalesOrder({
          ...form,
          customer_id: customerId,
          order_number: soNo,
          total_amount: totalAmount,
          line_items: validLines.map((l) => {
            const qty = Number(l.quantity);
            const price = Number(l.unit_price) || 0;
            return {
              product_id: Number(l.product_id) || null,
              item_description: l.item_description,
              quantity: qty,
              unit: l.unit || "pcs",
              unit_price: price,
              line_total: Math.round(qty * price * 100) / 100,
            };
          }),
        });
        if (res?.data?.id) createdId = res.data.id;
      } catch { /* local fallback */ }
    }

    const newSO = {
      id: createdId,
      order_number: soNo,
      so_number: soNo,
      customer_name: custName,
      customer_id: form.customer_id,
      order_date: soDate,
      so_date: soDate,
      due_date: form.due_date || "",
      reference_number: form.reference_number || "",
      total_amount: totalAmount,
      amount: totalAmount,
      status: isEdit ? (form.status || "draft") : "pending",
      line_items: validLines.map((l) => ({
        product_id: l.product_id,
        item_description: l.item_description,
        quantity: Number(l.quantity),
        unit: l.unit || "pcs",
        unit_price: Number(l.unit_price) || 0,
        line_total: (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
      })),
      items_count: validLines.length,
      created_at: new Date().toISOString(),
    };

    const stored = localStorage.getItem("smrt_sales_orders");
    const localOrders = stored ? JSON.parse(stored) : [];
    // Replace existing entry if editing, prepend if new
    const updated = isEdit
      ? localOrders.map((o) =>
          String(o.order_number || o.so_number).toLowerCase() === editKey.toLowerCase() ? newSO : o
        )
      : [newSO, ...localOrders.filter((o) => String(o.order_number || o.so_number) !== soNo)];
    localStorage.setItem("smrt_sales_orders", JSON.stringify(updated));

    setSaving(false);
    navigate("/sales/orders");
  };

  if (loading) return <Loader label="Loading..." />;

  return (
    <>
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <Link to="/sales/orders" className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-[var(--color-success)]">
        <ArrowLeft className="h-4 w-4" /> Back to sales orders
      </Link>
      <PageHeader
        title={isEdit ? `Edit Sales Order — ${editKey}` : "New Sales Order"}
        subtitle={isEdit ? "Update order details and product lines." : "Add product lines so Confirm can run MRP and create production orders."}
      />

      <form onSubmit={handleSubmit} className="ui-card space-y-4 p-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Customer *
          <select required value={form.customer_id} onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))} className={inputClass}>
            <option value="">Select customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {customers.length === 0 && (
          <p className="text-sm text-slate-500">No customers yet. <Link to="/masters/customers" className="font-medium text-teal-600 hover:underline">Add a customer first</Link>.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Order number
            <input type="text" value={form.order_number} onChange={(e) => setForm((f) => ({ ...f, order_number: e.target.value }))} placeholder="Auto-generated if empty" className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Reference number
            <input type="text" value={form.reference_number} onChange={(e) => setForm((f) => ({ ...f, reference_number: e.target.value }))} className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Order date
            <input type="date" value={form.order_date} onChange={(e) => setForm((f) => ({ ...f, order_date: e.target.value }))} className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Due date
            <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className={inputClass} />
          </label>
          {isEdit && (
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
                {["draft", "pending", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-end">
            <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:bg-slate-900 dark:text-slate-100">
              Total: ₹{totalAmount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Product lines *</h3>
            <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])} className="inline-flex items-center gap-1 text-sm font-semibold text-[#2563EB]">
              <Plus className="h-4 w-4" /> Add line
            </button>
          </div>
          {lines.map((line, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-600 sm:grid-cols-12">
              <label className="block text-xs font-medium text-slate-600 sm:col-span-4">
                Product
                <select value={line.product_id} onChange={(e) => updateLine(index, { product_id: e.target.value })} className={inputClass}>
                  <option value="">Select</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.product_code || p.sku ? `${p.product_code || p.sku} — ` : ""}{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Qty
                <input type="number" min="0.001" step="any" required value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Unit
                <select value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} className={inputClass}>
                  {["pcs", "nos", "kg", "ltr", "box", "set", "mtr"].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Unit price
                <input type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => updateLine(index, { unit_price: e.target.value })} className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-600 sm:col-span-1">
                Description
                <input type="text" required value={line.item_description} onChange={(e) => updateLine(index, { item_description: e.target.value })} className={inputClass} />
              </label>
              <div className="flex items-end sm:col-span-1">
                <button type="button" disabled={lines.length === 1} onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} className="rounded-lg border border-rose-200 p-2.5 text-rose-600 disabled:opacity-40" title="Remove line">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {!products.length && (
            <p className="text-sm text-amber-700">
              No products yet.{" "}
              <button type="button" onClick={() => setShowQuickAdd(true)} className="font-semibold underline text-[#2563EB]">Add a product</button>
              {" "}to get started.
            </p>
          )}
          <button type="button" onClick={() => setShowQuickAdd(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline mt-1">
            <Plus className="h-3.5 w-3.5" /> Add New Product
          </button>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="primary" type="submit" disabled={saving || !form.customer_id} className="disabled:opacity-50">
            {saving ? "Saving…" : isEdit ? "Update Sales Order" : "Create Sales Order"}
          </Button>
          <Link to="/sales/orders" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>

    {showQuickAdd && (
      <QuickAddProductModal
        onClose={() => setShowQuickAdd(false)}
        onAdded={(newProduct) => {
          setProducts((prev) => [newProduct, ...prev]);
          setLines((prev) => {
            const last = prev[prev.length - 1];
            const isBlank = !last.product_id && !last.item_description;
            const patch = {
              product_id: newProduct.id,
              item_description: newProduct.name,
              unit_price: String(newProduct.unit_price || ""),
              unit: newProduct.unit || "pcs",
              quantity: String(newProduct.quantity || "1"),
            };
            return isBlank
              ? prev.map((l, i) => i === prev.length - 1 ? { ...l, ...patch } : l)
              : [...prev, { ...emptyLine(), ...patch }];
          });
        }}
      />
    )}
  </>
  );
}

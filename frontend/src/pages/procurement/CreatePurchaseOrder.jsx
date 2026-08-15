import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Search, Trash2, Upload, X } from "lucide-react";

import {
  getVendors,
  createVendor,
  createPurchaseOrder,
  getPurchaseOrder,
  updatePurchaseOrder,
} from "../../api/procurementApi";
import { getInventoryDashboard } from "../../api/inventoryApi";
import { useToast } from "../../context/ToastContext";
import useTenantId from "../../hooks/useTenantId";
import usePageRefresh from "../../hooks/usePageRefresh";
import { INDIAN_STATES } from "../../data/customersMasterData";
import { apiErrorMessage, asArray } from "../../utils/apiError";
import SearchableSelect from "../../components/common/SearchableSelect";

const darkButton = "rounded-md bg-[#2d2a4a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1a1a1f] disabled:cursor-not-allowed disabled:opacity-50";
const blueButton =
  "rounded-md border border-[var(--color-action-blue)] bg-[var(--color-action-blue)] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[var(--color-action-blue-hover)] active:bg-[var(--color-action-blue-active)] disabled:cursor-not-allowed disabled:opacity-50";
const outlineButton = "rounded-md border border-[#2d2a4a] bg-white px-4 py-2.5 text-sm font-bold text-[#2d2a4a] hover:bg-[#f7f5fb]";
const softButton = "rounded-md border border-[#d0d0d8] bg-[#f0f0f4] px-4 py-2.5 text-sm font-bold text-[#2d2a4a] hover:bg-[#e8e8ee]";
const underline = "w-full border-0 border-b border-slate-400 bg-transparent px-0 py-2 text-sm text-slate-900 outline-none focus:border-[#2d2a4a]";
const field = "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2d2a4a]";
const Section = ({ title, actions, children, className = "" }) => (
  <section className={`overflow-hidden border-b border-[#d0d0d8] bg-white ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#efeaf8] px-4 py-2.5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#2d2a4a]">{title}</h2>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
    {children != null ? <div className="p-4">{children}</div> : null}
  </section>
);
const Field = ({ label, children }) => (
  <label className="block text-[12px] font-semibold text-[#6b6b76]">
    {label}
    {children}
  </label>
);

function Modal({ title, children, onClose }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-[#2d2a4a] px-5 py-4 text-white"><h3 className="font-bold">{title}</h3><button type="button" aria-label="Close" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#2d2a4a]"><X size={17} /></button></div>
      <div className="p-5">{children}</div>
    </div>
  </div>;
}

const vendorEmpty = { gstin: "", gst_registration_type: "CONSUMER", pan: "", name: "", address: "", city: "", pincode: "", state: "", phone: "", email: "", sells: false };
const consigneeEmpty = { gstin: "", gst_registration_type: "CONSUMER", name: "", address: "", city: "", pincode: "", state: "", phone: "", email: "" };
const chargeEmpty = { taxable: "", gst: "", amount: "0" };
const GST_TYPES = ["CONSUMER", "REGISTERED BUSINESS", "COMPOSITION", "UNREGISTERED BUSINESS", "OVERSEAS / EXPORT", "SEZ"];
const PRODUCT_UNITS = ["Nos", "Kg", "Gram", "Litre", "Ml", "Meter", "Box", "Pack", "Dozen", "Set", "Pair", "Hour", "Day"];
const GST_RATES = ["GST @ 0%", "GST @ 0.1%", "GST @ 0.25%", "GST @ 1.5%", "GST @ 3%", "GST @ 5%", "GST @ 6%", "GST @ 12%", "GST @ 14%", "GST @ 18%", "GST @ 28%", "No GST", "Exempted", "Non-GST"];
const productEmpty = {
  item_id: null,
  name: "",
  description: "",
  hsn: "",
  quantity: "0",
  unit: "",
  unit_price: "",
  taxType: "Exclusive",
  discount: "0",
  discountType: "Percentage",
  gst: "GST @ 0%",
  cess: "0",
  cessType: "Percentage",
  salesPrice: "",
  secondaryUnit: "",
  wholesale: "",
  maintainStock: true,
  openingStock: "",
  lowStock: "",
  barcode: "",
};

function gstLabelFromRate(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return "GST @ 0%";
  const match = GST_RATES.find((label) => parseGstRate(label) === n && !/no gst|exempted|non-gst/i.test(label));
  return match || `GST @ ${n}%`;
}

function parseGstRate(gst) {
  if (!gst || /no gst|exempted|non-gst/i.test(gst)) return 0;
  const match = String(gst).match(/([\d.]+)/);
  return match ? Number(match[1]) : 0;
}

function productAmounts(p) {
  const qty = Number(p.quantity) || 0;
  const price = Number(p.unit_price) || 0;
  const discount = Number(p.discount) || 0;
  const cess = Number(p.cess) || 0;
  const gstRate = parseGstRate(p.gst);
  let base = qty * price;
  if (p.discountType === "Percentage") base -= (base * discount) / 100;
  else base -= discount;
  base = Math.max(0, base);
  let taxable;
  let tax;
  if (p.taxType === "Inclusive" && gstRate > 0) {
    taxable = base / (1 + gstRate / 100);
    tax = base - taxable;
  } else {
    taxable = base;
    tax = (taxable * gstRate) / 100;
  }
  const cessAmt = p.cessType === "Unit Wise" ? cess * qty : (taxable * cess) / 100;
  const final = p.taxType === "Inclusive" && gstRate > 0 ? base + cessAmt : taxable + tax + cessAmt;
  return {
    taxable: Math.round(taxable * 100) / 100,
    tax: Math.round((tax + cessAmt) * 100) / 100,
    final: Math.round(final * 100) / 100,
    unitPrice: price,
  };
}

function chargeAmount(taxable, gst) {
  const t = Number(taxable) || 0;
  const g = Number(gst) || 0;
  return (Math.round((t + (t * g) / 100) * 100) / 100).toFixed(2);
}

function OutlinedField({ label, children }) {
  return (
    <label className="relative block">
      <span className="absolute -top-2 left-3 z-10 bg-white px-1 text-[11px] font-medium text-[#6b6b76]">{label}</span>
      {children}
    </label>
  );
}

function ChargeRow({ title, value, onChange }) {
  const amount = chargeAmount(value.taxable, value.gst);
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-bold text-[#1a1a1f]">{title}</p>
      <div className="grid gap-3 md:grid-cols-3">
        <OutlinedField label="Taxable Amount">
          <input
            className={`${field} pt-3`}
            placeholder="Enter Taxable Amount"
            value={value.taxable}
            onChange={(e) =>
              onChange({
                ...value,
                taxable: e.target.value.replace(/[^\d.]/g, ""),
                amount: chargeAmount(e.target.value.replace(/[^\d.]/g, ""), value.gst),
              })
            }
          />
        </OutlinedField>
        <OutlinedField label="GST(%)">
          <input
            className={`${field} pt-3`}
            placeholder="GST(%)"
            value={value.gst}
            onChange={(e) =>
              onChange({
                ...value,
                gst: e.target.value.replace(/[^\d.]/g, ""),
                amount: chargeAmount(value.taxable, e.target.value.replace(/[^\d.]/g, "")),
              })
            }
          />
        </OutlinedField>
        <OutlinedField label="Amount">
          <input className={`${field} pt-3 bg-[#f7f7f9]`} value={amount} readOnly />
        </OutlinedField>
      </div>
    </div>
  );
}

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const editId = routeId || location.state?.viewId || null;
  const isEdit = Boolean(editId);
  const tenantId = useTenantId();
  const { addToast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [vendorSearch, setVendorSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [addVendor, setAddVendor] = useState(vendorEmpty);
  const [newProduct, setNewProduct] = useState(productEmpty);
  const [productTab, setProductTab] = useState("basic");
  const [consignee, setConsignee] = useState(false);
  const [selectedConsignee, setSelectedConsignee] = useState(null);
  const [consignees, setConsignees] = useState([]);
  const [consigneeSearch, setConsigneeSearch] = useState("");
  const [addConsignee, setAddConsignee] = useState(consigneeEmpty);
  const [otherOpen, setOtherOpen] = useState(false);
  const [signature, setSignature] = useState(false);
  const [charges, setCharges] = useState({
    freight: { ...chargeEmpty },
    insurance: { ...chargeEmpty },
    loading: { ...chargeEmpty },
    packing: { ...chargeEmpty },
    other: { ...chargeEmpty, name: "" },
    shipping_handling: "0",
    other_charges: "0",
  });
  const [form, setForm] = useState({ prefix: "PO-", number: "1", order_date: new Date().toISOString().slice(0, 10), expected_date: "", payment_terms: "", notes: "", supplier_id: "", terms: "1. This is an electronically generated document.\n2. All disputes are subject to BUYER CITY jurisdiction" });
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [lines, setLines] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [vendorRes, itemRes] = await Promise.all([getVendors(), getInventoryDashboard()]);
      const vendorList = asArray(vendorRes.data);
      setVendors(vendorList);
      setConsignees(vendorList);
      const dash = itemRes.data;
      const itemList = Array.isArray(dash)
        ? dash
        : asArray(dash?.items).length
          ? asArray(dash.items)
          : asArray(dash?.inventory_items);
      setItems(itemList);

      if (editId) {
        const po =
          location.state?.document ||
          (await getPurchaseOrder(editId)).data;
        if (!po) throw new Error("Purchase order not found");
        const num = String(po.po_number || "");
        const prefixMatch = num.match(/^([A-Za-z-]+)/);
        const vendor = vendorList.find((v) => String(v.id) === String(po.supplier_id));
        setSelectedVendor(vendor || null);
        setForm((f) => ({
          ...f,
          prefix: prefixMatch?.[1] || f.prefix,
          number: num.replace(/^[A-Za-z-]+/, "") || num || f.number,
          order_date: po.order_date ? String(po.order_date).slice(0, 10) : f.order_date,
          expected_date: po.expected_date ? String(po.expected_date).slice(0, 10) : "",
          notes: po.notes || "",
          supplier_id: po.supplier_id || "",
        }));
        const poLines = Array.isArray(po.line_items) ? po.line_items : [];
        setLines(
          poLines.map((line) => {
            const inv = itemList.find((i) => String(i.id || i.item_id) === String(line.item_id));
            return {
              ...productEmpty,
              item_id: line.item_id,
              name: inv?.name || inv?.item_name || `Item #${line.item_id}`,
              quantity: String(line.quantity ?? 0),
              unit_price: line.unit_price ?? "",
              unit: inv?.unit || "",
            };
          })
        );
      }
    } catch (err) {
      addToast(apiErrorMessage(err, "Could not load purchase order."), "error");
      if (editId) navigate("/procurement/purchase-orders");
    } finally {
      setLoading(false);
    }
  };

  usePageRefresh(load);
  useEffect(() => {
    load();
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredVendors = useMemo(() => vendors.filter((v) => `${v.name} ${v.phone || ""} ${v.email || ""}`.toLowerCase().includes(vendorSearch.toLowerCase())), [vendors, vendorSearch]);
  const filteredConsignees = useMemo(
    () =>
      consignees.filter((v) =>
        `${v.name} ${v.phone || ""} ${v.email || ""}`.toLowerCase().includes(consigneeSearch.toLowerCase())
      ),
    [consignees, consigneeSearch]
  );
  const filteredItems = useMemo(() => items.filter((i) => `${i.name || i.item_name || i.product_name || ""}`.toLowerCase().includes(productSearch.toLowerCase())), [items, productSearch]);
  const newProductTotals = useMemo(() => productAmounts(newProduct), [newProduct]);
  const lineTotal = (line) => Number(line.quantity || 0) * Number(line.unit_price || 0);
  const updateLine = (index, key, value) => setLines((old) => old.map((line, i) => i === index ? { ...line, [key]: value } : line));
  const chooseItem = (item) => {
    const id = item.id || item.item_id;
    if (!id) return;
    if (lines.some((line) => String(line.item_id) === String(id))) {
      addToast("This product is already on the purchase order.", "warning");
      setModal(null);
      return;
    }
    const price = item.unit_price ?? item.purchase_price ?? item.unit_cost ?? item.price ?? "";
    const gstSource = item.gst ?? item.gst_rate ?? item.tax_rate;
    setNewProduct({
      ...productEmpty,
      item_id: id,
      name: item.name || item.item_name || item.product_name || `Item #${id}`,
      description: item.description || "",
      hsn: item.hsn || item.hsn_sac || item.hsn_code || "",
      quantity: "0",
      unit: item.unit || item.unit_of_measure || "",
      unit_price: price === null || price === undefined ? "" : String(price),
      gst: typeof gstSource === "string" && gstSource.includes("GST")
        ? gstSource
        : gstLabelFromRate(gstSource),
    });
    setProductTab("basic");
    setModal("addProduct");
  };
  const openAddProductBlank = () => {
    setNewProduct(productEmpty);
    setProductTab("basic");
    setModal("addProduct");
  };
  const closeProductModal = () => {
    setNewProduct(productEmpty);
    setProductTab("basic");
    setModal(null);
  };
  const chooseVendor = (vendor) => { setSelectedVendor(vendor); setForm((f) => ({ ...f, supplier_id: vendor.id })); setModal(null); };
  const chooseConsignee = (party) => {
    setSelectedConsignee(party);
    setModal(null);
  };
  const saveConsignee = () => {
    if (!addConsignee.name) {
      addToast("Company name is required.", "error");
      return;
    }
    const party = {
      id: `local-consignee-${Date.now()}`,
      ...addConsignee,
      address_line1: addConsignee.address,
    };
    setConsignees((old) => [party, ...old]);
    setSelectedConsignee(party);
    setAddConsignee(consigneeEmpty);
    setModal(null);
    addToast("Consignee added.");
  };
  const saveVendor = async () => {
    if (!addVendor.name || !addVendor.phone || !addVendor.email) { addToast("Company name, mobile and email are required.", "error"); return; }
    try {
      const gstType = addVendor.gst_registration_type === "COMPOSITION" ? "Composition" : addVendor.gst_registration_type === "REGISTERED BUSINESS" ? "Regular" : "Unregistered";
      const res = await createVendor({ tenant_id: tenantId, name: addVendor.name, contact: addVendor.name, phone: addVendor.phone, email: addVendor.email, gstin: addVendor.gstin || null, pan: addVendor.pan || null, gst_registration_type: gstType, address_line1: addVendor.address || null, city: addVendor.city || null, pincode: addVendor.pincode || null, state: addVendor.state || null, vendor_type: "Raw Material Supplier" });
      const created = res.data;
      setVendors((old) => [...old, created]);
      setConsignees((old) => [...old, created]);
      chooseVendor(created);
      setAddVendor(vendorEmpty);
      addToast("Vendor added successfully.");
    } catch (err) { addToast(apiErrorMessage(err, "Could not add vendor."), "error"); }
  };
  const addLocalProduct = () => {
    if (!newProduct.name.trim()) { addToast("Enter a product name.", "error"); return; }
    const qty = Number(newProduct.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      addToast("Enter a quantity greater than 0.", "error");
      return;
    }
    const line = {
      ...newProduct,
      quantity: qty,
      unit_price: newProduct.unit_price === "" ? "" : Number(newProduct.unit_price),
      local: !newProduct.item_id,
    };
    setLines((old) => [...old, line]);
    setNewProduct(productEmpty);
    setProductTab("basic");
    setModal(null);
    if (newProduct.item_id) {
      addToast("Product added to purchase order.");
    } else {
      addToast("Product added locally. Select an inventory item before saving this PO.", "warning");
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    const validLines = lines.filter((line) => line.item_id && Number(line.quantity) > 0);
    if (!form.supplier_id) return addToast("Select a vendor before submitting.", "error");
    if (!validLines.length) return addToast("Select at least one inventory item with a quantity.", "error");
    if (validLines.length !== lines.length) return addToast("Local products must be linked to inventory before saving.", "error");
    setSaving(true);
    try {
      const metaNotes = [
        form.notes || "",
        form.terms || "",
        selectedConsignee ? `Consignee: ${selectedConsignee.name}` : "",
        `Charges: ${JSON.stringify(charges)}`,
      ]
        .filter(Boolean)
        .join("\n");
      const poPayload = {
        supplier_id: Number(form.supplier_id),
        po_number: [form.prefix, form.number].filter(Boolean).join("") || `PO-${Date.now()}`,
        order_date: form.order_date,
        expected_date: form.expected_date || null,
        notes: metaNotes || null,
        line_items: validLines.map((line) => ({
          item_id: Number(line.item_id),
          quantity: Number(line.quantity),
          unit_price: line.unit_price === "" ? null : Number(line.unit_price),
        })),
      };
      if (isEdit) {
        await updatePurchaseOrder(editId, poPayload);
        addToast("Purchase order updated.");
      } else {
        await createPurchaseOrder({
          tenant_id: tenantId,
          status: "draft",
          ...poPayload,
        });
        addToast("Purchase order created.");
      }
      navigate("/procurement/purchase-orders");
    } catch (err) { addToast(apiErrorMessage(err, "Could not save purchase order."), "error"); } finally { setSaving(false); }
  };
  if (loading) return <div className="grid min-h-[40vh] place-items-center text-sm text-slate-500">Loading purchase order form…</div>;

  return <form onSubmit={submit} className="flex h-full min-h-0 flex-col bg-[#F5F5F5] text-slate-800">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#e4e4ea] bg-white px-4 py-3 md:px-6">
      <button type="button" onClick={() => navigate("/procurement/purchase-orders")} className="grid h-9 w-9 place-items-center rounded-full bg-[#2d2a4a] text-white" aria-label="Back"><ArrowLeft size={18} /></button>
      <div className="flex gap-2">
        <button type="button" onClick={() => navigate("/procurement/purchase-orders")} className={outlineButton}>Cancel</button>
        <button type="submit" disabled={saving} className={darkButton}>{saving ? "Saving…" : isEdit ? "Update" : "Submit"}</button>
      </div>
    </header>
    <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl overflow-hidden border border-[#d0d0d8] bg-white">
      <div className="grid gap-5 border-b border-[#d0d0d8] p-5 md:grid-cols-3">
        <Field label="Purchase Order Prefix"><input className={underline} placeholder="Prefix" value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} /></Field>
        <Field label="Purchase Order No."><input className={underline} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
        <Field label="Purchase Order Date"><input type="date" className={underline} value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} required /></Field>
      </div>
      <Section
        title="Vendor Details"
        actions={
          <>
            <button type="button" className={`${darkButton} !py-1.5 !text-[12px]`} onClick={() => setModal("selectVendor")}>Select Vendor</button>
            <button type="button" className={`${softButton} !py-1.5 !text-[12px]`} onClick={() => setModal("addVendor")}>Add New Vendor</button>
          </>
        }
      >
        {selectedVendor ? (
          <div className="text-sm">
            <p className="font-bold text-[#2d2a4a]">{selectedVendor.name}</p>
            <p className="text-[#6b6b76]">{[selectedVendor.address_line1 || selectedVendor.billing_address, selectedVendor.city, selectedVendor.state, selectedVendor.pincode].filter(Boolean).join(", ") || "No address available"}</p>
          </div>
        ) : (
          <p className="py-1 text-sm text-[#9a9aa5]">No vendor selected.</p>
        )}
      </Section>
      <div className="border-b border-[#d0d0d8] px-5 py-3">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-[var(--color-cta)]" checked={consignee} onChange={(e) => setConsignee(e.target.checked)} />Add Consignee (if different from above)</label>
      </div>
      {consignee && (
        <Section
          title="Consignee Details"
          actions={
            <>
              <button type="button" className={`${outlineButton} !py-1.5 !text-[12px]`} onClick={() => setModal("selectConsignee")}>Select Consignee</button>
              <button type="button" className={`${outlineButton} !py-1.5 !text-[12px]`} onClick={() => setModal("addConsignee")}>Add New Consignee</button>
            </>
          }
        >
          {selectedConsignee ? (
            <div className="text-sm">
              <p className="font-bold text-[#2d2a4a]">{selectedConsignee.name}</p>
              <p className="text-[#6b6b76]">{[selectedConsignee.address_line1 || selectedConsignee.address, selectedConsignee.city, selectedConsignee.state, selectedConsignee.pincode].filter(Boolean).join(", ") || "No address available"}</p>
            </div>
          ) : (
            <p className="py-1 text-sm text-[#9a9aa5]">No consignee selected.</p>
          )}
        </Section>
      )}
      <Section
        title="Products"
        actions={
          <>
            <button type="button" className={`${darkButton} !py-1.5 !text-[12px]`} onClick={() => setModal("selectProduct")}>Select Item</button>
            <button type="button" className={`${softButton} !py-1.5 !text-[12px]`} onClick={openAddProductBlank}>Add New Item</button>
          </>
        }
      >
        {lines.length === 0 ? (
          <div className="flex justify-center py-2">
            <button type="button" className="rounded-full border border-[#d0d0d8] bg-[#f7f7f9] px-5 py-1.5 text-[13px] font-medium text-[#6b6b76]">Other Fields</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-sm">
              <thead className="border-y bg-[#f7f7f9] text-left text-xs uppercase text-slate-500">
                <tr><th className="p-2">Item</th><th className="p-2">Qty</th><th className="p-2">Unit</th><th className="p-2">Price</th><th className="p-2">Amount</th><th /></tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={`${line.item_id || line.name}-${index}`} className="border-b">
                    <td className="p-2 font-semibold">{line.name}{line.local && <span className="ml-2 text-xs font-normal text-amber-700">(not linked)</span>}</td>
                    <td className="p-2"><input type="number" min="0" className="w-20 border-b border-slate-300 p-1" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} /></td>
                    <td className="p-2">{line.unit}</td>
                    <td className="p-2"><input type="number" min="0" className="w-24 border-b border-slate-300 p-1" value={line.unit_price} onChange={(e) => updateLine(index, "unit_price", e.target.value)} /></td>
                    <td className="p-2 font-semibold">₹{lineTotal(line).toFixed(2)}</td>
                    <td className="p-2"><button type="button" onClick={() => setLines((old) => old.filter((_, i) => i !== index))} className="text-red-500"><Trash2 size={17} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-center">
              <button type="button" className="rounded-full border border-[#d0d0d8] bg-[#f7f7f9] px-5 py-1.5 text-[13px] font-medium text-[#6b6b76]">Other Fields</button>
            </div>
          </div>
        )}
      </Section>
      <section className="border-b border-[#d0d0d8] bg-white">
        <button
          type="button"
          onClick={() => setOtherOpen(!otherOpen)}
          className="flex w-full items-center justify-between bg-[#efeaf8] px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-[#2d2a4a]"
        >
          Other Details {otherOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {otherOpen ? (
          <div className="space-y-5 p-4">
            <ChargeRow
              title="Freight Charge"
              value={charges.freight}
              onChange={(v) => setCharges((c) => ({ ...c, freight: v }))}
            />
            <ChargeRow
              title="Insurance Charge"
              value={charges.insurance}
              onChange={(v) => setCharges((c) => ({ ...c, insurance: v }))}
            />
            <ChargeRow
              title="Loading Charge"
              value={charges.loading}
              onChange={(v) => setCharges((c) => ({ ...c, loading: v }))}
            />
            <ChargeRow
              title="Packing Charge"
              value={charges.packing}
              onChange={(v) => setCharges((c) => ({ ...c, packing: v }))}
            />
            <div className="space-y-2">
              <p className="text-[13px] font-bold text-[#1a1a1f]">Other Charge</p>
              <OutlinedField label="Other Charge Name">
                <input
                  className={`${field} pt-3`}
                  placeholder="Other Charge Name"
                  value={charges.other.name}
                  onChange={(e) =>
                    setCharges((c) => ({ ...c, other: { ...c.other, name: e.target.value } }))
                  }
                />
              </OutlinedField>
              <div className="grid gap-3 md:grid-cols-3">
                <OutlinedField label="Taxable Amount">
                  <input
                    className={`${field} pt-3`}
                    placeholder="Enter Taxable Amount"
                    value={charges.other.taxable}
                    onChange={(e) => {
                      const taxable = e.target.value.replace(/[^\d.]/g, "");
                      setCharges((c) => ({
                        ...c,
                        other: {
                          ...c.other,
                          taxable,
                          amount: chargeAmount(taxable, c.other.gst),
                        },
                      }));
                    }}
                  />
                </OutlinedField>
                <OutlinedField label="GST(%)">
                  <input
                    className={`${field} pt-3`}
                    placeholder="GST(%)"
                    value={charges.other.gst}
                    onChange={(e) => {
                      const gst = e.target.value.replace(/[^\d.]/g, "");
                      setCharges((c) => ({
                        ...c,
                        other: {
                          ...c.other,
                          gst,
                          amount: chargeAmount(c.other.taxable, gst),
                        },
                      }));
                    }}
                  />
                </OutlinedField>
                <OutlinedField label="Amount">
                  <input
                    className={`${field} pt-3 bg-[#f7f7f9]`}
                    value={chargeAmount(charges.other.taxable, charges.other.gst)}
                    readOnly
                  />
                </OutlinedField>
              </div>
            </div>
            <div>
              <div className="mb-3 bg-[#f3f3f6] px-3 py-2 text-[13px] font-bold text-[#1a1a1f]">
                Optional Fields
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <OutlinedField label="Shipping and Handling Charges">
                  <input
                    className={`${field} pt-3`}
                    value={charges.shipping_handling}
                    onChange={(e) =>
                      setCharges((c) => ({
                        ...c,
                        shipping_handling: e.target.value.replace(/[^\d.]/g, ""),
                      }))
                    }
                  />
                </OutlinedField>
                <OutlinedField label="Other Charges">
                  <input
                    className={`${field} pt-3`}
                    value={charges.other_charges}
                    onChange={(e) =>
                      setCharges((c) => ({
                        ...c,
                        other_charges: e.target.value.replace(/[^\d.]/g, ""),
                      }))
                    }
                  />
                </OutlinedField>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      <section className="border-b border-[#d0d0d8] bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-[#2d2a4a]">Terms & Conditions</h2>
        <textarea
          className="min-h-24 w-full resize-y border-0 bg-transparent text-sm leading-6 outline-none"
          value={form.terms}
          onChange={(e) => setForm({ ...form, terms: e.target.value })}
        />
      </section>
      <Section
        title="Upload Signature (optional)"
        actions={
          <button
            type="button"
            aria-label="Toggle signature"
            onClick={() => setSignature(!signature)}
            className={`relative h-6 w-11 rounded-full ${signature ? "bg-[var(--color-cta)]" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${signature ? "left-[22px]" : "left-0.5"}`} />
          </button>
        }
      >
        {signature ? (
          <div className="border-2 border-dashed border-slate-300 p-7 text-center">
            <Upload className="mx-auto mb-2 text-slate-500" />
            <p className="text-sm text-slate-500">Drop signature image here or choose a file</p>
            <div className="mt-3 flex justify-center gap-2">
              <button type="button" className={darkButton}>Upload</button>
              <button type="button" className={outlineButton}>Remove</button>
            </div>
          </div>
        ) : null}
      </Section>
      </div>
    </main>
    {modal === "selectVendor" && <Modal title="Select Seller" onClose={() => setModal(null)}><div className="mb-4 flex items-center gap-2 border-b border-slate-400"><Search size={18} /><input autoFocus className="w-full border-0 py-2 text-sm outline-none" placeholder="Search" value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} /></div>{filteredVendors.length ? <div className="divide-y">{filteredVendors.map((vendor) => <button type="button" key={vendor.id} onClick={() => chooseVendor(vendor)} className="block w-full px-2 py-3 text-left hover:bg-[#f7f5fb]"><p className="font-semibold text-[#2d2a4a]">{vendor.name}</p><p className="text-xs text-slate-500">{vendor.phone || vendor.email || "No contact details"}</p></button>)}</div> : <p className="py-8 text-center text-sm text-slate-500">No contacts found.</p>}</Modal>}
    {modal === "selectConsignee" && (
      <Modal title="Select Consignee" onClose={() => setModal(null)}>
        <div className="mb-4 flex items-center gap-2 border-b border-slate-400">
          <Search size={18} />
          <input
            autoFocus
            className="w-full border-0 py-2 text-sm outline-none"
            placeholder="Search"
            value={consigneeSearch}
            onChange={(e) => setConsigneeSearch(e.target.value)}
          />
        </div>
        {filteredConsignees.length ? (
          <div className="divide-y">
            {filteredConsignees.map((party) => (
              <button
                type="button"
                key={party.id}
                onClick={() => chooseConsignee(party)}
                className="block w-full px-2 py-3 text-left hover:bg-[#f7f5fb]"
              >
                <p className="font-semibold text-[#2d2a4a]">{party.name}</p>
                <p className="text-xs text-slate-500">
                  {party.phone || party.email || "No contact details"}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">No contacts found.</p>
        )}
      </Modal>
    )}
    {modal === "addConsignee" && (
      <Modal title="Add Consignee" onClose={() => setModal(null)}>
        <div className="grid gap-4 md:grid-cols-2">
          <OutlinedField label="GSTIN no.">
            <input
              className={`${field} pt-3`}
              placeholder="GSTIN No."
              value={addConsignee.gstin}
              onChange={(e) => setAddConsignee({ ...addConsignee, gstin: e.target.value })}
            />
          </OutlinedField>
          <OutlinedField label="GST Treatment Type">
            <select
              className={`${field} pt-3`}
              value={addConsignee.gst_registration_type}
              onChange={(e) =>
                setAddConsignee({ ...addConsignee, gst_registration_type: e.target.value })
              }
            >
              {GST_TYPES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </OutlinedField>
          <OutlinedField label="Company Name">
            <input
              className={`${field} pt-3`}
              placeholder="Enter Company Name"
              value={addConsignee.name}
              onChange={(e) => setAddConsignee({ ...addConsignee, name: e.target.value })}
            />
          </OutlinedField>
          <OutlinedField label="Address">
            <input
              className={`${field} pt-3`}
              placeholder="Enter Address"
              value={addConsignee.address}
              onChange={(e) => setAddConsignee({ ...addConsignee, address: e.target.value })}
            />
          </OutlinedField>
          <OutlinedField label="Company City">
            <input
              className={`${field} pt-3`}
              placeholder="Enter Company City"
              value={addConsignee.city}
              onChange={(e) => setAddConsignee({ ...addConsignee, city: e.target.value })}
            />
          </OutlinedField>
          <OutlinedField label="Pincode">
            <input
              className={`${field} pt-3`}
              placeholder="Enter Pincode"
              value={addConsignee.pincode}
              onChange={(e) => setAddConsignee({ ...addConsignee, pincode: e.target.value })}
            />
          </OutlinedField>
          <OutlinedField label="Select State">
            <SearchableSelect
              value={addConsignee.state}
              onChange={(v) => setAddConsignee({ ...addConsignee, state: v })}
              options={INDIAN_STATES}
              placeholder="Select State"
              searchPlaceholder="Search state or UT…"
              className="!rounded !border-slate-300 !shadow-none !py-2 !text-sm"
            />
          </OutlinedField>
          <OutlinedField label="Mobile">
            <input
              className={`${field} pt-3`}
              placeholder="Enter Mobile Number"
              value={addConsignee.phone}
              onChange={(e) => setAddConsignee({ ...addConsignee, phone: e.target.value })}
            />
          </OutlinedField>
          <OutlinedField label="Email">
            <input
              className={`${field} pt-3`}
              placeholder="Enter Email"
              value={addConsignee.email}
              onChange={(e) => setAddConsignee({ ...addConsignee, email: e.target.value })}
            />
          </OutlinedField>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={outlineButton} onClick={() => setModal(null)}>
            Cancel
          </button>
          <button type="button" className={darkButton} onClick={saveConsignee}>
            Save
          </button>
        </div>
      </Modal>
    )}
    {modal === "addVendor" && <Modal title="Add Vendor" onClose={() => setModal(null)}><div className="grid gap-4 md:grid-cols-2">{[["GSTIN", "gstin"], ["Pancard", "pan"], ["Company Name *", "name"], ["Address", "address"], ["Company City", "city"], ["Pincode", "pincode"], ["Mobile *", "phone"], ["Email *", "email"]].map(([label, key]) => <Field key={key} label={label}><input className={`${field} mt-1`} value={addVendor[key]} onChange={(e) => setAddVendor({ ...addVendor, [key]: e.target.value })} /></Field>)}<Field label="GST Treatment Type"><select className={`${field} mt-1`} value={addVendor.gst_registration_type} onChange={(e) => setAddVendor({ ...addVendor, gst_registration_type: e.target.value })}>{GST_TYPES.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Select State"><select className={`${field} mt-1`} value={addVendor.state} onChange={(e) => setAddVendor({ ...addVendor, state: e.target.value })}><option value="">Select state</option>{INDIAN_STATES.map((state) => <option key={state}>{state}</option>)}</select></Field></div><label className="mt-5 flex gap-2 text-sm"><input type="checkbox" className="accent-[var(--color-cta)]" checked={addVendor.sells} onChange={(e) => setAddVendor({ ...addVendor, sells: e.target.checked })} />Do you also Sell items to this seller?</label><div className="mt-6 flex justify-end gap-3"><button type="button" className={outlineButton} onClick={() => setModal(null)}>Cancel</button><button type="button" className={darkButton} onClick={saveVendor}>Save</button></div></Modal>}
    {modal === "selectProduct" && (
      <Modal title="Select Product" onClose={() => setModal(null)}>
        <div className="mb-4 flex items-center gap-2 border-b border-slate-400">
          <Search size={18} className="text-slate-400" />
          <input
            autoFocus
            className="w-full border-0 py-2 text-sm outline-none placeholder:text-slate-400"
            placeholder="Search"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </div>
        <div className="max-h-[55vh] space-y-2 overflow-y-auto">
          {filteredItems.length ? (
            filteredItems.map((item) => (
              <button
                type="button"
                key={item.id || item.item_id}
                onClick={() => chooseItem(item)}
                className="block w-full rounded-lg bg-[#efeaf8] px-4 py-3 text-left text-sm font-bold text-[#1a1a1f] hover:bg-[#ded5f0]"
              >
                {item.name || item.item_name || item.product_name || `Item #${item.id}`}
              </button>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">No inventory products found.</p>
          )}
        </div>
      </Modal>
    )}
    {modal === "addProduct" && (
      <Modal title="Add New Product" onClose={closeProductModal}>
        <div className="space-y-4">
          <div className="relative flex border-b border-[#e4e4ea]">
            {[
              { id: "basic", label: "Basic Details" },
              { id: "optional", label: "Optional Details" },
            ].map((tab) => {
              const active = productTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProductTab(tab.id)}
                  className={`relative z-[1] flex-1 px-3 py-3 text-sm font-bold transition-colors duration-300 ${
                    active ? "text-[#2d2a4a]" : "text-[#9a9aa5] hover:text-[#6b6b76]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 h-[3px] w-1/2 rounded-full bg-[var(--color-cta)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ transform: productTab === "optional" ? "translateX(100%)" : "translateX(0)" }}
            />
          </div>

          <div className="overflow-hidden">
            <div
              className="flex w-[200%] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ transform: productTab === "optional" ? "translateX(-50%)" : "translateX(0)" }}
            >
              <div className="w-1/2 shrink-0 space-y-4 pr-1">
                <div className="grid gap-4 md:grid-cols-2">
                  <OutlinedField label="Product Name">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Product Name"
                    />
                  </OutlinedField>
                  <OutlinedField label="Description">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      placeholder="Enter description"
                    />
                  </OutlinedField>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <OutlinedField label="HSN">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.hsn}
                      onChange={(e) => setNewProduct({ ...newProduct, hsn: e.target.value })}
                      placeholder="Enter HSN"
                    />
                  </OutlinedField>
                  <OutlinedField label="Quantity">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value.replace(/[^\d.]/g, "") })}
                      placeholder="0"
                    />
                  </OutlinedField>
                  <OutlinedField label="Unit">
                    <select
                      className={`${field} pt-3`}
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    >
                      <option value="">Select unit</option>
                      {[...new Set([newProduct.unit, ...PRODUCT_UNITS].filter(Boolean))].map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </OutlinedField>
                  <OutlinedField label="Unit Price">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.unit_price}
                      onChange={(e) => setNewProduct({ ...newProduct, unit_price: e.target.value.replace(/[^\d.]/g, "") })}
                      placeholder="Unit Price"
                    />
                  </OutlinedField>
                </div>
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
                  <div className="flex flex-wrap items-start gap-6 pt-1">
                    {[
                      { value: "Inclusive", label: "Inclusive" },
                      { value: "Exclusive", label: "Exclusive" },
                    ].map((opt) => (
                      <label key={opt.value} className="flex cursor-pointer items-start gap-2 text-sm">
                        <input
                          type="radio"
                          name="productTaxType"
                          className="mt-1 accent-[var(--color-cta)]"
                          checked={newProduct.taxType === opt.value}
                          onChange={() => setNewProduct({ ...newProduct, taxType: opt.value })}
                        />
                        <span>
                          <span className="font-semibold text-[#1a1a1f]">{opt.label}</span>
                          <span className="mt-0.5 block text-[12px] text-[#6b6b76]">
                            ₹ {Number(newProduct.unit_price || 0).toFixed(opt.value === "Inclusive" ? 2 : 0)} / per unit
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <OutlinedField label="Discount">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.discount}
                      onChange={(e) => setNewProduct({ ...newProduct, discount: e.target.value.replace(/[^\d.]/g, "") })}
                    />
                  </OutlinedField>
                  <OutlinedField label="Discount Type">
                    <select
                      className={`${field} pt-3`}
                      value={newProduct.discountType}
                      onChange={(e) => setNewProduct({ ...newProduct, discountType: e.target.value })}
                    >
                      <option>Percentage</option>
                      <option>Value Wise</option>
                    </select>
                  </OutlinedField>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <OutlinedField label="Select Tax Type">
                    <select
                      className={`${field} pt-3`}
                      value={newProduct.gst}
                      onChange={(e) => setNewProduct({ ...newProduct, gst: e.target.value })}
                    >
                      {GST_RATES.map((rate) => (
                        <option key={rate}>{rate}</option>
                      ))}
                    </select>
                  </OutlinedField>
                  <OutlinedField label="CESS">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.cess}
                      onChange={(e) => setNewProduct({ ...newProduct, cess: e.target.value.replace(/[^\d.]/g, "") })}
                    />
                  </OutlinedField>
                  <OutlinedField label="Cess Type">
                    <select
                      className={`${field} pt-3`}
                      value={newProduct.cessType}
                      onChange={(e) => setNewProduct({ ...newProduct, cessType: e.target.value })}
                    >
                      <option>Percentage</option>
                      <option>Unit Wise</option>
                    </select>
                  </OutlinedField>
                </div>
              </div>

              <div className="w-1/2 shrink-0 space-y-4 pl-1">
                <div className="grid gap-4 md:grid-cols-2">
                  <OutlinedField label="Sales Price">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.salesPrice}
                      onChange={(e) => setNewProduct({ ...newProduct, salesPrice: e.target.value.replace(/[^\d.]/g, "") })}
                      placeholder="Sales Price"
                    />
                  </OutlinedField>
                  <OutlinedField label="Secondary Unit">
                    <select
                      className={`${field} pt-3`}
                      value={newProduct.secondaryUnit}
                      onChange={(e) => setNewProduct({ ...newProduct, secondaryUnit: e.target.value })}
                    >
                      <option value="">Select unit</option>
                      {PRODUCT_UNITS.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </OutlinedField>
                  <OutlinedField label="Wholesale Price">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.wholesale}
                      onChange={(e) => setNewProduct({ ...newProduct, wholesale: e.target.value.replace(/[^\d.]/g, "") })}
                      placeholder="Wholesale"
                    />
                  </OutlinedField>
                  <OutlinedField label="Barcode / Item Code">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.barcode}
                      onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                      placeholder="Barcode"
                    />
                  </OutlinedField>
                  <OutlinedField label="Opening Stock">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.openingStock}
                      onChange={(e) => setNewProduct({ ...newProduct, openingStock: e.target.value.replace(/[^\d.]/g, "") })}
                      placeholder="0"
                    />
                  </OutlinedField>
                  <OutlinedField label="Low Stock Alert">
                    <input
                      className={`${field} pt-3`}
                      value={newProduct.lowStock}
                      onChange={(e) => setNewProduct({ ...newProduct, lowStock: e.target.value.replace(/[^\d.]/g, "") })}
                      placeholder="0"
                    />
                  </OutlinedField>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-[#e4e4ea] bg-[#fafafa] px-4 py-3 text-sm font-semibold text-[#2d2a4a]">
                  Maintain Stock
                  <button
                    type="button"
                    aria-label="Toggle maintain stock"
                    onClick={() => setNewProduct({ ...newProduct, maintainStock: !newProduct.maintainStock })}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
                      newProduct.maintainStock ? "bg-[var(--color-cta)]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
                        newProduct.maintainStock ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#efeaf8] px-4 py-3 text-sm font-bold text-[#1a1a1f]">
            <span>Taxable Amount ₹ {newProductTotals.taxable.toFixed(2)}</span>
            <span>Tax Amount ₹ {newProductTotals.tax.toFixed(2)}</span>
            <span>Final Amount ₹ {newProductTotals.final.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className={`${outlineButton} w-full`} onClick={closeProductModal}>
              Cancel
            </button>
            <button type="button" className={`${blueButton} w-full`} onClick={addLocalProduct}>
              Add
            </button>
          </div>
        </div>
      </Modal>
    )}
  </form>;
}

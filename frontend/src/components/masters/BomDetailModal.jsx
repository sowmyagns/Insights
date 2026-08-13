import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  FileText,
  History,
  Package,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { addBomItem, deleteBomItem, getBillOfMaterials } from "../../api/bomApi";
import { getProducts } from "../../api/productsApi";
import { DEMO_PRODUCTS, enrichApiProduct } from "../../data/productsMasterData";
import { useToast } from "../../context/ToastContext";
import useTenantId from "../../hooks/useTenantId";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "components", label: "Components" },
  { id: "costing", label: "Costing" },
  { id: "routing", label: "Routing" },
  { id: "machines", label: "Machines" },
  { id: "inventory", label: "Inventory" },
  { id: "documents", label: "Documents" },
  { id: "versions", label: "Version History" },
  { id: "audit", label: "Audit Logs" },
];

function Field({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    draft: "bg-amber-100 text-amber-700",
    inactive: "bg-slate-100 text-slate-600",
    pending_approval: "bg-blue-100 text-blue-700",
    low_stock: "bg-orange-100 text-orange-700",
    available: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    pending: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${styles[status] || "bg-slate-100 text-slate-600"}`}>
      {String(status).replace(/_/g, " ")}
    </span>
  );
}

function WorkflowStep({ step, index, total }) {
  const Icon = step.status === "completed" ? CheckCircle2 : step.status === "active" ? Clock : Circle;
  const color = step.status === "completed" ? "text-green-500" : step.status === "active" ? "text-[#2563EB]" : "text-slate-300";
  return (
    <div className="flex flex-col items-center">
      <Icon className={`h-6 w-6 ${color}`} />
      <p className="mt-1 text-xs font-semibold text-slate-700">{step.step}</p>
      <p className="text-[10px] text-slate-400">{step.date !== "—" ? step.date : "Pending"}</p>
      {index < total - 1 && <ArrowDown className="my-1 h-4 w-4 text-slate-300" />}
    </div>
  );
}

export default function BomDetailModal({ bom, onClose, onEdit, onCopy, onDelete, onPrint, onRefresh }) {
  const [tab, setTab] = useState("overview");
  const { addToast } = useToast();

  if (!bom) return null;

  const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  const componentCount = bom.components?.length || 0;

  const handleDeleteLine = async (lineId) => {
    if (!window.confirm("Remove this component line?")) return;
    try {
      if (typeof lineId === "number") {
        await deleteBomItem(lineId);
      }
      addToast("Component removed");
      onRefresh?.();
    } catch {
      addToast("Failed to remove component", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-[#2563EB]">{bom.bom_number}</p>
            <h2 className="text-xl font-bold text-slate-900">{bom.product_name || bom.product}</h2>
            <p className="text-sm text-slate-500">{bom.product_code} · {bom.version} · {componentCount} components</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-5 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === t.id ? "bg-[#2563EB] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "overview" && (
            <div className="space-y-5">
              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-800">Bill of Materials (BOM) Information</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="Bill of Materials (BOM) Number" value={bom.bom_number} />
                  <Field label="Product Name" value={bom.product_name || bom.product} />
                  <Field label="Product Code" value={bom.product_code} />
                  <Field label="Version" value={bom.version} />
                  <Field label="Revision" value={bom.revision} />
                  <Field label="Status" value={<StatusPill status={bom.status} />} />
                  <Field label="Effective Date" value={bom.effective_date || "—"} />
                  <Field label="Expiry Date" value={bom.expiry_date || "N/A"} />
                  <Field label="Created By" value={bom.created_by} />
                  <Field label="Approved By" value={bom.approved_by} />
                </div>
                  <div className="mt-3"><Field label="Description" value={bom.description} /></div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-800">Approval Workflow</h3>
                <div className="flex flex-wrap items-start justify-center gap-2 rounded-xl bg-slate-50 p-4">
                  {(bom.approval_workflow || []).map((step, i, arr) => (
                    <WorkflowStep key={step.step} step={step} index={i} total={arr.length} />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link to="/masters/products" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#2563EB] hover:bg-blue-50 no-underline">View Product</Link>
                <Link to="/inventory/raw-materials" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 no-underline">View Inventory</Link>
                <Link to="/procurement/purchase-orders" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 no-underline">Purchase Orders</Link>
                <Link to="/production/work-orders" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 no-underline">Production Orders</Link>
                <Link to="/quality/inspection" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 no-underline">Quality Reports</Link>
              </div>
            </div>
          )}

          {tab === "components" && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Component</th>
                      <th className="px-3 py-2">Item Code</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Unit Cost</th>
                      <th className="px-3 py-2">Total Cost</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bom.components || []).length === 0 ? (
                      <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">No components added yet</td></tr>
                    ) : (
                      (bom.components || []).map((c, i) => (
                        <tr key={c.id || i} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium">{c.component}</td>
                          <td className="px-3 py-2">{c.item_code}</td>
                          <td className="px-3 py-2">{c.category}</td>
                          <td className="px-3 py-2">{c.unit}</td>
                          <td className="px-3 py-2">{c.qty}</td>
                          <td className="px-3 py-2">{formatInr(c.unit_cost)}</td>
                          <td className="px-3 py-2 font-semibold">{formatInr(c.total_cost)}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteLine(c.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "costing" && bom.costing && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Material Cost", bom.costing.material_cost],
                ["Labour Cost", bom.costing.labour_cost],
                ["Machine Cost", bom.costing.machine_cost],
                ["Electricity Cost", bom.costing.electricity_cost],
                ["Overhead Cost", bom.costing.overhead_cost],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="font-bold text-slate-900">{formatInr(val)}</span>
                </div>
              ))}
              <div className="sm:col-span-2 flex justify-between rounded-xl bg-[#2563EB]/10 px-4 py-4">
                <span className="font-bold text-[#2563EB]">Total Manufacturing Cost</span>
                <span className="text-xl font-bold text-[#2563EB]">{formatInr(bom.costing.total_cost)}</span>
              </div>
            </div>
          )}

          {tab === "routing" && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Operation</th>
                    <th className="px-3 py-2">Work Center</th>
                    <th className="px-3 py-2">Machine</th>
                    <th className="px-3 py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {(bom.routing || []).length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No routing defined</td></tr>
                  ) : (
                    bom.routing.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium">{r.operation}</td>
                        <td className="px-3 py-2">{r.work_center}</td>
                        <td className="px-3 py-2">{r.machine}</td>
                        <td className="px-3 py-2">{r.duration}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === "machines" && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Machine Name</th>
                    <th className="px-3 py-2">Machine Code</th>
                    <th className="px-3 py-2">Capacity</th>
                    <th className="px-3 py-2">Operators</th>
                    <th className="px-3 py-2">Setup Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(bom.machines || []).map((m, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">{m.name}</td>
                      <td className="px-3 py-2">{m.code}</td>
                      <td className="px-3 py-2">{m.capacity}</td>
                      <td className="px-3 py-2">{m.operator_required}</td>
                      <td className="px-3 py-2">{m.setup_time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "inventory" && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Component</th>
                    <th className="px-3 py-2">Required</th>
                    <th className="px-3 py-2">Available</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(bom.inventory_availability || []).map((row, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">{row.component}</td>
                      <td className="px-3 py-2">{row.required}</td>
                      <td className="px-3 py-2">{row.available}</td>
                      <td className="px-3 py-2"><StatusPill status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "documents" && (
            <ul className="space-y-2">
              {(bom.documents || []).length === 0 ? (
                <li className="text-sm text-slate-400">No documents attached</li>
              ) : (
                bom.documents.map((d, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                    <FileText className="h-5 w-5 text-[#2563EB]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{d.name}</p>
                      <p className="text-xs text-slate-500">{d.type} · {d.size}</p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}

          {tab === "versions" && (
            <ul className="space-y-3">
              {(bom.version_history || []).map((v, i) => (
                <li key={i} className="rounded-xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2563EB]">{v.version}</span>
                    <span className="text-xs text-slate-400">{v.date}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{v.changes}</p>
                  <p className="text-xs text-slate-500">By {v.author}</p>
                </li>
              ))}
            </ul>
          )}

          {tab === "audit" && bom.audit && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Created By" value={bom.audit.created_by} />
              <Field label="Modified By" value={bom.audit.modified_by} />
              <Field label="Approved By" value={bom.audit.approved_by} />
              <Field label="Modified Date" value={bom.audit.modified_date} />
              <div className="col-span-2"><Field label="Remarks" value={bom.audit.remarks} /></div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button type="button" onClick={() => onEdit(bom)} className="ui-btn-primary text-xs">Edit BOM</button>
          <button type="button" onClick={() => onCopy(bom)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Copy className="h-3.5 w-3.5" /> Copy BOM
          </button>
          <button type="button" onClick={() => onPrint(bom)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <FileText className="h-3.5 w-3.5" /> Print PDF
          </button>
          <Link to="/production/work-orders/create-quick" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 no-underline">
            <Package className="h-3.5 w-3.5" /> Create Production Order
          </Link>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <History className="h-3.5 w-3.5" /> Material Requirement
          </button>
          <button type="button" onClick={() => onDelete(bom)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * BomFormModal — Create or edit a full Bill of Materials.
 */
export function BomFormModal({ bom, onClose, onSave }) {
  const { addToast } = useToast();

  const [form, setForm] = useState({
    bom_number: bom?.bom_number || "",
    version: bom?.version || "V1.0",
    product_name: bom?.product_name || bom?.product || "",
    product_code: bom?.product_code || "",
    total_cost: bom?.costing?.total_cost ?? "",
    status: bom?.status || "active",
    description: bom?.description || "",
  });

  const [productOptions, setProductOptions] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [existingBomNumbers, setExistingBomNumbers] = useState([]);
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef(null);

  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    let mounted = true;
    setLoadingProducts(true);
    getProducts()
      .then((res) => {
        const apiData = res?.data || [];
        const combined = apiData.length > 0 ? apiData : DEMO_PRODUCTS;
        const rows = combined.map((r) => enrichApiProduct(r));
        if (mounted) setProductOptions(rows);
      })
      .catch(() => {
        if (mounted) setProductOptions(DEMO_PRODUCTS.map((r) => enrichApiProduct(r)));
      })
      .finally(() => mounted && setLoadingProducts(false));
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    let mounted = true;
    getBillOfMaterials()
      .then((res) => {
        const rows = res?.data || [];
        const nums = rows.map((r) => r.bom_number);
        if (mounted) setExistingBomNumbers(nums.filter(Boolean));
      })
      .catch(() => {
        if (mounted) setExistingBomNumbers([]);
      });
    return () => (mounted = false);
  }, []);

  // close dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const q = (query || form.product_code || "").toLowerCase().trim();
  const filteredOptions = productOptions.filter((p) => {
    if (!q) return true;
    return (
      (p.product_code || "").toLowerCase().includes(q) ||
      (p.name || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q)
    );
  });

  const handleSelectProductCode = (code) => {
    setField("product_code", code);
    if (!code) return;
    const p = productOptions.find(
      (x) =>
        x.product_code === code ||
        x.sku === code ||
        String(x.id) === String(code)
    );
    if (p) {
      setField("product_name", p.name || "");
      const costVal = p.selling_price ?? p.total_cost ?? p.price_per_unit ?? p.purchase_price ?? p.unit_cost ?? "";
      setField("total_cost", costVal);
      setField("status", p.status || "active");
      setField("description", p.description || "");
    }
  };

  const [allExistingBoms, setAllExistingBoms] = useState([]);

  useEffect(() => {
    let mounted = true;
    getBillOfMaterials()
      .then((res) => {
        const rows = res?.data || [];
        if (mounted) setAllExistingBoms(rows);
      })
      .catch(() => {});
    return () => (mounted = false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate mandatory fields (strictly reject empty strings or whitespace-only inputs)
    const bomNo = String(form.bom_number || "").trim();
    const prodCode = String(form.product_code || "").trim();
    const prodName = String(form.product_name || "").trim();
    const version = String(form.version || "V1.0").trim();

    if (!bomNo) {
      addToast("Please enter a valid BOM No (cannot be blank)", "error");
      return;
    }
    if (!prodCode) {
      addToast("Please enter a valid Product Code (cannot be blank)", "error");
      return;
    }
    if (!prodName) {
      addToast("Please enter a valid Product Name (cannot be blank)", "error");
      return;
    }
    if (!version) {
      addToast("Please enter a valid Version (cannot be blank)", "error");
      return;
    }

    const existingList = [
      ...(bom?._existingBoms || []),
      ...allExistingBoms,
    ];

    // Validate BOM number uniqueness
    const entered = bomNo;
    const dupBomNo = existingList.find(
      (b) => String(b.id) !== String(bom?.id) &&
             b.bom_number &&
             String(b.bom_number).trim().toLowerCase() === entered.toLowerCase()
    );
    if (dupBomNo) {
      addToast("BOM No already exists — please choose a unique BOM No", "error");
      return;
    }

    // Validate Product + Version uniqueness
    const dupProdVer = existingList.find((b) => {
      if (String(b.id) === String(bom?.id)) return false;
      const bProdName = String(b.product_name || b.product || "").trim().toLowerCase();
      const bProdCode = String(b.product_code || "").trim().toLowerCase();
      const bVersion = String(b.version || "V1.0").trim().toLowerCase();

      const matchProduct =
        (prodName && bProdName === prodName.toLowerCase()) ||
        (prodCode && bProdCode === prodCode.toLowerCase());
      const matchVersion = bVersion === version.toLowerCase();

      return matchProduct && matchVersion;
    });

    if (dupProdVer) {
      addToast(
        `A BOM for product "${prodName}" with version "${version}" already exists. Duplicate BOMs for the same product and version are not allowed.`,
        "error"
      );
      return;
    }

    setSaving(true);
    const costVal = form.total_cost !== "" && form.total_cost != null ? Number(form.total_cost) : 0;

    const savedBom = {
      id: bom?.id || `bom-custom-${Date.now()}`,
      bom_number: bomNo || `BOM-${String(Date.now()).slice(-4)}`,
      product_name: prodName,
      product: prodName,
      product_code: prodCode || `PRD-${String(Date.now()).slice(-4)}`,
      version: version || "V1.0",
      status: form.status || "active",
      category: bom?.category || "Finished Goods",
      warehouse: bom?.warehouse || "Main Store",
      description: String(form.description || "").trim(),
      created_by: bom?.created_by || "Store Manager",
      created_date: bom?.created_date || new Date().toISOString().slice(0, 10),
      last_updated: "Just now",
      components: bom?.components || [
        { id: 1, component: "Raw Material Item", item_code: "RM-001", category: "Raw Material", unit: "Nos", qty: 1, unit_cost: costVal, total_cost: costVal }
      ],
      costing: {
        material_cost: costVal,
        labour_cost: Math.round(costVal * 0.2),
        machine_cost: Math.round(costVal * 0.1),
        electricity_cost: Math.round(costVal * 0.05),
        overhead_cost: Math.round(costVal * 0.08),
        total_cost: costVal,
      },
    };

    setSaving(false);
    onSave(savedBom);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {bom?.id ? "Edit BOM" : "Create BOM"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Row 1: BOM No */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            BOM No *
          </label>
          <input
            value={form.bom_number}
            onChange={(e) => setField("bom_number", e.target.value)}
            placeholder="e.g. BOM-2024-001"
            className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Row 2: Product Code */}
        <div className="relative" ref={wrapperRef}>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Product Code *
          </label>
          <div className="relative">
            {/* Searchable dropdown container */}
            <div className="relative">
              <input
                value={form.product_code}
                onChange={(e) => {
                  setField("product_code", e.target.value);
                  setQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder={loadingProducts ? "Loading products..." : "Select a product"}
                className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
              />
              <button type="button" onClick={() => setDropdownOpen((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
                ▾
              </button>
            </div>

            {dropdownOpen && (
              <div className="absolute z-40 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-slate-100 bg-white shadow-lg">
                <ul className="p-2">
                  {filteredOptions.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-slate-400">No products</li>
                  ) : (
                    filteredOptions.map((p) => (
                      <li
                        key={p.product_code || p.id}
                        onMouseDown={() => {
                          // use onMouseDown to avoid losing focus before click
                          handleSelectProductCode(p.product_code);
                          setQuery(p.product_code);
                          setDropdownOpen(false);
                        }}
                        className="cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-50"
                      >
                        <div className="text-sm font-bold text-slate-800">{p.product_code}</div>
                        <div className="text-xs text-slate-500">{p.name}</div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Product Name & Version */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Product Name *
            </label>
            <input
              required
              value={form.product_name}
              onChange={(e) => setField("product_name", e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Version *
            </label>
            <input
              required
              value={form.version}
              onChange={(e) => setField("version", e.target.value)}
              placeholder="e.g. V1.0"
              className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Row 4: Cost (₹) & Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Cost (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.total_cost}
              onChange={(e) => setField("total_cost", e.target.value)}
              placeholder="e.g. 500"
              className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-slate-700"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
              <option value="pending_approval">Pending Approval</option>
            </select>
          </div>
        </div>

        {/* Row 6: Description */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all resize-none"
          />
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#0D8780] hover:bg-[#0A6C67] px-6 py-2.5 text-sm font-semibold text-white transition-all shadow-sm active:scale-95 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save BOM"}
          </button>
        </div>
      </form>
    </div>
  );
}

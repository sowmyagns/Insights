import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  FileDown,
  FileText,
  Layers,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import BomDetailModal, { BomFormModal } from "../../components/masters/BomDetailModal";
import { useToast } from "../../context/ToastContext";
import { addBomItem, deleteBomItem, getBillOfMaterials } from "../../api/bomApi";
import { getProducts } from "../../api/productsApi";
import useTenantId from "../../hooks/useTenantId";
import usePageRefresh from "../../hooks/usePageRefresh";
import {
  BOM_STATUSES,
  BOM_VERSIONS,
  DEMO_BOMS,
  IMPORT_TEMPLATE_HEADERS,
  PRODUCT_CATEGORIES,
  REPORT_TYPES,
  computeBomSummary,
  groupApiBomRows,
} from "../../data/bomMasterData";
import { exportToExcel, exportToPdf } from "../../utils/exportUtils";

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    draft: "bg-amber-100 text-amber-700",
    inactive: "bg-slate-100 text-slate-600",
    pending_approval: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status] || "bg-slate-100"}`}>
      {String(status).replace(/_/g, " ")}
    </span>
  );
}

export default function BomMaster() {
  const { addToast } = useToast();
  const tenantId = useTenantId();
  const [loading, setLoading] = useState(true);
  const [boms, setBoms] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [selected, setSelected] = useState(null);
  const [formBom, setFormBom] = useState(null);
  const [filters, setFilters] = useState({
    bom_number: "",
    category: "",
    version: "",
    status: "",
    warehouse: "",
    created_by: "",
  });

  const loadBoms = useCallback(async () => {
    setLoading(true);
    try {
      const [bomRes, prodRes] = await Promise.all([getBillOfMaterials(), getProducts()]);

  usePageRefresh(loadBoms);

      const apiRows = bomRes.data || [];
      const apiProducts = Array.isArray(prodRes) ? prodRes : (prodRes.data || []);
      const groupedApi = groupApiBomRows(apiRows);

      let customBoms = [];
      try {
        const storedKey = `gns_custom_boms_${tenantId}`;
        const stored = localStorage.getItem(storedKey);
        if (stored) customBoms = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }

      const combined = [...groupedApi];
      for (const cb of customBoms) {
        if (!combined.some((b) => b.id === cb.id || b.bom_number === cb.bom_number)) {
          combined.push(cb);
        }
      }

      setBoms(combined);
      setTotalProducts(Math.max(apiProducts.length, combined.length));
    } catch {
      let customBoms = [];
      try {
        const storedKey = `gns_custom_boms_${tenantId}`;
        const stored = localStorage.getItem(storedKey);
        if (stored) customBoms = JSON.parse(stored);
      } catch (e) {}

      setBoms(customBoms);
      setTotalProducts(Math.max(0, customBoms.length));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    try {
      localStorage.removeItem("gns_custom_boms");
      localStorage.removeItem("gns_deleted_demo_boms");
    } catch {}
    loadBoms();
  }, [loadBoms]);

  const filteredBoms = useMemo(() => {
    return boms.filter((b) => {
      if (filters.bom_number && !b.bom_number.toLowerCase().includes(filters.bom_number.toLowerCase())) return false;
      if (filters.category && b.category !== filters.category) return false;
      if (filters.version && b.version !== filters.version) return false;
      if (filters.status && b.status !== filters.status) return false;
      if (filters.warehouse && b.warehouse !== filters.warehouse) return false;
      if (filters.created_by && !b.created_by.toLowerCase().includes(filters.created_by.toLowerCase())) return false;
      return true;
    });
  }, [boms, filters]);

  const summary = useMemo(() => computeBomSummary(filteredBoms, totalProducts), [filteredBoms, totalProducts]);

  const warehouses = useMemo(() => [...new Set(boms.map((b) => b.warehouse).filter(Boolean))], [boms]);
  const creators = useMemo(() => [...new Set(boms.map((b) => b.created_by).filter(Boolean))], [boms]);

  const exportColumns = [
    { key: "bom_number", label: "Bill of Materials (BOM) Number" },
    { key: "product_name", label: "Product" },
    { key: "version", label: "Version" },
    { key: "product_code", label: "Product Code" },
    { key: "status", label: "Status" },
  ];

  const handleExport = () => {
    exportToExcel(filteredBoms, exportColumns, "bom-master");
    addToast("BOM list exported");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx";
    input.onchange = () => addToast("Import queued — map file columns in a future release", "info");
    input.click();
  };

  const handlePrintPdf = (bom) => {
    const target = bom || filteredBoms[0];
    if (!target) return;
    exportToPdf(
      [{ ...target, components_count: target.components?.length, total_cost: target.costing?.total_cost }],
      [
        { key: "bom_number", label: "Bill of Materials (BOM) Number" },
        { key: "product_name", label: "Product" },
        { key: "version", label: "Version" },
        { key: "components_count", label: "Components" },
        { key: "total_cost", label: "Total Cost" },
        { key: "status", label: "Status" },
      ],
      `BOM ${target.bom_number} — ${target.product_name}`,
      `bom-${target.bom_number}`
    );
    addToast("BOM PDF downloaded");
  };

  const handleDownloadTemplate = () => {
    const header = IMPORT_TEMPLATE_HEADERS.join(",");
    const blob = new Blob([`${header}\nBOM005,Sample Product,PRD099,V1.0,Component A,RM999,2,Nos,50`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bom_import_template.csv";
    a.click();
    addToast("Template downloaded");
  };

  const handleCopy = (bom) => {
    const copy = {
      ...bom,
      id: `bom-copy-${Date.now()}`,
      bom_number: `BOM-COPY-${String(Date.now()).slice(-4)}`,
      product_name: `${bom.product_name || bom.product} (Copy)`,
      status: "draft",
      version: "V1.0",
      created_date: new Date().toISOString().slice(0, 10),
    };
    handleSave(copy);
    addToast("BOM copied");
  };

  const handleDelete = async (bom) => {
    if (!window.confirm(`Delete BOM "${bom.bom_number || bom.product_name}"?`)) return;
    try {
      const storedKey = `gns_custom_boms_${tenantId}`;
      const stored = localStorage.getItem(storedKey);
      if (stored) {
        let list = JSON.parse(stored);
        list = list.filter((b) => b.id !== bom.id && b.bom_number !== bom.bom_number);
        localStorage.setItem(storedKey, JSON.stringify(list));
      }

      const lineIds = (bom.components || []).map((c) => c.id).filter((id) => typeof id === "number");
      if (lineIds.length > 0) {
        await Promise.all(lineIds.map((id) => deleteBomItem(id)));
      }
    } catch (e) {
      console.error(e);
    }
    setSelected(null);
    await loadBoms();
    addToast("BOM deleted");
  };

  const handleSave = async (savedBom) => {
    if (savedBom && savedBom.id) {
      try {
        const storedKey = `gns_custom_boms_${tenantId}`;
        const stored = localStorage.getItem(storedKey);
        let list = stored ? JSON.parse(stored) : [];

        // Uniqueness check: reject if another BOM (different id) already has this bom_number
        const duplicate = boms.find(
          (b) => b.bom_number && b.bom_number === savedBom.bom_number && b.id !== savedBom.id
        );
        if (duplicate) {
          addToast(`BOM No "${savedBom.bom_number}" already exists. Please use a unique BOM No.`, "error");
          return;
        }

        const idx = list.findIndex((b) => b.id === savedBom.id || b.bom_number === savedBom.bom_number);
        if (idx >= 0) {
          list[idx] = savedBom;
        } else {
          list.unshift(savedBom);
        }
        localStorage.setItem(storedKey, JSON.stringify(list));
      } catch (e) {
        console.error("LocalStorage save error:", e);
      }
    }
    setFormBom(null);
    await loadBoms();
    addToast("BOM saved successfully");
  };

  const clearFilters = () =>
    setFilters({ bom_number: "", category: "", version: "", status: "", warehouse: "", created_by: "" });

  const columns = [
    { key: "bom_number", label: "BOM No" },
    { key: "product_name", label: "Product" },
    {
      key: "costing",
      label: "Cost",
      render: (r) => `₹${Number(r.costing?.total_cost || 0).toLocaleString("en-IN")}`,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusPill status={r.status} />,
    },
    { key: "last_updated", label: "Last Updated" },
    {
      key: "actions",
      label: "Action",
      sortable: false,
      render: (r) => (
        <button type="button" onClick={() => setSelected(r)} className="text-xs font-semibold text-[#2563EB] hover:underline">
          View
        </button>
      ),
    },
  ];

  if (loading) return <Loader label="Loading Bill of Materials (BOM)s..." />;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Manage product structures, components, production routing, and manufacturing costs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFormBom({ _existingBoms: boms })} className="ui-btn-primary">
            <Plus className="h-4 w-4" /> Create Bill of Materials (BOM)
          </button>
          <button type="button" onClick={() => selected && setFormBom(selected)} disabled={!selected} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            Edit Bill of Materials (BOM)
          </button>
          <button type="button" onClick={() => selected && handleCopy(selected)} disabled={!selected} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            <Copy className="h-4 w-4" /> Copy Bill of Materials (BOM)
          </button>
          <button type="button" onClick={handleImport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Upload className="h-4 w-4" /> Import Bill of Materials (BOM)
          </button>
          <button type="button" onClick={handleExport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export Bill of Materials (BOM)
          </button>
          <button type="button" onClick={() => handlePrintPdf(selected)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <FileText className="h-4 w-4" /> Print PDF
          </button>
          <button type="button" onClick={() => selected && handleDelete(selected)} disabled={!selected} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">
            <Trash2 className="h-4 w-4" /> Delete Bill of Materials (BOM)
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Total Bill of Materials (BOM)" value={summary.total} icon={Layers} color="bg-[#2563EB]" />
        <SummaryCard label="Active Bill of Materials (BOM)" value={summary.active} icon={CheckCircle2} color="bg-green-500" />
        <SummaryCard label="Draft Bill of Materials (BOM)" value={summary.draft} icon={ClipboardList} color="bg-amber-500" />
        <SummaryCard label="Inactive Bill of Materials (BOM)" value={summary.inactive} icon={FileText} color="bg-slate-500" />
        <SummaryCard label="Products Without Bill of Materials (BOM)" value={summary.withoutBom} icon={AlertTriangle} color="bg-orange-500" />
        <SummaryCard label="Pending Approval" value={summary.pendingApproval} icon={AlertTriangle} color="bg-purple-500" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <input
            type="search"
            placeholder="Search Product / Bill of Materials (BOM) Number"
            value={filters.bom_number}
            onChange={(e) => setFilters((f) => ({ ...f, bom_number: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Product Category</option>
            {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Status</option>
            {BOM_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <select value={filters.warehouse} onChange={(e) => setFilters((f) => ({ ...f, warehouse: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Warehouse</option>
            {warehouses.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <select value={filters.created_by} onChange={(e) => setFilters((f) => ({ ...f, created_by: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Created By</option>
            {creators.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-[#2563EB] hover:underline">
            Clear Filters
          </button>
        </div>

        <DataTable
          columns={columns}
          data={filteredBoms}
          searchPlaceholder="Search Product"
          searchKeys={["bom_number", "product_name", "product_code", "description"]}
          pageSize={10}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setFormBom({})} className="rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white">Create Production Order</button>
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Generate Material Requirement</button>
            <button type="button" onClick={() => handlePrintPdf(selected)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Print BOM</button>
            <button type="button" onClick={handleDownloadTemplate} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
              <FileDown className="h-3.5 w-3.5" /> Download Template
            </button>
            <button type="button" onClick={() => selected && handleCopy(selected)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Clone BOM</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Reports</h3>
          <ul className="space-y-2">
            {REPORT_TYPES.map((r) => (
              <li key={r}>
                <button type="button" onClick={() => addToast(`${r} — coming soon`, "info")} className="text-sm font-medium text-[#2563EB] hover:underline">
                  {r}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-bold text-slate-800">BOM Workflow</h3>
        <p className="text-xs text-slate-500 mb-3">Product → Create BOM → Add Components → Calculate Cost → Approval → Production Planning → Work Order → Manufacturing → Finished Goods</p>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          {["Product", "Create BOM", "Add Components", "Calculate Cost", "Approval", "Production Planning", "Work Order", "Manufacturing", "Finished Goods"].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[#2563EB]">{step}</span>
              {i < arr.length - 1 && <span className="text-slate-300">→</span>}
            </span>
          ))}
        </div>
      </div>

      {selected && (
        <BomDetailModal
          bom={selected}
          onClose={() => setSelected(null)}
          onEdit={(b) => { setSelected(null); setFormBom(b); }}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onPrint={handlePrintPdf}
          onRefresh={loadBoms}
        />
      )}

      {formBom && (
        <BomFormModal bom={formBom} onClose={() => setFormBom(null)} onSave={handleSave} />
      )}
    </div>
  );
}

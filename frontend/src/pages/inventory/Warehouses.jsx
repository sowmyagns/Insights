import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownUp, Box, Download, FileText, Layers, Plus, Printer, Upload, Warehouse } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import WarehouseDetailModal, { WarehouseFormModal } from "../../components/inventory/WarehouseDetailModal";
import { useToast } from "../../context/ToastContext";
import useTenantId from "../../hooks/useTenantId";
import usePageRefresh from "../../hooks/usePageRefresh";
import {
  createWarehouseFull,
  deactivateWarehouse,
  getWarehouseDetail,
  getWarehouses,
  getWarehouseSummary,
  updateWarehouse,
} from "../../api/inventoryApi";
import {
  BRANCHES,
  DEMO_WAREHOUSES,
  IMPORT_TEMPLATE_HEADERS,
  PLANTS,
  TRANSFER_WORKFLOW,
  WAREHOUSE_STATUSES,
  WAREHOUSE_TYPES,
  WORKFLOW_STEPS,
  computeWarehouseSummary,
  enrichApiWarehouse,
  formatCr,
} from "../../data/warehousesMasterData";
import { exportToExcel, exportToPdf } from "../../utils/exportUtils";

function SummaryCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="ui-card p-4 min-h-[86px] flex flex-col justify-between min-w-0 overflow-hidden" title={typeof label === "string" ? label : undefined}>
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <p className="truncate text-[11px] font-medium text-[var(--color-text-muted)] leading-tight sm:text-xs min-w-0 flex-1">{label}</p>
        {Icon && (
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${color}`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="truncate text-xl font-bold tabular-nums text-[var(--color-text)] leading-none sm:text-2xl">{value}</p>
        {sub && <p className="mt-1 text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function StatusPill({ status, primary }) {
  if (primary) {
    return <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Primary</span>;
  }
  const active = status === "active";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
      active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
    }`}>
      {status}
    </span>
  );
}

const defaultFilters = {
  code: "",
  name: "",
  branch: "",
  plant: "",
  warehouse_type: "",
  state: "",
  status: "",
  capacity_min: "",
  manager: "",
};

export default function Warehouses() {
  const tenantId = useTenantId();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [apiSummary, setApiSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [formWarehouse, setFormWarehouse] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, sRes] = await Promise.all([
        getWarehouses().catch(() => ({ data: [] })),
        getWarehouseSummary().catch(() => ({ data: null })),
      ]);
      const apiRows = wRes.data || [];
      setWarehouses(apiRows.map((row, i) => enrichApiWarehouse(row, i)));
      setApiSummary(sRes.data);
    } catch {
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  usePageRefresh(loadWarehouses);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  const openWarehouse = async (wh) => {
    setSelected(wh);
    setDetail(null);
    if (typeof wh.id === "number") {
      try {
        const res = await getWarehouseDetail(wh.id);
        setDetail(res.data);
      } catch {
        /* use list data */
      }
    }
  };

  const filtered = useMemo(() => {
    return warehouses.filter((w) => {
      if (filters.code && !String(w.code).toLowerCase().includes(filters.code.toLowerCase())) return false;
      if (filters.name && !w.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.branch && w.branch !== filters.branch) return false;
      if (filters.plant && w.plant !== filters.plant) return false;
      if (filters.warehouse_type && w.warehouse_type !== filters.warehouse_type) return false;
      if (filters.state && w.state !== filters.state) return false;
      if (filters.status && w.status !== filters.status) return false;
      if (filters.manager && !String(w.manager_name).toLowerCase().includes(filters.manager.toLowerCase())) return false;
      if (filters.capacity_min && (w.capacity || 0) < Number(filters.capacity_min)) return false;
      return true;
    });
  }, [warehouses, filters]);

  const summary = useMemo(() => computeWarehouseSummary(filtered), [filtered]);


  const exportColumns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Warehouse Name" },
    { key: "branch", label: "Branch" },
    { key: "manager_name", label: "Manager" },
    { key: "capacity", label: "Capacity" },
    { key: "used_capacity", label: "Used" },
    { key: "utilization_pct", label: "Utilization %" },
    { key: "status", label: "Status" },
  ];

  const handleExportExcel = () => {
    exportToExcel(filtered, exportColumns, "warehouses");
    addToast("Exported to Excel");
  };

  const handleExportPdf = () => {
    exportToPdf(filtered, exportColumns, "Warehouse Master", "warehouses");
    addToast("Exported to PDF");
  };

  const handleDownloadTemplate = () => {
    const header = IMPORT_TEMPLATE_HEADERS.join(",");
    const blob = new Blob([`${header}\nWH-NEW-01,New Store,Hyderabad,Plant A,Raw Material,Telangana,Manager Name,10000,active`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "warehouses_import_template.csv";
    a.click();
    addToast("Template downloaded");
  };

  const handleSave = async (form) => {
    const usedCap = form.used_capacity !== "" && form.used_capacity != null ? Number(form.used_capacity) : 0;
    const cap = form.capacity !== "" && form.capacity != null ? Number(form.capacity) : null;
    const payload = {
      tenant_id: tenantId,
      name: form.name,
      code: form.code,
      branch: form.branch,
      plant: form.plant,
      warehouse_type: form.warehouse_type,
      state: form.state,
      city: form.city,
      address: form.address,
      manager_name: form.manager_name,
      manager_phone: form.manager_phone,
      capacity: cap,
      used_capacity: usedCap,
      is_primary: form.is_primary,
      status: form.status,
    };
    try {
      if (formWarehouse?.id && typeof formWarehouse.id === "number") {
        await updateWarehouse(formWarehouse.id, payload);
        addToast("Warehouse updated");
        loadWarehouses();
        setFormWarehouse(null);
        return;
      }
      await createWarehouseFull(payload);
      addToast("Warehouse created");
      loadWarehouses();
      setFormWarehouse(null);
      return;
    } catch {
      /* local fallback */
    }

    if (formWarehouse?.id) {
      const cap = form.capacity ? Number(form.capacity) : 0;
      const used = form.used_capacity ? Number(form.used_capacity) : 0;
      const avail = form.available_capacity != null && form.available_capacity !== "" ? Number(form.available_capacity) : (cap ? Math.max(0, cap - used) : 0);
      setWarehouses((prev) => prev.map((w) => (w.id === formWarehouse.id ? { ...w, ...form, used_capacity: used, available_capacity: avail } : w)));
      addToast("Warehouse updated locally");
    } else {
      const cap = form.capacity ? Number(form.capacity) : 0;
      const used = form.used_capacity ? Number(form.used_capacity) : 0;
      const avail = form.available_capacity != null && form.available_capacity !== "" ? Number(form.available_capacity) : (cap ? Math.max(0, cap - used) : 0);
      const newW = {
        ...enrichApiWarehouse({ id: `new-${Date.now()}`, ...payload }, warehouses.length),
        id: `new-${Date.now()}`,
        ...form,
        used_capacity: used,
        available_capacity: avail,
        inventory_value: 0,
        created_at: new Date().toISOString().slice(0, 10),
      };
      setWarehouses((prev) => [...prev, newW]);
      addToast("Warehouse added");
    }
    setFormWarehouse(null);
  };

  const handleDeactivate = async (wh) => {
    if (!window.confirm(`Deactivate ${wh.name}?`)) return;
    if (typeof wh.id === "number") {
      try {
        await deactivateWarehouse(wh.id);
        addToast("Warehouse deactivated");
        loadWarehouses();
        setSelected(null);
        return;
      } catch {
        addToast("Could not deactivate", "error");
        return;
      }
    }
    setWarehouses((prev) => prev.map((w) => (w.id === wh.id ? { ...w, status: "inactive" } : w)));
    setSelected(null);
    addToast("Warehouse deactivated");
  };

  const columns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Warehouse Name" },
    { key: "branch", label: "Branch" },
    { key: "manager_name", label: "Manager", render: (r) => r.manager_name || "—" },
    {
      key: "capacity",
      label: "Capacity",
      render: (r) => (r.capacity != null ? r.capacity.toLocaleString() : "—"),
    },
    {
      key: "used_capacity",
      label: "Used",
      render: (r) => (r.used_capacity != null ? r.used_capacity.toLocaleString() : "0"),
    },
    {
      key: "available_capacity",
      label: "Available",
      render: (r) => (r.available_capacity != null ? r.available_capacity.toLocaleString() : "—"),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusPill status={r.status} primary={r.is_primary} />,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <div className="flex flex-wrap gap-1 text-xs">
          <button type="button" onClick={() => openWarehouse(r)} className="font-semibold text-[#2563EB] hover:underline">View</button>
          <button type="button" onClick={() => setFormWarehouse(r)} className="font-semibold text-slate-600 hover:underline">Edit</button>
          <button type="button" onClick={() => openWarehouse(r)} className="font-semibold text-slate-600 hover:underline">Stock</button>
          <button type="button" onClick={() => setFormWarehouse(r)} className="font-semibold text-slate-600 hover:underline">Transfers</button>
          {r.status === "active" && (
            <button type="button" onClick={() => handleDeactivate(r)} className="font-semibold text-red-600 hover:underline">Deactivate</button>
          )}
        </div>
      ),
    },
  ];

  const emptyState = (
    <div className="py-12 text-center">
      <Warehouse className="mx-auto h-12 w-12 text-slate-300" />
      <p className="mt-4 text-sm font-medium text-slate-600">No warehouses found.</p>
      <p className="mt-1 text-sm text-slate-400">
        Click &quot;Create Warehouse&quot; to add your first warehouse.
      </p>
      <button type="button" onClick={() => setFormWarehouse({})} className="ui-btn-primary mt-4">
        <Plus className="h-4 w-4" /> Create Warehouse
      </button>
    </div>
  );

  if (loading) return <Loader label="Loading warehouses..." />;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ui-subtitle">
            Multi-warehouse inventory, bin management, transfers, and utilization tracking.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFormWarehouse({})} className="ui-btn-primary">
            <Plus className="h-4 w-4" /> Create Warehouse
          </button>
          <button type="button" onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Upload className="h-4 w-4" /> Import
          </button>
          <button type="button" onClick={handleExportExcel} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export Excel
          </button>
          <button type="button" onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <FileText className="h-4 w-4" /> Export PDF
          </button>
          <button type="button" onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Total Warehouses" value={summary.total} icon={Warehouse} color="bg-[#2563EB]" />
        <SummaryCard label="Active Warehouses" value={summary.active} icon={Box} color="bg-green-500" />
        <SummaryCard label="Primary Warehouse" value={summary.primary} icon={Layers} color="bg-purple-500" sub="Main store" />
        <SummaryCard label="Storage Utilization" value={`${summary.utilizationPct}%`} icon={Layers} color="bg-orange-500" />
        <SummaryCard label="Total Inventory Value" value={formatCr(summary.inventoryValue)} icon={Box} color="bg-teal-600" />
        <SummaryCard label="Low Stock Warehouses" value={summary.lowStockWarehouses} icon={AlertTriangle} color="bg-red-500" sub={`${summary.pendingTransfers} pending transfers`} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              placeholder="Search warehouses..."
              value={filters.name}
              onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {showAdvanced ? "Hide Filters" : "Advanced Filters"}
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input placeholder="Warehouse Code" value={filters.code} onChange={(e) => setFilters((f) => ({ ...f, code: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select value={filters.branch} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Branch</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filters.plant} onChange={(e) => setFilters((f) => ({ ...f, plant: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Plant</option>
              {PLANTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filters.warehouse_type} onChange={(e) => setFilters((f) => ({ ...f, warehouse_type: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Warehouse Type</option>
              {WAREHOUSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="State" value={filters.state} onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Status</option>
              {WAREHOUSE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Min Capacity" type="number" value={filters.capacity_min} onChange={(e) => setFilters((f) => ({ ...f, capacity_min: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder="Manager" value={filters.manager} onChange={(e) => setFilters((f) => ({ ...f, manager: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button type="button" onClick={() => setFilters(defaultFilters)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Clear</button>
          </div>
        )}

        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Quick search in table..."
          searchKeys={["code", "name", "branch", "manager_name"]}
          emptyState={emptyState}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Stock Movement Flow</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
            {WORKFLOW_STEPS.map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-lg bg-white px-2.5 py-1.5 shadow-sm">{step}</span>
                {i < WORKFLOW_STEPS.length - 1 && <span className="text-slate-300">↓</span>}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <ArrowDownUp className="h-4 w-4" /> Warehouse Transfer Flow
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
            {TRANSFER_WORKFLOW.map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-lg bg-white px-2.5 py-1.5 shadow-sm">{step}</span>
                {i < TRANSFER_WORKFLOW.length - 1 && <span className="text-slate-300">↓</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <WarehouseDetailModal
          warehouse={selected}
          detail={detail}
          onClose={() => { setSelected(null); setDetail(null); }}
          onEdit={(w) => { setFormWarehouse(w); setSelected(null); }}
          onDeactivate={handleDeactivate}
        />
      )}

      {formWarehouse && (
        <WarehouseFormModal
          warehouse={formWarehouse}
          onClose={() => setFormWarehouse(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

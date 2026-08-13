import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Box, Download, Package, Plus, RefreshCw, Trash2 } from "lucide-react";
import KpiCard from "../../components/common/KpiCard";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import MaterialDetailModal from "../../components/inventory/MaterialDetailModal";
import { useToast } from "../../context/ToastContext";
import { getItemByBarcode, getRawMaterialDetail, getRawMaterials, getRawMaterialsSummary } from "../../api/inventoryApi";
import {
  MATERIAL_CATEGORIES,
  WAREHOUSES,
  formatInr,
  stockStatusColor,
  stockStatusLabel,
} from "../../data/inventoryMasterData";
import { exportToExcel } from "../../utils/exportUtils";
import useTenantId from "../../hooks/useTenantId";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";


const defaultFilters = { name: "", sku: "", barcode: "", category: "", warehouse: "", vendor: "", low_stock: false, expiring: false, batch: "" };
const emptySummary = {
  total_items: 0,
  available_stock: 0,
  low_stock: 0,
  out_of_stock: 0,
  stock_value: 0,
};

export default function RawMaterials() {
  const tenantId = useTenantId();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(emptySummary);
  const [materials, setMaterials] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.allSettled([getRawMaterialsSummary(), getRawMaterials()]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data) setSummary({ ...emptySummary, ...sumRes.value.data });
      else setSummary(emptySummary);
      if (listRes.status === "fulfilled") setMaterials(listRes.value?.data || []);
      else setMaterials([]);
    } catch { }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);

  const filtered = useMemo(() => {
    let rows = materials;
    if (filters.low_stock) rows = rows.filter((r) => r.status === "low_stock");
    if (filters.name) rows = rows.filter((r) => r.name?.toLowerCase().includes(filters.name.toLowerCase()));
    if (filters.sku) rows = rows.filter((r) => r.sku?.toLowerCase().includes(filters.sku.toLowerCase()));
    if (filters.category) rows = rows.filter((r) => r.category === filters.category);
    if (filters.warehouse) rows = rows.filter((r) => r.warehouse_name === filters.warehouse);
    return rows;
  }, [materials, filters]);

  const displaySummary = useMemo(() => {
    if (!materials || materials.length === 0) return summary;

    let available_stock = 0;
    let low_stock = 0;
    let out_of_stock = 0;
    let stock_value = 0;
    let reorder_items = 0;

    materials.forEach((m) => {
      const q = Number(m.quantity) || 0;
      const reorder = Number(m.reorder_level) || 0;
      const cost = Number(m.unit_cost) || 0;
      stock_value += (m.stock_value ? Number(m.stock_value) : q * cost);

      if (reorder > 0) {
        reorder_items += 1;
      }

      if (q <= 0 || m.status === "out_of_stock") {
        out_of_stock += 1;
      } else if ((reorder && q < reorder) || m.status === "low_stock") {
        low_stock += 1;
      } else {
        available_stock += 1;
      }
    });

    return {
      total_items: materials.length,
      available_stock,
      low_stock,
      out_of_stock,
      stock_value,
      reorder_items: reorder_items || summary.reorder_items || 0,
    };
  }, [materials, summary]);

  const openDetail = async (row) => {
    if (typeof row.id === "number") {
      try { const res = await getRawMaterialDetail(row.id); setSelected(res.data); return; } catch { /* fallback */ }
    }
    setSelected({ ...row });
  };

  const handleBarcode = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    try {
      const res = await getItemByBarcode(tenantId, barcodeInput.trim());
      if (res.data?.found) { addToast(`Found: ${res.data.item.name}`); openDetail(res.data.item); }
      else addToast("Barcode not found", "error");
    } catch { addToast("Barcode not found", "error"); }
    setBarcodeInput("");
  };

  const columns = [
    { key: "sku", label: "Stock Keeping Unit (SKU)" },
    { key: "name", label: "Material" },
    { key: "category", label: "Category" },
    { key: "warehouse_name", label: "Warehouse" },
    { key: "batch_number", label: "Batch" },
    { key: "quantity", label: "Quantity" },
    { key: "reserved", label: "Reserved" },
    { key: "available", label: "Available" },
    { key: "unit", label: "Unit" },
    { key: "reorder_level", label: "Reorder" },
    { key: "unit_cost", label: "Cost", render: (r) => r.unit_cost ? `₹${r.unit_cost}` : "—" },
    { key: "stock_value", label: "Value", render: (r) => r.stock_value ? formatInr(r.stock_value) : "—" },
    { key: "status", label: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stockStatusColor(r.status)}`}>{stockStatusLabel(r.status)}</span> },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="flex gap-2">
        <button type="button" onClick={() => openDetail(r)} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">View</button>
        <Link to={`/inventory/items/create?type=raw_material&edit=${r.id}`} className="text-xs text-[var(--color-text-secondary)] hover:underline">Edit</Link>
      </div>
    )},
  ];

  if (loading) return <Loader label="Loading raw materials..." />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        subtitle="Monitor raw material stock levels to prevent line stoppages."
        action={
          <>
            <Link to="/inventory/items/create?type=raw_material" className="ui-btn-primary"><Plus className="h-4 w-4" /> New Material</Link>
            <button type="button" onClick={() => exportToExcel(filtered, columns.filter((c) => !c.render), "raw-materials")} className="ui-btn-secondary"><Download className="h-4 w-4" /> Export</button>
          </>
        }
      />

      <div className="ui-grid-kpi">
        <KpiCard label="Total Materials" value={displaySummary.total_items?.toLocaleString()} icon={Package} color="bg-[var(--color-success)]" />
        <KpiCard label="Available Stock" value={displaySummary.available_stock?.toLocaleString()} icon={Box} color="bg-[var(--color-success)]" />
        <KpiCard label="Low Stock" value={displaySummary.low_stock} icon={AlertTriangle} color="bg-amber-500" />
        <KpiCard label="Out of Stock" value={displaySummary.out_of_stock} icon={Trash2} color="bg-rose-600" />
        <KpiCard label="Stock Value" value={formatInr(displaySummary.stock_value)} icon={Package} color="bg-indigo-600" />
        <KpiCard label="Reorder Items" value={displaySummary.reorder_items} icon={RefreshCw} color="bg-orange-500" />
      </div>

      <div className="ui-card p-4">
        <form onSubmit={handleBarcode} className="mb-4 flex gap-2">
          <input value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} placeholder="Scan or enter barcode..." className="ui-input flex-1" />
          <button type="submit" className="ui-btn-primary">Lookup</button>
        </form>
        <div className="mb-4 ui-toolbar">
          <input placeholder="Search material..." value={filters.name} onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))} className="ui-input min-w-[200px] flex-1" />
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="ui-btn-secondary">{showAdvanced ? "Hide Filters" : "Advanced Filters"}</button>
        </div>
        {showAdvanced && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input placeholder="SKU" value={filters.sku} onChange={(e) => setFilters((f) => ({ ...f, sku: e.target.value }))} className="ui-input" />
            <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className="ui-select"><option value="">Category</option>{MATERIAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            <select value={filters.warehouse} onChange={(e) => setFilters((f) => ({ ...f, warehouse: e.target.value }))} className="ui-select"><option value="">Warehouse</option>{WAREHOUSES.map((w) => <option key={w} value={w}>{w}</option>)}</select>
            <label className="flex items-center gap-2 text-[var(--text-sm)] text-[var(--color-text-secondary)]"><input type="checkbox" checked={filters.low_stock} onChange={(e) => setFilters((f) => ({ ...f, low_stock: e.target.checked }))} /> Low Stock</label>
          </div>
        )}
        <DataTable columns={columns} data={filtered} searchKeys={["sku", "name", "batch_number"]} showSearch={false} />
      </div>
      {selected && <MaterialDetailModal material={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

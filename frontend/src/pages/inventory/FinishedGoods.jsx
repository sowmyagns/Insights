import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Box, Download, Package, Plus, QrCode, Truck } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getFinishedGoods, getFinishedGoodsSummary } from "../../api/inventoryApi";
import { formatInr, stockStatusColor, stockStatusLabel } from "../../data/inventoryMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import { exportToExcel } from "../../utils/exportUtils";

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs min-h-[86px] flex flex-col justify-between min-w-0 overflow-hidden" title={typeof label === "string" ? label : undefined}>
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-500 leading-tight sm:text-xs min-w-0 flex-1">{label}</p>
        {Icon && (
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${color}`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="truncate text-xl font-bold tabular-nums text-slate-900 leading-none sm:text-2xl">{value}</p>
      </div>
    </div>
  );
}

export default function FinishedGoods() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.allSettled([getFinishedGoodsSummary(), getFinishedGoods()]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data) setSummary(sumRes.value.data);
      else setSummary({});
      if (listRes.status === "fulfilled") setProducts(listRes.value?.data || []);
      else setProducts([]);
    } catch {
      setProducts([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);

  const displaySummary = useMemo(() => {
    if (!products || products.length === 0) return summary;

    let total_products = products.length;
    let available_count = 0;
    let reserved_count = 0;
    let ready_to_dispatch = 0;
    let damaged = 0;
    let stock_value = 0;

    products.forEach((p) => {
      const q = Number(p.quantity) || 0;
      const r = Number(p.reserved) || 0;
      const avail = p.available !== undefined ? Number(p.available) : Math.max(q - r, 0);
      const cost = Number(p.unit_cost) || 0;
      stock_value += (p.stock_value ? Number(p.stock_value) : q * cost);

      if (avail > 0) {
        available_count += 1;
      }
      if (r > 0) {
        reserved_count += 1;
      }

      if (q <= 0 || p.status === "out_of_stock" || p.status === "damaged") {
        damaged += 1;
      } else if (p.status === "ready" || avail > 0) {
        ready_to_dispatch += 1;
      }
    });

    return {
      total_products,
      available: available_count,
      reserved: reserved_count,
      ready_to_dispatch,
      damaged,
      stock_value,
    };
  }, [products, summary]);

  const filtered = search.trim()
    ? products.filter((p) => [p.sku, p.name, p.batch_number, p.customer_name].some((v) => v && String(v).toLowerCase().includes(search.toLowerCase())))
    : products;

  const columns = [
    { key: "sku", label: "Stock Keeping Unit (SKU)" },
    { key: "name", label: "Product" },
    { key: "batch_number", label: "Batch" },
    { key: "quantity", label: "Quantity" },
    { key: "reserved", label: "Reserved" },
    { key: "available", label: "Available" },
    { key: "unit_cost", label: "Cost", render: (r) => r.unit_cost ? `₹${r.unit_cost}` : "—" },
    { key: "stock_value", label: "Value", render: (r) => r.stock_value ? formatInr(r.stock_value) : (r.unit_cost && r.quantity ? formatInr(r.unit_cost * r.quantity) : "—") },
    { key: "warehouse_name", label: "Warehouse" },
    { key: "customer_name", label: "Customer" },
    { key: "production_date", label: "Prod. Date" },
    { key: "expiry_date", label: "Expiry" },
    { key: "warranty", label: "Warranty" },
    { key: "serial_number", label: "Serial" },
    { key: "qr_code", label: "QR", render: (r) => <span className="inline-flex items-center gap-1 text-xs text-teal-800"><QrCode className="h-3 w-3" />{r.qr_code}</span> },
    { key: "status", label: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stockStatusColor(r.status)}`}>{stockStatusLabel(r.status)}</span> },
  ];

  if (loading) return <Loader label="Loading finished goods..." />;

  return (
    <div className="space-y-5 pb-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">Inventory</p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Finished Goods</h2>
          <p className="mt-1 text-sm text-slate-500">Verify produced stock ready for inspection and handover to sales dispatch.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/inventory/items/create?type=finished_good" className="ui-btn-primary"><Plus className="h-4 w-4" /> New Product</Link>
          <button type="button" onClick={() => exportToExcel(filtered, columns.filter((c) => !c.render), "finished-goods")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"><Download className="h-4 w-4" /> Export</button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Products" value={displaySummary.total_products ?? 0} icon={Package} color="bg-teal-700" />
        <KpiCard label="Available" value={displaySummary.available ?? 0} icon={Box} color="bg-emerald-600" />
        <KpiCard label="Reserved" value={displaySummary.reserved ?? 0} icon={Package} color="bg-amber-500" />
        <KpiCard label="Ready to Dispatch" value={displaySummary.ready_to_dispatch ?? 0} icon={Truck} color="bg-cyan-600" />
        <KpiCard label="Damaged" value={displaySummary.damaged ?? 0} icon={AlertTriangle} color="bg-rose-600" />
        <KpiCard label="Stock Value" value={formatInr(displaySummary.stock_value)} icon={Box} color="bg-indigo-600" />
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <input type="search" placeholder="Search SKU, product, batch, customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="ui-input mb-4 w-full" />
        <DataTable columns={columns} data={filtered} showSearch={false} />
      </div>
    </div>
  );
}

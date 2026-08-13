import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Box, Download, Package, Plus, QrCode, Truck } from "lucide-react";
import KpiCard from "../../components/common/KpiCard";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../context/ToastContext";
import { getFinishedGoods, getFinishedGoodsSummary } from "../../api/inventoryApi";
import { formatInr, stockStatusColor, stockStatusLabel } from "../../data/inventoryMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import { exportToExcel } from "../../utils/exportUtils";


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
    { key: "qr_code", label: "QR", render: (r) => <span className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)]"><QrCode className="h-3 w-3" />{r.qr_code}</span> },
    { key: "status", label: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stockStatusColor(r.status)}`}>{stockStatusLabel(r.status)}</span> },
  ];

  if (loading) return <Loader label="Loading finished goods..." />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        subtitle="Verify produced stock ready for inspection and handover to sales dispatch."
        action={
          <>
            <Link to="/inventory/items/create?type=finished_good" className="ui-btn-primary"><Plus className="h-4 w-4" /> New Product</Link>
            <button type="button" onClick={() => exportToExcel(filtered, columns.filter((c) => !c.render), "finished-goods")} className="ui-btn-secondary"><Download className="h-4 w-4" /> Export</button>
          </>
        }
      />

      <div className="ui-grid-kpi">
        <KpiCard label="Total Products" value={displaySummary.total_products ?? 0} icon={Package} color="bg-[var(--color-success)]" />
        <KpiCard label="Available" value={displaySummary.available ?? 0} icon={Box} color="bg-[var(--color-success)]" />
        <KpiCard label="Reserved" value={displaySummary.reserved ?? 0} icon={Package} color="bg-amber-500" />
        <KpiCard label="Ready to Dispatch" value={displaySummary.ready_to_dispatch ?? 0} icon={Truck} color="bg-cyan-600" />
        <KpiCard label="Damaged" value={displaySummary.damaged ?? 0} icon={AlertTriangle} color="bg-rose-600" />
        <KpiCard label="Stock Value" value={formatInr(displaySummary.stock_value)} icon={Box} color="bg-indigo-600" />
      </div>

      <div className="ui-card p-4">
        <input type="search" placeholder="Search SKU, product, batch, customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="ui-input mb-4 w-full" />
        <DataTable columns={columns} data={filtered} showSearch={false} />
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Repeat } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import StoreManagerNav from "../../components/inventory/StoreManagerNav";
import { useToast } from "../../context/ToastContext";
import { getLedgerSummary, getStockLedger } from "../../api/inventoryApi";
import { TRANSACTION_TYPES, formatInr } from "../../data/inventoryMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import { exportToExcel } from "../../utils/exportUtils";
import useAuth from "../../hooks/useAuth";
import { isStoreManager } from "../../config/permissions";

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

export default function StockLedger() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const storeMode = isStoreManager(user);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({ date: "", warehouse: "", item: "", type: "", user: "", batch: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.allSettled([getLedgerSummary(), getStockLedger()]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data) setSummary(sumRes.value.data);
      else setSummary({});
      if (listRes.status === "fulfilled") setEntries(listRes.value?.data || []);
      else setEntries([]);
    } catch {
      setEntries([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);

  const filtered = useMemo(() => {
    let rows = entries;
    if (filters.type) rows = rows.filter((r) => r.transaction === filters.type.toLowerCase());
    if (filters.item) rows = rows.filter((r) => r.item_name?.toLowerCase().includes(filters.item.toLowerCase()));
    return rows;
  }, [entries, filters]);

  const columns = [
    { key: "date", label: "Date", render: (r) => r.date ? new Date(r.date).toLocaleString() : "—" },
    { key: "transaction", label: "Transaction", render: (r) => <span className="capitalize">{r.transaction}</span> },
    { key: "warehouse_name", label: "Warehouse" },
    { key: "item_name", label: "Item" },
    { key: "batch_number", label: "Batch", render: (r) => r.batch_number || "—" },
    { key: "qty_in", label: "In", render: (r) => r.qty_in || "—" },
    { key: "qty_out", label: "Out", render: (r) => r.qty_out || "—" },
    { key: "balance", label: "Balance" },
    { key: "user_name", label: "User" },
    { key: "reference", label: "Reference", render: (r) => r.reference || "—" },
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        {storeMode ? <StoreManagerNav /> : null}
        <Loader label="Loading stock ledger..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {storeMode ? <StoreManagerNav /> : null}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="mt-1 text-sm text-slate-500">Stock movement history for warehouse and store operations.</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => exportToExcel(filtered, columns.filter((c) => !c.render), "stock-ledger")} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" /> Export</button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Transactions" value={(summary.total_transactions ?? 0).toLocaleString()} icon={Repeat} color="bg-[#2563EB]" />
        <KpiCard label="Stock In" value={(summary.stock_in ?? 0).toLocaleString()} icon={ArrowDown} color="bg-green-500" />
        <KpiCard label="Stock Out" value={(summary.stock_out ?? 0).toLocaleString()} icon={ArrowUp} color="bg-red-500" />
        <KpiCard label="Transfers" value={summary.transfers ?? 0} icon={Repeat} color="bg-indigo-500" />
        <KpiCard label="Adjustments" value={summary.adjustments ?? 0} icon={Repeat} color="bg-amber-500" />
        <KpiCard label="Stock Value" value={formatInr(summary.current_stock_value ?? 0)} icon={Repeat} color="bg-teal-500" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="date" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
          <input placeholder="Item" value={filters.item} onChange={(e) => setFilters((f) => ({ ...f, item: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
          <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm"><option value="">Transaction Type</option>{TRANSACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <input placeholder="Batch" value={filters.batch} onChange={(e) => setFilters((f) => ({ ...f, batch: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <DataTable columns={columns} data={filtered} showSearch={false} />
      </div>
    </div>
  );
}

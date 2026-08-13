import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Repeat } from "lucide-react";
import KpiCard from "../../components/common/KpiCard";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import StoreManagerNav from "../../components/inventory/StoreManagerNav";
import { useToast } from "../../context/ToastContext";
import { getLedgerSummary, getStockLedger } from "../../api/inventoryApi";
import { TRANSACTION_TYPES, formatInr } from "../../data/inventoryMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import { exportToExcel } from "../../utils/exportUtils";
import useAuth from "../../hooks/useAuth";
import { isStoreManager } from "../../config/permissions";


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
      <div className="space-y-5 pb-4">
        {storeMode ? <StoreManagerNav /> : null}
        <Loader label="Loading stock ledger..." />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      {storeMode ? <StoreManagerNav /> : null}
      <PageHeader
        subtitle="Stock movement history for warehouse and store operations."
        action={
          <button type="button" onClick={() => exportToExcel(filtered, columns.filter((c) => !c.render), "stock-ledger")} className="ui-btn-secondary">
            <Download className="h-4 w-4" /> Export
          </button>
        }
      />

      <div className="ui-grid-kpi">
        <KpiCard label="Total Transactions" value={(summary.total_transactions ?? 0).toLocaleString()} icon={Repeat} color="bg-[var(--color-primary)]" />
        <KpiCard label="Stock In" value={(summary.stock_in ?? 0).toLocaleString()} icon={ArrowDown} color="bg-green-500" />
        <KpiCard label="Stock Out" value={(summary.stock_out ?? 0).toLocaleString()} icon={ArrowUp} color="bg-red-500" />
        <KpiCard label="Transfers" value={summary.transfers ?? 0} icon={Repeat} color="bg-indigo-500" />
        <KpiCard label="Adjustments" value={summary.adjustments ?? 0} icon={Repeat} color="bg-amber-500" />
        <KpiCard label="Stock Value" value={formatInr(summary.current_stock_value ?? 0)} icon={Repeat} color="bg-[var(--color-success-soft)]0" />
      </div>

      <div className="ui-card p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="date" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} className="ui-input" />
          <input placeholder="Item" value={filters.item} onChange={(e) => setFilters((f) => ({ ...f, item: e.target.value }))} className="ui-input" />
          <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} className="ui-select"><option value="">Transaction Type</option>{TRANSACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <input placeholder="Batch" value={filters.batch} onChange={(e) => setFilters((f) => ({ ...f, batch: e.target.value }))} className="ui-input" />
        </div>
        <DataTable columns={columns} data={filtered} showSearch={false} />
      </div>
    </div>
  );
}

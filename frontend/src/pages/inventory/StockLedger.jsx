import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CalendarDays,
  ClipboardList,
  Download,
  Filter,
  Hash,
  RefreshCw,
  Wrench,
} from "lucide-react";

import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import KpiCard from "../../components/common/KpiCard";
import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import StoreManagerNav from "../../components/inventory/StoreManagerNav";
import { getLedgerSummary, getStockLedger, getWarehouses } from "../../api/inventoryApi";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import { exportToExcel } from "../../utils/exportUtils";
import useAuth from "../../hooks/useAuth";
import { isStoreManager } from "../../config/permissions";
import { asArray } from "../../utils/apiError";

const MOCKUP_ENTRIES = [
  {
    id: "l1",
    date: "2026-08-13T16:30:00",
    item_name: "PET Resin",
    item_code: "RM-0001",
    transaction: "in",
    reference: "GRN-2026-0134",
    warehouse_name: "Main Warehouse",
    qty_in: 250,
    qty_out: 0,
    balance: 1250,
    unit: "KG",
    user_name: "Ramesh Kumar",
    remarks: "GRN received",
  },
  {
    id: "l2",
    date: "2026-08-13T15:10:00",
    item_name: "HDPE Caps",
    item_code: "RM-0004",
    transaction: "out",
    reference: "ISS-2026-0088",
    warehouse_name: "Main Warehouse",
    qty_in: 0,
    qty_out: 100,
    balance: 12400,
    unit: "Nos",
    user_name: "Suresh Babu",
    remarks: "Production Issue",
  },
  {
    id: "l3",
    date: "2026-08-13T14:05:00",
    item_name: "Label Roll",
    item_code: "RM-0006",
    transaction: "transfer_out",
    reference: "TRF-2026-0054",
    warehouse_name: "Main Warehouse",
    qty_in: 0,
    qty_out: 40,
    balance: 180,
    unit: "Roll",
    user_name: "Raj K.",
    remarks: "Transfer to Unit-2",
  },
  {
    id: "l4",
    date: "2026-08-13T13:40:00",
    item_name: "Label Roll",
    item_code: "RM-0006",
    transaction: "transfer_in",
    reference: "TRF-2026-0054",
    warehouse_name: "Unit-2 Warehouse",
    qty_in: 40,
    qty_out: 0,
    balance: 220,
    unit: "Roll",
    user_name: "Raj K.",
    remarks: "Transfer received",
  },
  {
    id: "l5",
    date: "2026-08-12T11:20:00",
    item_name: "Color Masterbatch - Blue",
    item_code: "RM-0002",
    transaction: "adjustment",
    reference: "ADJ-2026-0018",
    warehouse_name: "Main Warehouse",
    qty_in: 20,
    qty_out: 0,
    balance: 104.5,
    unit: "KG",
    user_name: "Store Admin",
    remarks: "Stock count adjustment",
  },
  {
    id: "l6",
    date: "2026-08-12T09:15:00",
    item_name: "PP Granules",
    item_code: "RM-0003",
    transaction: "in",
    reference: "GRN-2026-0130",
    warehouse_name: "Main Warehouse",
    qty_in: 500,
    qty_out: 0,
    balance: 980,
    unit: "KG",
    user_name: "Ramesh Kumar",
    remarks: "GRN received",
  },
  {
    id: "l7",
    date: "2026-08-11T17:45:00",
    item_name: "Shrink Film",
    item_code: "RM-0005",
    transaction: "out",
    reference: "ISS-2026-0081",
    warehouse_name: "Unit-1 Warehouse",
    qty_in: 0,
    qty_out: 30,
    balance: 48,
    unit: "KG",
    user_name: "Suresh Babu",
    remarks: "Production Issue",
  },
  {
    id: "l8",
    date: "2026-08-10T12:00:00",
    item_name: "Corrugated Sheet",
    item_code: "RM-0008",
    transaction: "adjustment",
    reference: "ADJ-2026-0014",
    warehouse_name: "Unit-1 Warehouse",
    qty_in: 300,
    qty_out: 0,
    balance: 300,
    unit: "Nos",
    user_name: "Ops Team",
    remarks: "Return to stock",
  },
];

const MOCKUP_SUMMARY = {
  stock_in: 1250,
  stock_out: 980,
  transfers: 320,
  adjustments: 75,
  total_transactions: 28,
  uom: "KG",
};

function formatQty(value, { dashZero = true } = {}) {
  if (value == null || value === "") return "—";
  if (dashZero && Number(value) === 0) return "—";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateParts(value) {
  if (!value) return { day: "—", time: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { day: String(value).slice(0, 10), time: "" };
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

function resolveTxnType(row) {
  const t = String(row.transaction || "").toLowerCase().replace(/\s+/g, "_");
  if (["in", "purchase", "return", "production"].includes(t)) return "in";
  if (["out", "sales", "sale", "issue", "scrap"].includes(t)) return "out";
  if (t === "transfer_out" || (t === "transfer" && Number(row.qty_out) > 0)) return "transfer_out";
  if (t === "transfer_in" || (t === "transfer" && Number(row.qty_in) > 0)) return "transfer_in";
  if (t === "transfer") return "transfer_out";
  if (t === "adjustment") return "adjustment";
  return t || "adjustment";
}

function txnBadge(type) {
  const map = {
    in: { label: "Stock In", tone: "success", Icon: ArrowDownToLine },
    out: { label: "Stock Out", tone: "danger", Icon: ArrowUpFromLine },
    transfer_out: { label: "Transfer Out", tone: "warning", Icon: ArrowLeftRight },
    transfer_in: { label: "Transfer In", tone: "info", Icon: ArrowLeftRight },
    adjustment: { label: "Adjustment", tone: "pending", Icon: Wrench },
  };
  return map[type] || { label: type, tone: "neutral", Icon: Hash };
}

export default function StockLedger() {
  const { user } = useAuth();
  const storeMode = isStoreManager(user);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [entries, setEntries] = useState([]);
  const [warehousesApi, setWarehousesApi] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: "2026-08-01",
    dateTo: "2026-08-13",
    warehouse: "",
    item: "",
    type: "",
  });
  const [headerWarehouse, setHeaderWarehouse] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes, whRes] = await Promise.allSettled([
        getLedgerSummary(),
        getStockLedger(),
        getWarehouses(),
      ]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data) setSummary(sumRes.value.data);
      else setSummary({});
      if (listRes.status === "fulfilled") setEntries(asArray(listRes.value?.data));
      else setEntries([]);
      if (whRes.status === "fulfilled") setWarehousesApi(asArray(whRes.value?.data));
      else setWarehousesApi([]);
    } catch {
      setEntries([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useManufacturingRefresh(load);

  useEffect(() => {
    if (!headerWarehouse && warehousesApi.length) {
      setHeaderWarehouse(warehousesApi[0].name || String(warehousesApi[0].id));
    }
  }, [warehousesApi, headerWarehouse]);

  const hasLiveData = entries.length > 0;

  const rows = useMemo(() => {
    if (hasLiveData) {
      return entries.map((e) => ({
        ...e,
        item_code: e.item_code || e.sku || e.batch_number || "",
        unit: e.unit || "",
        remarks: e.remarks || e.notes || e.reference || "",
        live: true,
      }));
    }
    return MOCKUP_ENTRIES.map((e) => ({ ...e, live: false }));
  }, [hasLiveData, entries]);

  const warehouses = useMemo(() => {
    const set = new Set();
    rows.forEach((e) => {
      if (e.warehouse_name) set.add(e.warehouse_name);
    });
    warehousesApi.forEach((w) => {
      if (w.name) set.add(w.name);
    });
    return Array.from(set).sort();
  }, [rows, warehousesApi]);

  const itemOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((e) => {
      if (e.item_name) set.add(e.item_name);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filters.type) {
      list = list.filter((r) => resolveTxnType(r) === filters.type);
    }
    if (filters.item) {
      list = list.filter((r) => r.item_name === filters.item);
    }
    if (filters.warehouse) {
      list = list.filter((r) => r.warehouse_name === filters.warehouse);
    }
    if (filters.dateFrom) {
      list = list.filter((r) => r.date && String(r.date).slice(0, 10) >= filters.dateFrom);
    }
    if (filters.dateTo) {
      list = list.filter((r) => r.date && String(r.date).slice(0, 10) <= filters.dateTo);
    }
    return list;
  }, [rows, filters]);

  const kpis = useMemo(() => {
    if (!hasLiveData) return MOCKUP_SUMMARY;
    let stockIn = Number(summary.stock_in) || 0;
    let stockOut = Number(summary.stock_out) || 0;
    let transfers = Number(summary.transfers) || 0;
    let adjustments = Number(summary.adjustments) || 0;
    if (!summary.stock_in && !summary.stock_out) {
      stockIn = 0;
      stockOut = 0;
      transfers = 0;
      adjustments = 0;
      filtered.forEach((r) => {
        const type = resolveTxnType(r);
        const qi = Number(r.qty_in) || 0;
        const qo = Number(r.qty_out) || 0;
        if (type === "in") stockIn += qi;
        else if (type === "out") stockOut += qo;
        else if (type === "transfer_in" || type === "transfer_out") transfers += qi || qo;
        else if (type === "adjustment") adjustments += qi || qo;
      });
    }
    return {
      stock_in: stockIn,
      stock_out: stockOut,
      transfers,
      adjustments,
      total_transactions: summary.total_transactions ?? filtered.length,
      uom: "KG",
    };
  }, [hasLiveData, summary, filtered]);

  const clearFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      warehouse: "",
      item: "",
      type: "",
    });
  };

  const columns = [
    {
      key: "date",
      label: "Date & Time",
      render: (r) => {
        const { day, time } = formatDateParts(r.date);
        return (
          <div className="whitespace-nowrap">
            <p className="text-[13px] font-medium text-[var(--color-text)]">{day}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">{time}</p>
          </div>
        );
      },
    },
    {
      key: "item_name",
      label: "Item",
      render: (r) => (
        <div className="max-w-[180px]">
          <p className="truncate text-[13px] font-semibold text-[var(--color-text)]">{r.item_name || "—"}</p>
          <p className="truncate text-[11px] text-[var(--color-text-muted)]">{r.item_code || "—"}</p>
        </div>
      ),
    },
    {
      key: "transaction",
      label: "Transaction Type",
      render: (r) => {
        const type = resolveTxnType(r);
        const meta = txnBadge(type);
        const Icon = meta.Icon;
        return (
          <StatusBadge tone={meta.tone}>
            <span className="inline-flex items-center gap-1">
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          </StatusBadge>
        );
      },
    },
    {
      key: "reference",
      label: "Reference No.",
      render: (r) => (
        <span className="whitespace-nowrap text-[12px] tabular-nums text-[var(--color-text-secondary)]">
          {r.reference || "—"}
        </span>
      ),
    },
    {
      key: "warehouse_name",
      label: "Warehouse",
      render: (r) => <span className="text-[13px] text-[var(--color-text-secondary)]">{r.warehouse_name || "—"}</span>,
    },
    {
      key: "qty_in",
      label: "Stock In",
      render: (r) => (
        <span className={`tabular-nums text-[13px] font-semibold ${r.qty_in ? "text-[#16a34a]" : "text-[var(--color-text-muted)]"}`}>
          {r.qty_in ? formatQty(r.qty_in) : "—"}
        </span>
      ),
    },
    {
      key: "qty_out",
      label: "Stock Out",
      render: (r) => (
        <span className={`tabular-nums text-[13px] font-semibold ${r.qty_out ? "text-[#ef4444]" : "text-[var(--color-text-muted)]"}`}>
          {r.qty_out ? formatQty(r.qty_out) : "—"}
        </span>
      ),
    },
    {
      key: "balance",
      label: "Balance",
      render: (r) => (
        <span className="tabular-nums text-[13px] font-semibold text-[var(--color-text)]">
          {r.balance != null ? formatQty(r.balance) : "—"}
        </span>
      ),
    },
    {
      key: "unit",
      label: "UOM",
      render: (r) => <span className="text-[13px] text-[var(--color-text-secondary)]">{r.unit || "—"}</span>,
    },
    {
      key: "user_name",
      label: "User",
      render: (r) => <span className="text-[13px] text-[var(--color-text-secondary)]">{r.user_name || "—"}</span>,
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (r) => (
        <span className="max-w-[160px] truncate text-[12px] text-[var(--color-text-muted)]" title={r.remarks || ""}>
          {r.remarks || "—"}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-5 pb-4">
        {storeMode ? <StoreManagerNav /> : null}
        <Loader label="Loading stock ledger…" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      {storeMode ? <StoreManagerNav /> : null}

      <PageHeader
        title="Stock Ledger"
        showTitle
        subtitle="Track and analyze stock movement history"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
              <CalendarDays className="h-4 w-4 text-[var(--color-text-muted)]" />
              <span>
                {filters.dateFrom || "Start"} – {filters.dateTo || "End"}
              </span>
            </div>
            <select
              value={headerWarehouse}
              onChange={(e) => {
                setHeaderWarehouse(e.target.value);
                setFilters((f) => ({ ...f, warehouse: e.target.value }));
              }}
              className="ui-select !w-auto min-w-[11rem]"
              aria-label="Warehouse"
            >
              {warehouses.length ? (
                warehouses.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))
              ) : (
                <option value="">Main Warehouse</option>
              )}
            </select>
          </div>
        }
      />

      <div className="ui-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              <span className="ui-label">Date Range</span>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="ui-input"
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="ui-input"
                  aria-label="To date"
                />
              </div>
            </label>
            <label className="text-sm">
              <span className="ui-label">Item</span>
              <select
                value={filters.item}
                onChange={(e) => setFilters((f) => ({ ...f, item: e.target.value }))}
                className="ui-select"
              >
                <option value="">All Items</option>
                {itemOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="ui-label">Warehouse</span>
              <select
                value={filters.warehouse}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, warehouse: e.target.value }));
                  setHeaderWarehouse(e.target.value);
                }}
                className="ui-select"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="ui-label">Transaction Type</span>
              <select
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                className="ui-select"
              >
                <option value="">All Types</option>
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
                <option value="transfer_in">Transfer In</option>
                <option value="transfer_out">Transfer Out</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary">
              <Filter className="h-4 w-4" /> Filters
            </Button>
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <RefreshCw className="h-4 w-4" /> Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Total Stock In"
          value={`${formatQty(kpis.stock_in, { dashZero: false })} ${kpis.uom}`}
          icon={ArrowDownToLine}
          tone="success"
          className="[&_.ui-kpi__value]:!text-[#16a34a]"
        />
        <KpiCard
          label="Total Stock Out"
          value={`${formatQty(kpis.stock_out, { dashZero: false })} ${kpis.uom}`}
          icon={ArrowUpFromLine}
          tone="danger"
          className="[&_.ui-kpi__value]:!text-[#ef4444]"
        />
        <KpiCard
          label="Total Transfers"
          value={`${formatQty(kpis.transfers, { dashZero: false })} ${kpis.uom}`}
          icon={ArrowLeftRight}
          tone="info"
          className="[&_.ui-kpi__value]:!text-[#2563eb]"
        />
        <KpiCard
          label="Total Adjustments"
          value={`${formatQty(kpis.adjustments, { dashZero: false })} ${kpis.uom}`}
          icon={ClipboardList}
          tone="warning"
          className="[&_.ui-kpi__value]:!text-[#ea580c]"
        />
        <KpiCard
          label="Total Transactions"
          value={Number(kpis.total_transactions).toLocaleString("en-IN")}
          icon={Hash}
          tone="primary"
          className="[&_.ui-kpi__value]:!text-[#7c3aed]"
        />
      </div>

      <div className="ui-card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Stock Movements</h2>
          <Button
            variant="outline"
            type="button"
            className="!border-[#16a34a] !text-[#16a34a]"
            onClick={() =>
              exportToExcel(
                filtered.map((r) => ({
                  ...r,
                  transaction: txnBadge(resolveTxnType(r)).label,
                })),
                [
                  { key: "date", label: "Date" },
                  { key: "item_name", label: "Item" },
                  { key: "item_code", label: "Item Code" },
                  { key: "transaction", label: "Type" },
                  { key: "reference", label: "Reference" },
                  { key: "warehouse_name", label: "Warehouse" },
                  { key: "qty_in", label: "Stock In" },
                  { key: "qty_out", label: "Stock Out" },
                  { key: "balance", label: "Balance" },
                  { key: "unit", label: "UOM" },
                  { key: "user_name", label: "User" },
                  { key: "remarks", label: "Remarks" },
                ],
                "stock-ledger"
              )
            }
          >
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
          <DataTable
            columns={columns}
            data={filtered}
            showSearch={false}
            pageSize={10}
            emptyState={
              <EmptyState
                icon="chart"
                title="No movements found"
                description="Stock ledger entries appear when stock is received, issued, transferred, or adjusted."
              />
            }
          />
        </div>
      </div>
    </div>
  );
}

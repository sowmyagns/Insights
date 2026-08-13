import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import StoreManagerNav from "../../components/inventory/StoreManagerNav";
import { useToast } from "../../context/ToastContext";
import {
  getInventoryDashboard,
  getStoreInventoryHistory,
  getWarehouses,
} from "../../api/inventoryApi";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import { exportToExcel } from "../../utils/exportUtils";

const TXN_TYPES = [
  { value: "", label: "All types" },
  { value: "in", label: "Stock In" },
  { value: "out", label: "Material Issue" },
  { value: "return", label: "Stock Return" },
  { value: "transfer", label: "Stock Transfer" },
  { value: "adjustment", label: "Stock Adjustment" },
  { value: "scrap", label: "Waste / Scrap" },
];

export default function StoreInventoryHistory() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [filters, setFilters] = useState({
    item_id: "",
    warehouse_id: "",
    movement_type: "",
    user_name: "",
    date_from: "",
    date_to: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.item_id) params.item_id = Number(filters.item_id);
      if (filters.warehouse_id) params.warehouse_id = Number(filters.warehouse_id);
      if (filters.movement_type) params.movement_type = filters.movement_type;
      if (filters.user_name) params.user_name = filters.user_name;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const [histRes, itemsRes, whRes] = await Promise.allSettled([
        getStoreInventoryHistory(params),
        getInventoryDashboard(),
        getWarehouses(),
      ]);
      setRows(histRes.status === "fulfilled" ? histRes.value?.data || [] : []);
      setItems(itemsRes.status === "fulfilled" ? itemsRes.value?.data || [] : []);
      setWarehouses(whRes.status === "fulfilled" ? whRes.value?.data || [] : []);
    } catch {
      addToast("Could not load history", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  useManufacturingRefresh(load);

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (r) => (r.date ? new Date(r.date).toLocaleString() : "—"),
    },
    {
      key: "transaction",
      label: "Transaction",
      render: (r) => <span className="capitalize">{String(r.transaction || "").replace(/_/g, " ")}</span>,
    },
    { key: "product", label: "Product" },
    { key: "quantity", label: "Quantity", render: (r) => <span className="font-semibold tabular-nums">{r.quantity}</span> },
    { key: "user", label: "User" },
    { key: "machine", label: "Machine", render: (r) => r.machine || "—" },
    { key: "warehouse", label: "Warehouse" },
  ];

  return (
    <div className="space-y-6 pb-8">
      <StoreManagerNav />
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ui-subtitle">
            Complete movement trail for every stock in, issue, return, transfer, and adjustment.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              exportToExcel(rows, columns.filter((c) => !c.render), "inventory-history");
              addToast("Exported");
            }}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </header>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="text-xs font-semibold text-slate-600">
          Product
          <select
            value={filters.item_id}
            onChange={(e) => setFilters((f) => ({ ...f, item_id: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-normal"
          >
            <option value="">All</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Warehouse
          <select
            value={filters.warehouse_id}
            onChange={(e) => setFilters((f) => ({ ...f, warehouse_id: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-normal"
          >
            <option value="">All</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Type
          <select
            value={filters.movement_type}
            onChange={(e) => setFilters((f) => ({ ...f, movement_type: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-normal"
          >
            {TXN_TYPES.map((t) => (
              <option key={t.value || "all"} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Employee
          <input
            value={filters.user_name}
            onChange={(e) => setFilters((f) => ({ ...f, user_name: e.target.value }))}
            placeholder="Name"
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          From
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          To
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-normal"
          />
        </label>
      </div>

      {loading ? (
        <Loader label="Loading history…" />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <DataTable columns={columns} data={rows} showSearch pageSize={15} />
        </section>
      )}
    </div>
  );
}

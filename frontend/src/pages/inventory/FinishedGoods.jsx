import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownToLine,
  CalendarDays,
  Coins,
  Eye,
  Filter,
  MoreVertical,
  Package,
  PackageX,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import KpiCard from "../../components/common/KpiCard";
import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { getFinishedGoods, getFinishedGoodsSummary, getWarehouses } from "../../api/inventoryApi";
import { stockStatusLabel, stockStatusTone } from "../../data/inventoryMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import { asArray } from "../../utils/apiError";

/** Preview rows from the Finished Goods design mockup (used only when live list is empty). */
const MOCKUP_ROWS = [
  {
    id: "fg-1",
    name: "500ml Water Bottle",
    description: "Packaged drinking water",
    sku: "FG-0001",
    category: "Beverages",
    unit: "Nos",
    available: 1850,
    reserved: 120,
    reorder_level: 500,
    status: "available",
    warehouse_name: "Main Warehouse",
    last_updated: "2026-08-13T16:30:00",
    quantity: 1970,
    unit_cost: 12,
    thumb: "#0ea5e9",
  },
  {
    id: "fg-2",
    name: "1kg Peanut Butter Jar",
    description: "Creamy peanut butter",
    sku: "FG-0002",
    category: "Food",
    unit: "Nos",
    available: 42,
    reserved: 5,
    reorder_level: 80,
    status: "low_stock",
    warehouse_name: "Main Warehouse",
    last_updated: "2026-08-13T14:10:00",
    quantity: 47,
    unit_cost: 220,
    thumb: "#d97706",
  },
  {
    id: "fg-3",
    name: "250ml Juice Carton",
    description: "Mixed fruit juice",
    sku: "FG-0003",
    category: "Beverages",
    unit: "Nos",
    available: 940,
    reserved: 60,
    reorder_level: 300,
    status: "available",
    warehouse_name: "Unit-2 Warehouse",
    last_updated: "2026-08-12T11:05:00",
    quantity: 1000,
    unit_cost: 28,
    thumb: "#22c55e",
  },
  {
    id: "fg-4",
    name: "Family Cookie Pack",
    description: "Assorted biscuits",
    sku: "FG-0004",
    category: "Snacks",
    unit: "Nos",
    available: 610,
    reserved: 25,
    reorder_level: 200,
    status: "available",
    warehouse_name: "Main Warehouse",
    last_updated: "2026-08-13T09:40:00",
    quantity: 635,
    unit_cost: 85,
    thumb: "#a855f7",
  },
  {
    id: "fg-5",
    name: "500g Protein Bar Box",
    description: "12-bar carton",
    sku: "FG-0005",
    category: "Snacks",
    unit: "Box",
    available: 28,
    reserved: 2,
    reorder_level: 40,
    status: "low_stock",
    warehouse_name: "FG Store",
    last_updated: "2026-08-11T18:20:00",
    quantity: 30,
    unit_cost: 480,
    thumb: "#14b8a6",
  },
  {
    id: "fg-6",
    name: "1kg Coffee Pouch",
    description: "Roasted ground coffee",
    sku: "FG-0006",
    category: "Food",
    unit: "Nos",
    available: 0,
    reserved: 0,
    reorder_level: 100,
    status: "out_of_stock",
    warehouse_name: "Main Warehouse",
    last_updated: "2026-08-09T17:45:00",
    quantity: 0,
    unit_cost: 450,
    thumb: "#ef4444",
  },
  {
    id: "fg-7",
    name: "1L Cooking Oil Bottle",
    description: "Refined sunflower oil",
    sku: "FG-0007",
    category: "Food",
    unit: "Nos",
    available: 720,
    reserved: 40,
    reorder_level: 250,
    status: "available",
    warehouse_name: "Unit-1 Warehouse",
    last_updated: "2026-08-13T08:15:00",
    quantity: 760,
    unit_cost: 165,
    thumb: "#f59e0b",
  },
  {
    id: "fg-8",
    name: "Herbal Tea Pack",
    description: "25 tea bags",
    sku: "FG-0008",
    category: "Beverages",
    unit: "Nos",
    available: 18,
    reserved: 0,
    reorder_level: 50,
    status: "low_stock",
    warehouse_name: "Main Warehouse",
    last_updated: "2026-08-10T12:00:00",
    quantity: 18,
    unit_cost: 95,
    thumb: "#64748b",
  },
];

const MOCKUP_SUMMARY = {
  total_products: 96,
  stock_value: 2845600,
  low_stock: 14,
  out_of_stock: 5,
  total_quantity: 3254,
};

function formatInrAmount(value) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatQty(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatUpdated(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function resolveStatus(row) {
  const q = Number(row.available ?? row.quantity ?? 0) || 0;
  const reorder = Number(row.reorder_level) || 0;
  if (row.status === "damaged") return "damaged";
  if (row.status === "out_of_stock" || q <= 0) return "out_of_stock";
  if (row.status === "low_stock" || (reorder > 0 && q <= reorder)) return "low_stock";
  if (row.status === "ready") return "ready";
  return "available";
}

function thumbColor(name = "") {
  const colors = ["#0ea5e9", "#d97706", "#22c55e", "#a855f7", "#14b8a6", "#ef4444", "#f59e0b", "#64748b"];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % colors.length;
  return colors[hash];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function FinishedGoods() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [products, setProducts] = useState([]);
  const [warehousesApi, setWarehousesApi] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [category, setCategory] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [selectedDate, setSelectedDate] = useState("2026-08-13");
  const [headerWarehouse, setHeaderWarehouse] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes, whRes] = await Promise.allSettled([
        getFinishedGoodsSummary(),
        getFinishedGoods(),
        getWarehouses(),
      ]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data) setSummary(sumRes.value.data);
      else setSummary({});
      if (listRes.status === "fulfilled") setProducts(asArray(listRes.value?.data));
      else setProducts([]);
      if (whRes.status === "fulfilled") setWarehousesApi(asArray(whRes.value?.data));
      else setWarehousesApi([]);
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
      setHeaderWarehouse(String(warehousesApi[0].id));
    }
  }, [warehousesApi, headerWarehouse]);

  const hasLiveData = products.length > 0;

  const rows = useMemo(() => {
    if (hasLiveData) {
      return products.map((p) => {
        const available = Number(p.available ?? Math.max((Number(p.quantity) || 0) - (Number(p.reserved) || 0), 0));
        return {
          ...p,
          available,
          reserved: Number(p.reserved || 0),
          description: p.description || p.category || "",
          last_updated: p.updated_at || p.last_updated || p.created_at,
          thumb: thumbColor(p.name || p.sku || ""),
          live: true,
        };
      });
    }
    return MOCKUP_ROWS.map((r) => ({ ...r, live: false }));
  }, [hasLiveData, products]);

  const kpis = useMemo(() => {
    if (!hasLiveData) return MOCKUP_SUMMARY;
    let low = 0;
    let out = 0;
    let stockValue = Number(summary.stock_value) || 0;
    let totalQty = 0;
    rows.forEach((p) => {
      const st = resolveStatus(p);
      if (st === "out_of_stock" || st === "damaged") out += 1;
      else if (st === "low_stock") low += 1;
      totalQty += Number(p.available ?? p.quantity ?? 0) || 0;
      if (!summary.stock_value) {
        const q = Number(p.quantity ?? p.available ?? 0) || 0;
        const cost = Number(p.unit_cost) || 0;
        stockValue += p.stock_value != null ? Number(p.stock_value) : q * cost;
      }
    });
    return {
      total_products: summary.total_products ?? rows.length,
      stock_value: stockValue,
      low_stock: summary.low_stock ?? low,
      out_of_stock: summary.out_of_stock ?? out,
      total_quantity: totalQty,
    };
  }, [hasLiveData, rows, summary]);

  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const warehouseOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.warehouse_name).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.name, r.sku, r.category, r.description, r.warehouse_name].some(
          (v) => v && String(v).toLowerCase().includes(q)
        )
      );
    }
    if (statusFilter) list = list.filter((r) => resolveStatus(r) === statusFilter);
    if (category) list = list.filter((r) => r.category === category);
    if (warehouse) list = list.filter((r) => r.warehouse_name === warehouse);
    return list;
  }, [rows, search, statusFilter, category, warehouse]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCategory("");
    setWarehouse("");
    setSelectedIds(new Set());
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns = [
    {
      key: "_check",
      label: "",
      sortable: false,
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedIds.has(r.id)}
          onChange={() => toggleRow(r.id)}
          className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-action-teal)]"
          aria-label={`Select ${r.name}`}
        />
      ),
    },
    {
      key: "name",
      label: "Product Name",
      render: (r) => (
        <div className="flex min-w-[180px] items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
            style={{ backgroundColor: r.thumb || thumbColor(r.name) }}
            aria-hidden
          >
            {(r.name || "?").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[var(--color-text)]">{r.name}</p>
            <p className="truncate text-[11px] text-[var(--color-text-muted)]">{r.description || r.category || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "sku",
      label: "SKU / Code",
      render: (r) => <span className="tabular-nums text-[13px] text-[var(--color-text-secondary)]">{r.sku || "—"}</span>,
    },
    {
      key: "category",
      label: "Category",
      render: (r) => <span className="text-[13px] text-[var(--color-text)]">{r.category || "—"}</span>,
    },
    {
      key: "unit",
      label: "UOM",
      render: (r) => <span className="text-[13px] text-[var(--color-text-secondary)]">{r.unit || "—"}</span>,
    },
    {
      key: "available",
      label: "Available Qty",
      render: (r) => (
        <span className="tabular-nums text-[13px] font-semibold text-[var(--color-text)]">{formatQty(r.available)}</span>
      ),
    },
    {
      key: "reserved",
      label: "Reserved Qty",
      render: (r) => (
        <span className="tabular-nums text-[13px] text-[var(--color-text-secondary)]">{formatQty(r.reserved)}</span>
      ),
    },
    {
      key: "reorder_level",
      label: "Reorder Level",
      render: (r) => (
        <span className="tabular-nums text-[13px] text-[var(--color-text-secondary)]">
          {r.reorder_level != null ? formatQty(r.reorder_level) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Stock Status",
      render: (r) => {
        const st = resolveStatus(r);
        return <StatusBadge tone={stockStatusTone(st)}>{stockStatusLabel(st)}</StatusBadge>;
      },
    },
    {
      key: "warehouse_name",
      label: "Warehouse",
      render: (r) => <span className="text-[13px] text-[var(--color-text-secondary)]">{r.warehouse_name || "—"}</span>,
    },
    {
      key: "last_updated",
      label: "Last Updated",
      render: (r) => (
        <span className="whitespace-nowrap text-[12px] text-[var(--color-text-muted)]">{formatUpdated(r.last_updated)}</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <Link
            to={r.live ? `/inventory/items/${r.id}` : "/inventory/finished-goods"}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-action-teal)]"
            aria-label="View"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            to={r.live ? `/inventory/items/create?type=finished_good&edit=${r.id}` : "/inventory/items/create?type=finished_good"}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <Link
            to="/inventory/stock-movement"
            className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
            aria-label="More"
            title="Stock Movement"
          >
            <MoreVertical className="h-4 w-4" />
          </Link>
        </div>
      ),
    },
  ];

  if (loading) return <Loader label="Loading finished goods…" />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Finished Goods"
        showTitle
        subtitle="Manage and track your finished goods inventory"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative inline-flex items-center">
              <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--color-text-muted)]" aria-hidden />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || todayISO())}
                className="ui-input !w-auto min-w-[10.5rem] !pl-9"
                aria-label="Date"
              />
            </label>
            <select
              value={headerWarehouse}
              onChange={(e) => setHeaderWarehouse(e.target.value)}
              className="ui-select !w-auto min-w-[11rem]"
              aria-label="Warehouse"
            >
              {warehousesApi.length ? (
                warehousesApi.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))
              ) : (
                <option value="">Main Warehouse</option>
              )}
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total Products" value={Number(kpis.total_products).toLocaleString("en-IN")} icon={Package} tone="info" meta="All finished goods" />
        <KpiCard label="Total Stock Value" value={formatInrAmount(kpis.stock_value)} icon={Coins} tone="success" meta="Across all warehouses" />
        <KpiCard label="Low Stock Items" value={kpis.low_stock} icon={AlertTriangle} tone="warning" meta="Reorder level reached" />
        <KpiCard label="Out of Stock" value={kpis.out_of_stock} icon={PackageX} tone="danger" meta="Stock not available" />
        <KpiCard label="Total Quantity" value={formatQty(kpis.total_quantity)} icon={ArrowDownToLine} tone="info" meta="Across all products" />
      </div>

      <div className="ui-card p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 xl:max-w-lg">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              placeholder="Search by product name, SKU, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ui-input w-full !pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-4 w-4" /> Filters
            </Button>
            {showFilters ? (
              <>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="ui-select !w-auto min-w-[8.5rem]">
                  <option value="">Category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ui-select !w-auto min-w-[8.5rem]">
                  <option value="">Status</option>
                  <option value="available">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
                <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="ui-select !w-auto min-w-[9rem]">
                  <option value="">Warehouse</option>
                  {warehouseOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  <RefreshCw className="h-4 w-4" /> Clear
                </Button>
              </>
            ) : null}
            <Button variant="primary" to="/inventory/items/create?type=finished_good">
              <Plus className="h-4 w-4" /> Add Finished Good
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
          <DataTable
            columns={columns}
            data={filtered}
            showSearch={false}
            pageSize={10}
            emptyState={
              <EmptyState
                icon="cube"
                title="No finished goods found"
                description="Add your first finished good to start tracking stock."
                actionLabel="Add Finished Good"
                actionHref="/inventory/items/create?type=finished_good"
              />
            }
          />
        </div>
      </div>
    </div>
  );
}

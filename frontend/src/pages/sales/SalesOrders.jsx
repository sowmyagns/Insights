import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { Link } from "react-router-dom";
import { Download, Filter, IndianRupee, Plus, ShoppingCart, Truck } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import SkeletonTable from "../../components/common/SkeletonTable";
import { ErrorState, NoResultsState, OfflineState } from "../../components/common/states";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import SODetailModal from "../../components/sales/SODetailModal";
import { useToast } from "../../context/ToastContext";
import { useNetworkStatus } from "../../context/NetworkStatusContext";
import { getSOSummary, getSalesOrdersEnriched } from "../../api/salesApi";
import { formatInr, statusColor } from "../../data/salesMasterData";
import { exportToExcel } from "../../utils/exportUtils";

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p>
        </div>
        {Icon && (
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

const defaultFilters = { customer: "", status: "", sales_person: "" };

export default function SalesOrders() {
  const { addToast } = useToast();
  const { online, markRequestStart, markRequestEnd } = useNetworkStatus();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    if (typeof markRequestStart === "function") markRequestStart();
    try {
      const res = await getSalesOrdersEnriched().catch(() => ({ data: [] }));
      const apiOrders = Array.isArray(res?.data) ? res.data : [];
      const stored = localStorage.getItem("smrt_sales_orders");
      const localOrders = stored ? JSON.parse(stored) : [];

      const soMap = new Map();
      [...apiOrders, ...localOrders].forEach((o) => {
        const key = String(o.order_number || o.so_number || o.id || "").trim().toLowerCase();
        if (key) soMap.set(key, o);
      });
      setRows(Array.from(soMap.values()));
    } catch {
      const stored = localStorage.getItem("smrt_sales_orders");
      const localOrders = stored ? JSON.parse(stored) : [];
      const soMap = new Map();
      localOrders.forEach((o) => {
        const key = String(o.order_number || o.so_number || o.id || "").trim().toLowerCase();
        if (key) soMap.set(key, o);
      });
      setRows(Array.from(soMap.values()));
    } finally {
      if (typeof markRequestEnd === "function") markRequestEnd();
      setLoading(false);
    }
  }, [markRequestStart, markRequestEnd]);

  usePageRefresh(load);


  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    const total_orders = rows.length;
    const pending = rows.filter((r) => String(r.status || "").toLowerCase() === "pending").length;
    const confirmed = rows.filter((r) => String(r.status || "").toLowerCase() === "confirmed").length;
    const packed = rows.filter((r) => String(r.status || "").toLowerCase() === "packed" || r.packed).length;
    const shipped = rows.filter((r) => String(r.status || "").toLowerCase() === "shipped" || r.shipped).length;
    const delivered = rows.filter((r) => String(r.status || "").toLowerCase() === "delivered").length;
    const cancelled = rows.filter((r) => String(r.status || "").toLowerCase() === "cancelled").length;
    const revenue = rows.reduce((acc, r) => acc + (Number(r.amount || r.total_amount) || 0), 0);

    return { total_orders, pending, confirmed, packed, shipped, delivered, cancelled, revenue };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filters.customer) list = list.filter((r) => r.customer_name?.toLowerCase().includes(filters.customer.toLowerCase()));
    if (filters.status) list = list.filter((r) => String(r.status || "").toLowerCase() === filters.status.toLowerCase());
    if (filters.sales_person) list = list.filter((r) => r.sales_person?.toLowerCase().includes(filters.sales_person.toLowerCase()));
    return list;
  }, [rows, filters]);

  const hasAdvancedFilters = Boolean(
    filters.customer || filters.status || filters.sales_person
  );

  const columns = [
    {
      key: "order_number",
      label: "Sales Order Number",
      render: (r) =>
        typeof r.id === "number" ? (
          <Link to={`/sales/orders/${r.id}`} className="font-medium text-teal-800 hover:underline">
            {r.order_number}
          </Link>
        ) : (
          <span className="font-medium text-teal-800">{r.order_number}</span>
        ),    },
    { key: "customer_name", label: "Customer" },
    { key: "order_date", label: "Order Date", render: (r) => String(r.order_date || r.so_date || "").slice(0, 10) || "—" },
    { key: "due_date", label: "Due Date", render: (r) => String(r.due_date || "").slice(0, 10) || "—" },
    {
      key: "item_description",
      label: "Product",
      render: (r) => {
        const lines = r.line_items || [];
        if (!lines.length) return "—";
        const first = lines[0].item_description || "—";
        return lines.length > 1 ? `${first} +${lines.length - 1} more` : first;
      },
    },
    {
      key: "quantity",
      label: "Qty",
      render: (r) => {
        const lines = r.line_items || [];
        if (!lines.length) return "—";
        return lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
      },
    },
    {
      key: "unit",
      label: "Unit",
      render: (r) => r.line_items?.[0]?.unit || "—",
    },
    {
      key: "unit_price",
      label: "Unit Price",
      render: (r) => {
        const lines = r.line_items || [];
        if (!lines.length) return "—";
        return formatInr(lines[0].unit_price);
      },
    },
    { key: "total_amount", label: "Total Amount", render: (r) => formatInr(r.total_amount || r.amount) },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColor(r.status)}`}>
          {r.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelected(r)}
            className="text-xs font-semibold text-teal-800 hover:underline"
          >
            View
          </button>
          <Link
            to={`/sales/orders/create?edit=${r.order_number || r.so_number}`}
            className="text-xs font-semibold text-slate-600 hover:underline"
          >
            Edit
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">Sales</p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Sales Orders</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage orders from quotation to dispatch with production and inventory integration.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/sales/orders/create" className="ui-btn-primary">
            <Plus className="h-4 w-4" /> New Sales Order
          </Link>
          <button
            type="button"
            onClick={() =>
              exportToExcel(
                filtered,
                columns.filter((c) => !c.render),
                "sales-orders"
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </header>

      <ManufacturingWorkflowBar currentStepId="sales_order" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <KpiCard label="Total Orders" value={summary.total_orders ?? 0} icon={ShoppingCart} color="bg-teal-700" />
        <KpiCard label="Pending" value={summary.pending ?? 0} icon={ShoppingCart} color="bg-amber-500" />
        <KpiCard label="Confirmed" value={summary.confirmed ?? 0} icon={ShoppingCart} color="bg-indigo-600" />
        <KpiCard label="Packed" value={summary.packed ?? 0} icon={ShoppingCart} color="bg-slate-600" />
        <KpiCard label="Shipped" value={summary.shipped ?? 0} icon={Truck} color="bg-cyan-600" />
        <KpiCard label="Delivered" value={summary.delivered ?? 0} icon={Truck} color="bg-emerald-600" />
        <KpiCard label="Cancelled" value={summary.cancelled ?? 0} icon={ShoppingCart} color="bg-rose-600" />
        <KpiCard label="Revenue" value={formatInr(summary.revenue ?? 0)} icon={IndianRupee} color="bg-emerald-700" />
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
        >
          <Filter className="h-4 w-4" /> Filters
        </button>
        {showAdvanced && (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <input
              value={filters.customer}
              onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
              placeholder="Customer"
              className="ui-input"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="ui-input"
            >
              <option value="">All Status</option>
              {["draft", "pending", "confirmed", "packed", "shipped", "delivered", "cancelled"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                )
              )}
            </select>
            <input
              value={filters.sales_person}
              onChange={(e) => setFilters({ ...filters, sales_person: e.target.value })}
              placeholder="Sales Person"
              className="ui-input"
            />
          </div>
        )}

        {loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : !online && loadError ? (
          <OfflineState onRetry={load} />
        ) : loadError ? (
          <ErrorState description={loadError} onRetry={load} />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            searchPlaceholder="Search SO, customer..."
            searchKeys={["order_number", "customer_name", "sales_person"]}
            emptyState={
              rows.length === 0 ? (
                <EmptyState
                  icon="clipboard"
                  title="No sales orders yet"
                  description="Create your first sales order to start the order-to-cash flow."
                  actionLabel="New Sales Order"
                  actionHref="/sales/orders/create"
                />
              ) : hasAdvancedFilters ? (
                <NoResultsState
                  query={filters.customer || filters.status || filters.sales_person}
                  onClear={() => setFilters(defaultFilters)}
                />
              ) : (
                <EmptyState
                  title="No sales orders yet"
                  description="Create your first sales order to get started."
                  actionLabel="New Sales Order"
                  actionHref="/sales/orders/create"
                />
              )
            }
          />
        )}
      </div>

      {selected && (
        <SODetailModal
          order={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

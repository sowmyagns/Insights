import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Filter, Plus, ShoppingCart, Truck } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import PODetailModal from "../../components/procurement/PODetailModal";
import { useToast } from "../../context/ToastContext";
import {
  getPOSummary,
  getPurchaseOrdersEnriched,
  updatePurchaseOrderStatus,
} from "../../api/procurementApi";
import { formatInr, statusColor } from "../../data/procurementMasterData";
import { exportToExcel } from "../../utils/exportUtils";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";

function KpiCard({ label, value, icon: Icon, color }) {
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
        <p className="truncate text-xl font-bold tabular-nums text-[var(--color-text)] leading-none sm:text-2xl">{value ?? 0}</p>
      </div>
    </div>
  );
}

const defaultFilters = { vendor: "", status: "", buyer: "" };
const emptySummary = {
  total_po: 0,
  pending: 0,
  approved: 0,
  delivered: 0,
  cancelled: 0,
  po_value: 0,
};

export default function PurchaseOrders() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(emptySummary);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.allSettled([
        getPOSummary(),
        getPurchaseOrdersEnriched(),
      ]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data) {
        setSummary({ ...emptySummary, ...sumRes.value.data });
      } else {
        setSummary(emptySummary);
      }
      if (listRes.status === "fulfilled") setRows(listRes.value?.data || []);
      else setRows([]);
    } catch {
      addToast("Failed to load purchase orders", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  useManufacturingRefresh(load);

  const filtered = useMemo(() => {
    let list = rows;
    if (filters.vendor) {
      list = list.filter((r) =>
        (r.vendor_name || r.supplier_name || "")
          .toLowerCase()
          .includes(filters.vendor.toLowerCase())
      );
    }
    if (filters.status) list = list.filter((r) => r.status === filters.status);
    if (filters.buyer) {
      list = list.filter((r) =>
        r.buyer?.toLowerCase().includes(filters.buyer.toLowerCase())
      );
    }
    return list;
  }, [rows, filters]);

  const handleStatus = async (po, status) => {
    if (typeof po.id !== "number") {
      addToast("Invalid purchase order", "error");
      return;
    }
    try {
      await updatePurchaseOrderStatus(po.id, status);
      addToast(`PO marked as ${status}`);
      setSelected(null);
      load();
    } catch (err) {
      addToast(err.response?.data?.detail || "Update failed", "error");
    }
  };

  const columns = [
    {
      key: "po_number",
      label: "Purchase Order Number",
      render: (r) => (
        <span className="font-medium text-[#2563EB]">{r.po_number || `PO-${r.id}`}</span>
      ),
    },
    {
      key: "vendor_name",
      label: "Vendor",
      render: (r) => r.vendor_name || r.supplier_name || "—",
    },
    {
      key: "order_date",
      label: "Date",
      render: (r) => String(r.order_date || "").slice(0, 10),
    },
    {
      key: "total_amount",
      label: "Amount",
      render: (r) => (r.total_amount != null ? formatInr(r.total_amount) : "—"),
    },
    {
      key: "expected_date",
      label: "Delivery Date",
      render: (r) => r.expected_date || "—",
    },
    {
      key: "payment_terms",
      label: "Payment Terms",
      render: (r) => r.payment_terms || "—",
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColor(r.status)}`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelected(r)}
            className="text-xs font-semibold text-[#2563EB] hover:underline"
          >
            View
          </button>
          <Link
            to={`/procurement/goods-receipt/create?po_id=${r.id}`}
            className="text-xs font-semibold text-teal-700 hover:underline"
          >
            GRN
          </Link>
        </div>
      ),
    },
  ];

  if (loading) return <Loader label="Loading purchase orders..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ui-subtitle">
            Approve Purchase Orders (POs) from material requests, then receive goods via Goods Receipt Note (GRN).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/procurement/purchase-orders/create" className="ui-btn-primary">
            <Plus className="h-4 w-4" /> New Purchase Order (PO)
          </Link>
          <button
            type="button"
            onClick={() =>
              exportToExcel(
                filtered,
                columns.filter((c) => !c.render),
                "purchase-orders"
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </header>

      <ManufacturingWorkflowBar currentStepId="purchase_order" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Purchase Orders (POs)" value={summary.total_po} icon={ShoppingCart} color="bg-blue-600" />
        <KpiCard label="Pending" value={summary.pending} icon={ShoppingCart} color="bg-amber-500" />
        <KpiCard label="Approved" value={summary.approved} icon={ShoppingCart} color="bg-green-600" />
        <KpiCard label="Delivered" value={summary.delivered} icon={Truck} color="bg-teal-600" />
        <KpiCard label="Cancelled" value={summary.cancelled} icon={ShoppingCart} color="bg-red-500" />
        <KpiCard
          label="Purchase Order (PO) Value"
          value={formatInr(summary.po_value)}
          icon={ShoppingCart}
          color="bg-indigo-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
              value={filters.vendor}
              onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
              placeholder="Vendor"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              {["draft", "pending", "approved", "received", "delivered", "cancelled"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                )
              )}
            </select>
            <input
              value={filters.buyer}
              onChange={(e) => setFilters({ ...filters, buyer: e.target.value })}
              placeholder="Buyer"
              className="rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        )}
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Search PO, vendor..."
          searchKeys={["po_number", "vendor_name", "supplier_name", "buyer"]}
        />
      </div>

      {selected && (
        <PODetailModal
          po={selected}
          onClose={() => setSelected(null)}
          onApprove={(po) => handleStatus(po, "approved")}
          onReject={(po) => handleStatus(po, "cancelled")}
        />
      )}
    </div>
  );
}

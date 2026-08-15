import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Filter, Plus, ShoppingCart, Truck } from "lucide-react";
import KpiCard from "../../components/common/KpiCard";
import PageHeader from "../../components/common/PageHeader";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import Button from "../../components/common/Button";
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
        <span className="font-medium text-[var(--color-primary)]">{r.po_number || `PO-${r.id}`}</span>
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
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            View
          </button>
          <Link
            to={`/procurement/goods-receipt/create?po_id=${r.id}`}
            className="text-xs font-semibold text-[var(--color-success)] hover:underline"
          >
            GRN
          </Link>
        </div>
      ),
    },
  ];

  if (loading) return <Loader label="Loading purchase orders..." />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        action={
          <>
            <Button
              variant="primary"
              to="/procurement/purchase-orders/create"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              New Purchase Order (PO)
            </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              exportToExcel(
                filtered,
                columns.filter((c) => !c.render),
                "purchase-orders"
              )
            }
          >
            <Download className="h-4 w-4" /> Export
          </Button>
          </>
        }
      />

      <div className="ui-grid-kpi">
        <KpiCard label="Total Purchase Orders (POs)" value={summary.total_po} icon={ShoppingCart} color="bg-[var(--color-primary)]" />
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

      <div className="ui-card p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-3 inline-flex items-center gap-2 text-[var(--text-sm)] font-semibold text-[var(--color-text-secondary)]"
        >
          <Filter className="h-4 w-4" /> Filters
        </button>
        {showAdvanced && (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <input
              value={filters.vendor}
              onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
              placeholder="Vendor"
              className="ui-input"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="ui-select"
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
              className="ui-input"
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

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, IndianRupee, ShoppingCart, Truck, Users } from "lucide-react";
import KpiCard from "../../components/common/KpiCard";
import PageHeader from "../../components/common/PageHeader";

import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getProcurementHub } from "../../api/procurementApi";
import { formatInr, PROCUREMENT_FLOW } from "../../data/procurementMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";


const alertIcons = { low_stock: AlertTriangle, delayed_po: Truck, pending_rfq: ShoppingCart, overdue_bill: IndianRupee, late_vendor: Users, rejected_qc: AlertTriangle };
const emptyHub = {
  purchase_spend: 0, pending_approvals: 0, open_rfqs: 0, active_vendors: 0,
  outstanding_bills: 0, todays_deliveries: 0, top_vendors: [], pending_orders: [], alerts: [],
};

export default function SupplyChainDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hub, setHub] = useState(emptyHub);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProcurementHub();
      if (res.data) setHub({ ...emptyHub, ...res.data });
      else setHub(emptyHub);
    } catch {
      addToast("Failed to load procurement hub", "error");
      setHub(emptyHub);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);

  if (loading) return <Loader label="Loading procurement dashboard..." />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader subtitle="Purchase spend, vendor performance, pending orders, and procurement alerts." />

      <div className="ui-grid-kpi">
        <KpiCard label="Purchase Spend" value={formatInr(hub.purchase_spend)} icon={IndianRupee} color="bg-[var(--color-primary)]" />
        <KpiCard label="Pending Approvals" value={hub.pending_approvals} icon={ShoppingCart} color="bg-amber-500" />
        <KpiCard label="Open Request for Quotation (RFQ)s" value={hub.open_rfqs} icon={ShoppingCart} color="bg-indigo-600" />
        <KpiCard label="Active Vendors" value={hub.active_vendors} icon={Users} color="bg-teal-600" />
        <KpiCard label="Outstanding Bills" value={formatInr(hub.outstanding_bills)} icon={IndianRupee} color="bg-red-500" />
        <KpiCard label="Today's Deliveries" value={hub.todays_deliveries} icon={Truck} color="bg-green-600" />
      </div>

      <div className="ui-toolbar ui-card px-4 py-3 text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)]">
        {PROCUREMENT_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 ring-1 ring-[var(--color-border)]">{s}</span>
            {i < PROCUREMENT_FLOW.length - 1 && <span className="text-[var(--color-text-faint)]">↓</span>}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ui-card p-5">
          <h2 className="ui-section-title mb-4">Top Vendors</h2>
          <ul className="space-y-2">
            {(hub.top_vendors || []).map((v) => (
              <li key={v.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{v.name}</span>
                <span className="text-amber-500">★ {v.rating}</span>
              </li>
            ))}
          </ul>
          <Link to="/procurement/vendors" className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline">View all vendors →</Link>
        </div>

        <div className="ui-card p-5">
          <h2 className="ui-section-title mb-4">Pending Orders</h2>
          <ul className="space-y-2">
            {(hub.pending_orders || []).map((o) => (
              <li key={o.po_number} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span><span className="font-medium text-[var(--color-primary)]">{o.po_number}</span> · {o.vendor}</span>
                <span className="font-semibold">{formatInr(o.amount)}</span>
              </li>
            ))}
          </ul>
          <Link to="/procurement/purchase-orders" className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline">View all POs →</Link>
        </div>
      </div>

      <div className="ui-card p-5">
        <h2 className="ui-section-title mb-4">Alerts</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(hub.alerts || []).map((a, i) => {
            const Icon = alertIcons[a.type] || AlertTriangle;
            return (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">{a.message}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/procurement/material-requests" label="Material Requests" />
        <QuickLink to="/procurement/rfq" label="Request for Quotation (RFQ)" />
        <QuickLink to="/procurement/purchase-orders" label="Purchase Orders" />
        <QuickLink to="/procurement/goods-receipt" label="Goods Receipt Note (GRN)" />
        <QuickLink to="/procurement/vendor-bills" label="Vendor Bills" />
        <QuickLink to="/procurement/vendors" label="Vendors" />
        <QuickLink to="/inventory/raw-materials" label="Raw Materials" />
        <QuickLink to="/inventory/stock-ledger" label="Stock Ledger" />
      </div>
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link to={to} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-[#2563EB] hover:text-[var(--color-primary)]">
      {label} →
    </Link>
  );
}

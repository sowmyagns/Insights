import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, IndianRupee, ShoppingCart, Truck, Users } from "lucide-react";

import Loader from "../../components/common/Loader";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import { getSalesHub } from "../../api/salesApi";
import { SALES_FLOW, formatInr } from "../../data/salesMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="ui-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[var(--color-text)]">{value ?? 0}</p>
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

const alertIcons = { overdue_payment: IndianRupee, pending_dispatch: Truck, low_stock: AlertTriangle, expiring_quote: AlertTriangle };
const emptyHub = {
  monthly_revenue: 0,
  total_orders: 0,
  pending_orders: 0,
  new_customers: 0,
  dispatch_pending: 0,
  outstanding_payments: 0,
  top_customers: [],
  alerts: [],
};

export default function SalesDashboard() {
  const [loading, setLoading] = useState(true);
  const [hub, setHub] = useState(emptyHub);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await getSalesHub();
      if (res.data) setHub({ ...emptyHub, ...res.data });
      else throw new Error("empty");
    } catch (err) {
      if (isRefresh) throw err;
      // Build KPIs from localStorage so dashboard isn't all zeros on first load only
      const orders = JSON.parse(localStorage.getItem("smrt_sales_orders") || "[]");
      const customers = JSON.parse(localStorage.getItem("smrt_customers") || "[]");
      const invoices = [
        ...JSON.parse(localStorage.getItem("smrt_invoices") || "[]"),
        ...JSON.parse(localStorage.getItem("smrt_sales_bills") || "[]"),
      ];
      const revenue = invoices.reduce((s, i) => s + (Number(i.grand_total ?? i.amount) || 0), 0);
      const pending = orders.filter((o) => ["pending", "draft"].includes(String(o.status || "").toLowerCase())).length;
      setHub({
        ...emptyHub,
        total_orders: orders.length,
        pending_orders: pending,
        new_customers: customers.length,
        monthly_revenue: revenue,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(() => load(true));

  if (loading) return <Loader label="Loading sales dashboard..." />;

  return (
    <div className="space-y-5 pb-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ui-eyebrow">Sales</p>
          <h2 className="mt-0.5 ui-title">Sales Dashboard</h2>
          <p className="ui-subtitle">Revenue, orders, dispatch, payments, and sales executive performance.</p>
        </div>
      </header>

      <ManufacturingWorkflowBar currentStepId="dashboard" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Monthly Revenue" value={formatInr(hub.monthly_revenue)} icon={IndianRupee} color="bg-teal-700" />
        <KpiCard label="Total Orders" value={hub.total_orders} icon={ShoppingCart} color="bg-indigo-600" />
        <KpiCard label="Pending Orders" value={hub.pending_orders} icon={ShoppingCart} color="bg-amber-500" />
        <KpiCard label="Dispatch Pending" value={hub.dispatch_pending} icon={Truck} color="bg-cyan-600" />
        <KpiCard label="Outstanding Payments" value={formatInr(hub.outstanding_payments)} icon={IndianRupee} color="bg-rose-600" />
        <KpiCard label="New Customers" value={hub.new_customers} icon={Users} color="bg-emerald-600" />
      </div>

      <div className="flex flex-wrap items-center gap-1 ui-card px-4 py-3 text-[10px] font-medium text-slate-600 sm:text-xs">
        {SALES_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-slate-50 px-1.5 py-0.5 ring-1 ring-slate-200/80">{s}</span>
            {i < SALES_FLOW.length - 1 && <span className="text-slate-400">↓</span>}
          </span>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="ui-card p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Top Customers</h2>
          <ul className="space-y-2">
            {(hub.top_customers || []).map((c) => (
              <li key={c.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-slate-500">{c.orders} orders</span>
              </li>
            ))}
          </ul>
          <Link to="/sales/customers" className="mt-3 inline-block text-sm font-semibold text-teal-800 hover:underline">
            View all customers →
          </Link>
        </div>

        <div className="ui-card p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Sales Executive Performance</h2>
          <ul className="space-y-2">
            {(hub.sales_executive_performance || []).map((e) => (
              <li key={e.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{e.name}</span>
                <span>
                  <span className="font-semibold text-teal-800">{formatInr(e.revenue)}</span> · {e.orders} orders
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="ui-card p-5">
        <h2 className="mb-4 text-sm font-bold text-slate-900">Notifications</h2>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/sales/leads" label="Leads" />
        <QuickLink to="/sales/quotations" label="Quotations" />
        <QuickLink to="/sales/orders" label="Sales Orders" />
        <QuickLink to="/sales/dispatch" label="Dispatch" />
        <QuickLink to="/sales/invoices" label="Invoices" />
        <QuickLink to="/sales/payments" label="Payments" />
        <QuickLink to="/inventory/finished-goods" label="Finished Goods" />
        <QuickLink to="/production" label="Production" />
      </div>
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link
      to={to}
      className="ui-card px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
    >
      {label} →
    </Link>
  );
}

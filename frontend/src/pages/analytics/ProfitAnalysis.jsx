import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import KpiCard from "../../components/common/KpiCard";
import { useToast } from "../../context/ToastContext";
import { getProfitAnalysis } from "../../api/analyticsApi";

const fmt = (n) => `₹${Number(n || 0).toLocaleString()}`;

export default function ProfitAnalysis() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getProfitAnalysis();
        if (active) setData(res.data || null);
      } catch (err) {
        if (active) addToast(err.response?.data?.detail || "Failed to load profit analysis", "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [addToast]);

  if (loading) return <Loader label="Loading profit analysis..." />;
  if (!data) return <EmptyState icon="chart" title="No data" description="Profit analysis is unavailable." />;

  const hasData = data.total_revenue > 0 || data.total_expense > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit Analysis"
        subtitle={`Revenue, cost, and margin for ${data.year}.`}
      />

      <div className="ui-grid-kpi">
        <KpiCard label="Revenue" value={fmt(data.total_revenue)} tone="success" />
        <KpiCard label="Expenses" value={fmt(data.total_expense)} tone="danger" />
        <KpiCard label="Net Profit" value={fmt(data.total_profit)} tone="primary" />
        <KpiCard label="Margin" value={`${data.overall_margin_percent}%`} tone="info" />
      </div>

      <div className="ui-card p-6">
        <h3 className="ui-section-title mb-4">Monthly Revenue vs Expense vs Profit</h3>
        {hasData ? (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} name="Expense" />
              <Line type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={2} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon="chart" title="No financial data" description="Record income and expenses to see profit trends." />
        )}
      </div>
    </div>
  );
}

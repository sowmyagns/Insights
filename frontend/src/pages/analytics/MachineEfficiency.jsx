import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
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
import { getMachineEfficiency } from "../../api/analyticsApi";

const STATUS_COLORS = { running: "#16a34a", idle: "#f59e0b", down: "#dc2626" };

export default function MachineEfficiency() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getMachineEfficiency();
        if (active) setData(res.data || null);
      } catch (err) {
        if (active) addToast(err.response?.data?.detail || "Failed to load efficiency", "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [addToast]);

  if (loading) return <Loader label="Loading machine efficiency..." />;
  if (!data) return <EmptyState icon="cpu" title="No data" description="Machine efficiency data is unavailable." />;

  const statusData = [
    { name: "Running", value: data.running, key: "running" },
    { name: "Idle", value: data.idle, key: "idle" },
    { name: "Down", value: data.down, key: "down" },
  ].filter((s) => s.value > 0);

  const byMachine = (data.by_machine || []).map((m) => ({
    name: `M-${m.machine_id}`,
    efficiency: m.efficiency,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Machine Efficiency"
        subtitle="Availability and output efficiency across your machines."
      />

      <div className="ui-grid-kpi">
        <KpiCard label="Overall Efficiency" value={`${data.overall_percent}%`} tone="primary" />
        <KpiCard label="Total Machines" value={data.total_machines} tone="neutral" />
        <KpiCard label="Running" value={data.running} tone="success" />
        <KpiCard label="Down" value={data.down} tone="danger" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="ui-card p-6">
          <h3 className="ui-section-title mb-4">Status Breakdown</h3>
          {statusData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={110} label>
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="cpu" title="No machines" description="Add machines to see status." />
          )}
        </div>

        <div className="ui-card p-6">
          <h3 className="ui-section-title mb-4">Efficiency by Machine (30d)</h3>
          {byMachine.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byMachine}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="efficiency" fill="#0d9488" radius={[6, 6, 0, 0]} name="Efficiency %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="chart" title="No output data" description="Daily reports drive per-machine efficiency." />
          )}
        </div>
      </div>
    </div>
  );
}

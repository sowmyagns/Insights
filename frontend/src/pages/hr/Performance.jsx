import { useEffect, useState, useCallback } from "react";
import { Award, BarChart2, CheckCircle2, Plus, X, Save } from "lucide-react";

import Loader from "../../components/common/Loader";
import Table from "../../components/common/Table";
import { getPerformanceReviews, getEmployees, createPerformanceReview } from "../../api/hrApi";
import useTenantId from "../../hooks/useTenantId";
import usePageRefresh from "../../hooks/usePageRefresh";
import { useToast } from "../../context/ToastContext";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all";

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">{label}</p>
          <p className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 tabular-nums">{value}</p>
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${color}`}>
            <Icon className="h-5.5 w-5.5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Performance() {
  const tenantId = useTenantId();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    tenant_id: tenantId,
    employee_id: "",
    review_period: "",
    rating: "",
    productivity_score: "",
    goals_achieved: "",
    goals_total: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [revRes, empRes] = await Promise.all([
        getPerformanceReviews(tenantId),
        getEmployees(tenantId),
      ]);
      setReviews([...(revRes.data || [])]);
      setEmployees([...(empRes.data || [])]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    await loadData();
  };

  usePageRefresh(handleRefresh);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.review_period) {
      setError("Please fill all required fields.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createPerformanceReview({
        ...form,
        employee_id: Number(form.employee_id),
        rating: form.rating ? Number(form.rating) : null,
        productivity_score: form.productivity_score ? Number(form.productivity_score) : null,
        goals_achieved: form.goals_achieved ? Number(form.goals_achieved) : null,
        goals_total: form.goals_total ? Number(form.goals_total) : null,
      });
      addToast("Performance review created successfully", "success");
      setShowCreateModal(false);
      setForm({
        tenant_id: tenantId,
        employee_id: "",
        review_period: "",
        rating: "",
        productivity_score: "",
        goals_achieved: "",
        goals_total: "",
        notes: "",
      });
      loadData();
    } catch (err) {
      setError("Failed to create performance review.");
      addToast("Failed to create review", "error");
    } finally {
      setSaving(false);
    }
  };

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / totalReviews).toFixed(1) + " / 5" : "0 / 5";
  const avgProd = totalReviews > 0 ? (reviews.reduce((acc, r) => acc + Number(r.productivity_score || 0), 0) / totalReviews).toFixed(1) + "%" : "0%";

  if (loading && reviews.length === 0) return <Loader label="Loading performance reviews..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ui-subtitle">Monitor employee review periods, rating logs, goals achieved, and manager feedback.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="ui-btn-hr"
          >
            <Plus className="h-4 w-4" /> Create Review
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total Reviews" value={totalReviews} icon={Award} color="bg-blue-600" />
        <KpiCard label="Avg Rating" value={avgRating} icon={CheckCircle2} color="bg-[#2563EB]" />
        <KpiCard label="Avg Productivity" value={avgProd} icon={BarChart2} color="bg-indigo-600" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Table
          columns={[
            {
              key: "employee_id",
              label: "Employee",
              render: (r) => {
                const e = employees.find((x) => x.id === r.employee_id);
                return <span className="font-semibold text-slate-800">{e?.full_name ?? r.employee_id}</span>;
              },
            },
            { key: "review_period", label: "Period" },
            { key: "rating", label: "Rating" },
            { key: "productivity_score", label: "Productivity" },
            {
              key: "goals",
              label: "Goals",
              render: (r) =>
                r.goals_achieved != null && r.goals_total != null
                  ? `${r.goals_achieved}/${r.goals_total}`
                  : "-",
            },
            { key: "notes", label: "Notes" },
          ]}
          data={reviews}
        />
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-sans">Create Performance Review</h3>
                <p className="text-xs text-slate-500 mt-0.5">Submit manager evaluation and productivity score.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Employee *</label>
                <select
                  value={form.employee_id}
                  onChange={(e) => handleFormChange("employee_id", e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Review Period *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q1 2026"
                  value={form.review_period}
                  onChange={(e) => handleFormChange("review_period", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Rating (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={form.rating}
                    onChange={(e) => handleFormChange("rating", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Productivity (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.productivity_score}
                    onChange={(e) => handleFormChange("productivity_score", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Goals Achieved</label>
                  <input
                    type="number"
                    value={form.goals_achieved}
                    onChange={(e) => handleFormChange("goals_achieved", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Goals Total</label>
                  <input
                    type="number"
                    value={form.goals_total}
                    onChange={(e) => handleFormChange("goals_total", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  rows={3}
                  placeholder="Review comments..."
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="ui-btn-hr"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
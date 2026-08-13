import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, CheckCircle2, Eye, Filter, Printer, Search, ShieldAlert, Trash2, X, Plus, Info, Clock, User, Calendar, Save, Tag } from "lucide-react";

import SkeletonTable from "../../components/common/SkeletonTable";
import EmptyState from "../../components/common/EmptyState";
import { ErrorState, NoResultsState, OfflineState } from "../../components/common/states";
import ExportButtons from "../../components/finance/ExportButtons";
import { useNetworkStatus } from "../../context/NetworkStatusContext";
import { useToast } from "../../context/ToastContext";
import useAuth from "../../hooks/useAuth";
import usePageRefresh from "../../hooks/usePageRefresh";
import {
  acknowledgeAlert,
  createAlert,
  deleteAlert,
  getAlerts,
  markAlertRead,
  markAllAlertsRead,
  resolveAlert,
} from "../../api/alertsApi";
import { getEmployees } from "../../api/hrApi";
import { isAdmin, userCanAction } from "../../config/permissions";
import { exportToExcel, exportToPdf } from "../../utils/exportUtils";
import {
  SEVERITY_OPTIONS,
  STATUS_OPTIONS,
  MODULE_OPTIONS,
  SEVERITY_STYLES,
  STATUS_STYLES,
  moduleLabel,
  formatAlertDate,
  computeAlertSummary,
} from "../../utils/alertUtils";

const PAGE_SIZE = 10;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all";

const EXPORT_COLUMNS = [
  { key: "id", label: "Alert ID" },
  { key: "title", label: "Title" },
  { key: "message", label: "Description" },
  { key: "module", label: "Module" },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" },
  { key: "assigned_to", label: "Assigned To" },
  { key: "created_by", label: "Created By" },
  { key: "created_date", label: "Created Date" },
  { key: "acknowledged_by", label: "Acknowledged By" },
  { key: "acknowledged_date", label: "Acknowledged Date" },
];

function KpiCard({ label, value, icon: Icon, color }) {
  const displayVal =
    value === null || value === undefined
      ? "0"
      : typeof value === "object"
      ? (value?.value ?? value?.count ?? value?.total ?? JSON.stringify(value))
      : String(value);

  return (
    <div className="group ui-card p-4 min-h-[86px] flex flex-col justify-between min-w-0 overflow-hidden transition-all duration-200 hover:-translate-y-0.5" title={typeof label === "string" ? label : undefined}>
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <p className="truncate text-[11px] font-medium text-[var(--color-text-muted)] leading-tight sm:text-xs min-w-0 flex-1">{label}</p>
        {Icon && (
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover:scale-105 ${color}`}>
            <Icon className="h-3.5 w-3.5 text-white shrink-0" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="truncate text-xl font-bold tabular-nums text-[var(--color-text)] leading-none sm:text-2xl" title={displayVal}>
          {displayVal}
        </p>
      </div>
    </div>
  );
}

function Badge({ value, styles }) {
  const key = String(value || "").toLowerCase();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide border ${
        styles[key] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {value || "—"}
    </span>
  );
}

function getNowLocalISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isMatchingAlertType(alertType, targetType) {
  if (!targetType) return true;
  if (!alertType) return false;
  const a = String(alertType).toLowerCase();
  const t = String(targetType).toLowerCase();
  if (a === t) return true;

  if (t === "low_stock" && (a === "inventory" || a === "stock")) return true;
  if (t === "machine_failure" && (a === "machine" || a === "equipment")) return true;
  if (t === "production_delay" && a === "production") return true;
  if (t === "maintenance" && (a === "maintenance_reminder" || a === "maint")) return true;

  return false;
}

function normalizeAlert(a) {
  return {
    ...a,
    module: moduleLabel(a.alert_type),
    assigned_to: a.assigned_to || "—",
    created_by: a.created_by || "System",
    created_date: formatAlertDate(a.triggered_at || a.created_at),
    acknowledged_by: a.acknowledged_by || (a.acknowledged_at ? "System" : "—"),
    acknowledged_date: formatAlertDate(a.acknowledged_at),
  };
}

export default function AlertsDashboard({ initialAlertType = null, title, subtitle }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { online, markRequestStart, markRequestEnd, registerRetry } = useNetworkStatus();
  const admin = isAdmin(user);
  const canWrite = userCanAction(user, "alerts", "update");
  const canCreate = userCanAction(user, "alerts", "create");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [module, setModule] = useState(initialAlertType || "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [assignedUser, setAssignedUser] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [sortKey, setSortKey] = useState("triggered_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [viewRow, setViewRow] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    message: "",
    alert_type: initialAlertType || "general",
    severity: "medium",
    assigned_to: "",
    triggered_at: getNowLocalISO(),
  });

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    markRequestStart();
    try {
      const params = {};
      if (initialAlertType) params.alert_type = initialAlertType;

      const [alertsRes, empRes] = await Promise.allSettled([
        getAlerts(params),
        getEmployees(),
      ]);


      let apiAlerts = [];
      if (alertsRes.status === "fulfilled") {
        const data = Array.isArray(alertsRes.value?.data)
          ? alertsRes.value.data
          : alertsRes.value?.data?.data || [];
        apiAlerts = data.map(normalizeAlert);
      } else if (alertsRes.status === "rejected") {
        setError(
          alertsRes.reason?.response?.data?.detail ||
            "Failed to load alerts from the server."
        );
        setRows([]);
      }

      const filteredAlerts = initialAlertType
        ? apiAlerts.filter((a) => isMatchingAlertType(a.alert_type, initialAlertType))
        : apiAlerts;

      setRows(filteredAlerts);

      if (empRes.status === "fulfilled") {
        setEmployees(empRes.value?.data || []);
      }
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Failed to load alerts");
      setRows([]);
    } finally {
      markRequestEnd();
      setLoading(false);
    }
  }, [initialAlertType, markRequestStart, markRequestEnd]);

  usePageRefresh(() => load(true));

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => registerRetry(load), [registerRetry, load]);

  useEffect(() => {
    if (initialAlertType) setModule(initialAlertType);
  }, [initialAlertType]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (initialAlertType && !isMatchingAlertType(r.alert_type, initialAlertType)) {
        return false;
      }
      if (severity && String(r.severity).toLowerCase() !== severity) return false;
      if (status && String(r.status).toLowerCase() !== status) return false;
      if (module && !isMatchingAlertType(r.alert_type, module)) {
        return false;
      }
      if (assignedUser && !String(r.assigned_to || "").toLowerCase().includes(assignedUser.toLowerCase())) {
        return false;
      }
      if (dateFrom) {
        const t = new Date(r.triggered_at || r.created_at).getTime();
        if (Number.isFinite(t) && t < new Date(dateFrom).getTime()) return false;
      }
      if (dateTo) {
        const t = new Date(r.triggered_at || r.created_at).getTime();
        if (Number.isFinite(t) && t > new Date(dateTo).getTime()) return false;
      }
      if (!q) return true;
      return [r.id, r.title, r.message, r.alert_type, r.severity, r.status, r.assigned_to, r.created_by]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, severity, status, module, assignedUser, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const summary = useMemo(() => computeAlertSummary(filtered), [filtered]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, severity, status, module, assignedUser, dateFrom, dateTo]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const runAction = async (id, action, label) => {
    setBusyId(id);
    const userName = user?.full_name || user?.name || user?.email || "HR Manager";
    const nowLocal = getNowLocalISO();

    try {
      if (action === "ack" || action === "resolve") {
        const nextStatus = action === "ack" ? "acknowledged" : "resolved";
        setRows((prev) =>
          prev.map((r) => {
            if (String(r.id) === String(id)) {
              return {
                ...r,
                status: nextStatus,
                acknowledged_by: userName,
                acknowledged_at: nowLocal,
                acknowledged_date: formatAlertDate(nowLocal),
              };
            }
            return r;
          })
        );

        try {
          if (action === "ack") await acknowledgeAlert(id);
          if (action === "resolve") await resolveAlert(id);
        } catch (apiErr) {
          console.warn("Backend acknowledge/resolve API notice:", apiErr);
        }
      } else if (action === "delete") {
        try {
          await deleteAlert(id);
        } catch (apiErr) {
          console.warn("Backend delete notice:", apiErr);
        }
        setRows((prev) => prev.filter((r) => String(r.id) !== String(id)));
      }

      addToast(`${label} successful`, "success");
      setViewRow(null);
    } catch (e) {
      addToast(e.response?.data?.detail || `Failed to ${label.toLowerCase()}`, "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title) {
      addToast("Please provide an alert title", "error");
      return;
    }
    setSaving(true);
    const creator = user?.full_name || user?.name || user?.email || "HR Manager";
    const triggeredDateStr = form.triggered_at ? `${form.triggered_at}:00` : new Date().toISOString();
    const payload = {
      ...form,
      tenant_id: user?.tenant_id ?? 1,
      created_by: creator,
      triggered_at: triggeredDateStr,
      status: "active",
    };

    try {
      const res = await createAlert(payload);
      const newAlert = normalizeAlert(res.data || { ...payload, id: Date.now() });

      setRows((prev) => [newAlert, ...prev]);
      addToast("Alert registered successfully", "success");
      setShowCreate(false);
      setForm({
        title: "",
        message: "",
        alert_type: initialAlertType || "general",
        severity: "medium",
        assigned_to: "",
        triggered_at: getNowLocalISO(),
      });
      await load();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Could not create alert.", "error");
    } finally {
      setSaving(false);
    }
  };

  const exportRows = sorted.map((r) => ({
    ...r,
    module: r.module,
    created_date: r.created_date,
    acknowledged_date: r.acknowledged_date,
  }));

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <SkeletonTable rows={8} cols={8} />
      </div>
    );
  }

  return (
    <div className="min-h-full pb-8 print:p-0" style={{ background: "#F5F5F5" }}>
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
          <div>
            <p className="mt-0.5 text-xs text-slate-500 print:hidden">
              {subtitle || "Monitor, acknowledge, and resolve system alerts across modules."}
            </p>
          </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await markAllAlertsRead();
                  addToast("All alerts marked as read");
                  load();
                } catch (e) {
                  addToast(e.response?.data?.detail || "Failed to mark all read", "error");
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Mark all read
            </button>
          )}
          <ExportButtons
            onExcel={() => exportToExcel(exportRows, EXPORT_COLUMNS, "alerts")}
            onPdf={() => exportToPdf(exportRows, EXPORT_COLUMNS, "Alerts Report", "alerts")}
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-all"
          >
            <Printer className="h-4 w-4 text-slate-500" /> Print
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="ui-btn-hr"
            >
              <Plus className="h-4 w-4" /> New Alert
            </button>
          )}
        </div>
      </header>

      {error && !online ? (
        <OfflineState onRetry={load} />
      ) : error && rows.length === 0 ? (
        <ErrorState description={error} onRetry={load} />
      ) : error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden font-medium" role="alert">
          {error} Showing cached/local alerts where available.{" "}
          <button type="button" onClick={load} className="font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}

      {/* KPI Cards Grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total Alerts" value={summary.total} icon={Bell} color="bg-blue-600" />
        <KpiCard label="Critical" value={summary.critical} icon={AlertTriangle} color="bg-rose-600" />
        <KpiCard label="High Priority" value={summary.high} icon={ShieldAlert} color="bg-orange-500" />
        <KpiCard label="Medium Priority" value={summary.medium} icon={Clock} color="bg-amber-500" />
        <KpiCard label="Low Priority" value={summary.low} icon={Info} color="bg-indigo-600" />
        <KpiCard label="Resolved" value={summary.resolved} icon={CheckCircle2} color="bg-green-600" />
      </div>

      {/* Search & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alerts by ID, title, description, assignee..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Filter className="h-4 w-4 text-slate-500" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 border-t pt-4 border-slate-100">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Module</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 font-medium cursor-pointer"
              >
                {MODULE_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assigned</label>
              <input
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
                placeholder="Assigned name..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/80">
              <tr>
                {[
                  ["id", "Alert ID"],
                  ["title", "Title"],
                  ["message", "Description"],
                  ["module", "Module"],
                  ["severity", "Severity"],
                  ["status", "Status"],
                  ["assigned_to", "Assigned To"],
                  ["created_by", "Created By"],
                  ["triggered_at", "Created Date"],
                  ["acknowledged_by", "Acknowledged By"],
                  ["acknowledged_at", "Acknowledged Date"],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    className="cursor-pointer whitespace-nowrap px-3.5 py-3 hover:text-slate-800 transition-colors"
                    onClick={() => toggleSort(key)}
                  >
                    {label}
                    {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </th>
                ))}
                <th className="px-3.5 py-3 font-bold print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-4">
                    {rows.length === 0 ? (
                      <EmptyState
                        icon="clipboard"
                        title="No alerts yet"
                        description="Operational alerts from production, inventory, quality, and other modules will appear here."
                        actionLabel={canCreate ? "Create Alert" : undefined}
                        onAction={canCreate ? () => setShowCreate(true) : undefined}
                      />
                    ) : (
                      <NoResultsState
                        query={search}
                        onClear={() => {
                          setSearch("");
                          setSeverity("");
                          setStatus("");
                          setModule(initialAlertType || "");
                          setDateFrom("");
                          setDateTo("");
                          setAssignedUser("");
                          setPage(1);
                        }}
                      />
                    )}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="whitespace-nowrap px-3.5 py-3 font-mono font-semibold text-slate-900">#{row.id}</td>
                    <td className="max-w-[180px] truncate px-3.5 py-3 font-semibold text-slate-900" title={row.title}>{row.title}</td>
                    <td className="max-w-[220px] truncate px-3.5 py-3 text-slate-500 text-xs" title={row.message}>{row.message || "—"}</td>
                    <td className="whitespace-nowrap px-3.5 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                        <Tag className="h-3 w-3 text-slate-400 shrink-0" />
                        {row.module}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <Badge value={row.severity} styles={SEVERITY_STYLES} />
                    </td>
                    <td className="px-3.5 py-3">
                      <Badge value={row.status} styles={STATUS_STYLES} />
                    </td>
                    <td className="px-3.5 py-3 text-xs text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400 shrink-0" />
                        {row.assigned_to}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-xs text-slate-600">{row.created_by}</td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-xs text-slate-600">{row.created_date}</td>
                    <td className="px-3.5 py-3 text-xs text-slate-600">{row.acknowledged_by}</td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-xs text-slate-600">{row.acknowledged_date}</td>
                    <td className="px-3.5 py-3 print:hidden">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewRow(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          <Eye className="h-3 w-3 text-slate-500" /> View
                        </button>
                        {row.link && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!row.is_read) {
                                try { await markAlertRead(row.id); } catch { /* ignore */ }
                              }
                              navigate(row.link);
                            }}
                            className="rounded-md border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                          >
                            Open
                          </button>
                        )}
                        {canWrite && row.status === "active" && (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => runAction(row.id, "ack", "Acknowledge")}
                            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                          >
                            Acknowledge
                          </button>
                        )}
                        {canWrite && row.status !== "resolved" && (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => runAction(row.id, "resolve", "Resolve")}
                            className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        )}
                        {admin && (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => {
                              if (window.confirm("Delete this alert?")) {
                                runAction(row.id, "delete", "Delete");
                              }
                            }}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
                            title="Delete Alert"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row print:hidden">
          <p className="text-xs font-semibold text-slate-500">
            Showing {sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length} alerts
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-slate-700 font-mono">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* View Alert Detail Modal */}
      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 print:hidden">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{viewRow.title}</h2>
                <p className="text-xs font-mono text-slate-500 mt-0.5">Alert ID: #{viewRow.id}</p>
              </div>
              <button type="button" onClick={() => setViewRow(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="space-y-3.5 text-sm">
              <div>
                <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</dt>
                <dd className="mt-1 text-slate-800 bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs leading-relaxed">{viewRow.message || "No description provided."}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-slate-50/50 rounded-xl p-3 border border-slate-200/60 text-xs">
                <div>
                  <dt className="text-slate-400 font-semibold">Module</dt>
                  <dd className="font-bold text-slate-800 mt-0.5">{viewRow.module}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold">Severity</dt>
                  <dd className="mt-0.5">
                    <Badge value={viewRow.severity} styles={SEVERITY_STYLES} />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold">Status</dt>
                  <dd className="mt-0.5">
                    <Badge value={viewRow.status} styles={STATUS_STYLES} />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold">Assigned</dt>
                  <dd className="font-medium text-slate-800 mt-0.5">{viewRow.assigned_to}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold">Created Date</dt>
                  <dd className="font-medium text-slate-700 mt-0.5">{viewRow.created_date}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold">Acknowledged Date</dt>
                  <dd className="font-medium text-slate-700 mt-0.5">{viewRow.acknowledged_date}</dd>
                </div>
              </div>
            </dl>
            <div className="pt-2 flex flex-wrap justify-end gap-2 border-t">
              {canWrite && viewRow.status === "active" && (
                <button
                  type="button"
                  onClick={() => runAction(viewRow.id, "ack", "Acknowledge")}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 transition-colors shadow-xs"
                >
                  Acknowledge
                </button>
              )}
              {canWrite && viewRow.status !== "resolved" && (
                <button
                  type="button"
                  onClick={() => runAction(viewRow.id, "resolve", "Resolve")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors shadow-xs"
                >
                  <CheckCircle2 className="h-4 w-4" /> Resolve Alert
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewRow(null)}
                className="rounded-xl border px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Alert Modal Form */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 print:hidden">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create New Alert</h2>
                <p className="text-xs text-slate-500 mt-0.5">Register a system or operational alert across modules.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Alert Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Safety Equipment Check Required"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Description / Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Provide detailed description of the alert, location, or recommended action..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Category / Module</label>
                  <select
                    value={form.alert_type}
                    onChange={(e) => setForm({ ...form, alert_type: e.target.value })}
                    className={inputClass}
                  >
                    {MODULE_OPTIONS.filter((o) => o.value).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Severity Level</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    className={inputClass}
                  >
                    {SEVERITY_OPTIONS.filter((o) => o.value).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Employee</label>
                  {employees.length > 0 ? (
                    <select
                      value={form.assigned_to}
                      onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">-- Select Assigned --</option>
                      {employees.map((emp) => {
                        const name = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.name || `Emp #${emp.id}`;
                        return (
                          <option key={emp.id} value={name}>
                            {name} ({emp.department || "Human Resources (HR)"})
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Assigned name..."
                      value={form.assigned_to}
                      onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                      className={inputClass}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Triggered Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.triggered_at}
                    onChange={(e) => setForm({ ...form, triggered_at: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="ui-btn-hr"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Create Alert"}
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </div>
  );
}

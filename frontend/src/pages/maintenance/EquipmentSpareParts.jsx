import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import usePageRefresh from "../../hooks/usePageRefresh";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cog,
  Eye,
  MoreVertical,
  Package,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Wrench,
} from "lucide-react";

import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import MaintenanceErrorState from "../../components/maintenance/MaintenanceErrorState";
import MaintenanceKpiCard from "../../components/maintenance/MaintenanceKpiCard";
import { getMaintenanceHub } from "../../api/maintenanceApi";
import { getMachines } from "../../api/productionApi";
import {
  computeMonthTrend,
  equipmentStatusBadgeClass,
  equipmentStatusLabel,
  formatInr,
  pctOfTotal,
} from "../../data/maintenanceMasterData";

const PAGE_SIZE = 5;

const filterSelectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

function normalizeMachineStatus(status) {
  const s = String(status || "idle").toLowerCase();
  if (s === "under_maintenance") return "maintenance";
  if (s === "down" || s === "fault") return "breakdown";
  return s;
}

function spareStockBadge(stock, min) {
  const low = Number(stock) <= Number(min);
  if (low) return "bg-[var(--kpi-orange-soft)] text-[var(--kpi-orange)]";
  return "bg-[var(--kpi-success-soft)] text-[var(--kpi-success)]";
}

export default function EquipmentSpareParts() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [machines, setMachines] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [activeTab, setActiveTab] = useState("equipment");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [mRes, hubRes] = await Promise.allSettled([getMachines(), getMaintenanceHub()]);
      if (mRes.status === "fulfilled") {
        setMachines(Array.isArray(mRes.value?.data) ? mRes.value.data : []);
      } else {
        setMachines([]);
      }
      if (hubRes.status === "fulfilled" && hubRes.value?.data) {
        setSpareParts(hubRes.value.data.spare_parts || []);
      } else {
        setSpareParts([]);
      }
      if (mRes.status === "rejected" && hubRes.status === "rejected") {
        throw new Error("Network error");
      }
    } catch (e) {
      setError(e.message || "Failed to load equipment data");
      setMachines([]);
      setSpareParts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  usePageRefresh(() => load(true));
  useEffect(() => { load(); }, [load]);

  const totalEquipment = machines.length;
  const running = machines.filter((m) => normalizeMachineStatus(m.display_status || m.status) === "running").length;
  const underMaint = machines.filter((m) => normalizeMachineStatus(m.display_status || m.status) === "maintenance").length;
  const outOfService = machines.filter((m) => normalizeMachineStatus(m.display_status || m.status) === "breakdown").length;
  const totalSpare = spareParts.length;
  const lowStock = spareParts.filter((p) => p.is_low_stock).length;

  const categories = useMemo(
    () => [...new Set(machines.map((m) => m.machine_type).filter(Boolean))].sort(),
    [machines]
  );
  const locations = useMemo(
    () => [...new Set(machines.map((m) => m.location).filter(Boolean))].sort(),
    [machines]
  );
  const brands = useMemo(
    () => [...new Set(machines.map((m) => m.manufacturer).filter(Boolean))].sort(),
    [machines]
  );

  const filteredEquipment = useMemo(() => {
    const q = search.trim().toLowerCase();
    return machines.filter((m) => {
      const status = normalizeMachineStatus(m.display_status || m.status);
      if (statusFilter && status !== statusFilter) return false;
      if (categoryFilter && m.machine_type !== categoryFilter) return false;
      if (locationFilter && m.location !== locationFilter) return false;
      if (brandFilter && m.manufacturer !== brandFilter) return false;
      if (q && ![m.name, m.code, m.manufacturer, m.location].some((v) => String(v || "").toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [machines, search, statusFilter, categoryFilter, locationFilter, brandFilter]);

  const filteredSpares = useMemo(() => {
    const q = search.trim().toLowerCase();
    return spareParts.filter((p) => {
      if (statusFilter === "low_stock" && !p.is_low_stock) return false;
      if (statusFilter === "in_stock" && p.is_low_stock) return false;
      if (q && ![p.spare_name, p.part_number, p.vendor].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [spareParts, search, statusFilter]);

  const activeRows = activeTab === "equipment" ? filteredEquipment : filteredSpares;
  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE));
  const pageRows = activeRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = activeRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, activeRows.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, activeTab]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCategoryFilter("");
    setLocationFilter("");
    setBrandFilter("");
    setPage(1);
  };

  const equipmentTrend = computeMonthTrend(machines, { dateKey: "created_at" });

  if (loading) return <Loader label="Loading equipment & spare parts..." />;
  if (error && !machines.length && !spareParts.length) {
    return <MaintenanceErrorState message={error} onRetry={load} />;
  }

  return (
    <div className="min-w-0 space-y-5 pb-5">
      <PageHeader
        subtitle="Manage all plant equipment and spare parts inventory"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/masters/products"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)]"
            >
              <Plus className="h-4 w-4" />
              Add Equipment
            </Link>
            <Link
              to="/inventory/raw-materials"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Spare Part
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <MoreVertical className="h-4 w-4" />
              More Actions
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MaintenanceKpiCard label="Total Equipment" value={totalEquipment} icon={Cog} tone="info" trend={equipmentTrend} />
        <MaintenanceKpiCard label="Running" value={running} icon={PlayCircle} tone="success" meta={pctOfTotal(running, totalEquipment)} />
        <MaintenanceKpiCard label="Under Maintenance" value={underMaint} icon={Wrench} tone="orange" meta={pctOfTotal(underMaint, totalEquipment)} />
        <MaintenanceKpiCard label="Out of Service" value={outOfService} icon={PauseCircle} tone="danger" meta={pctOfTotal(outOfService, totalEquipment)} />
        <MaintenanceKpiCard label="Total Spare Parts" value={totalSpare} icon={Package} tone="violet" />
        <MaintenanceKpiCard
          label="Low Stock Items"
          value={lowStock}
          icon={AlertTriangle}
          tone="orange"
          footer={lowStock > 0 ? <Link to="#spare-table" className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline">View details</Link> : null}
        />
      </div>

      <div className="border-b border-slate-200">
        <div className="flex flex-wrap gap-1">
          {[
            { id: "equipment", label: "Equipment" },
            { id: "spare", label: "Spare Parts" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setPage(1); setStatusFilter(""); }}
              className={`border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-3">
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={activeTab === "equipment" ? "Search equipment..." : "Search spare parts..."}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-[13px] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-slate-500">All Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={filterSelectClass}>
              <option value="">All Status</option>
              {activeTab === "equipment" ? (
                <>
                  <option value="running">Running</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="breakdown">Out of Service</option>
                  <option value="idle">Idle</option>
                </>
              ) : (
                <>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                </>
              )}
            </select>
          </div>
          {activeTab === "equipment" ? (
            <>
              <div className="lg:col-span-2">
                <label className="mb-1 block text-[11px] font-medium text-slate-500">All Categories</label>
                <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className={filterSelectClass}>
                  <option value="">All Categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="mb-1 block text-[11px] font-medium text-slate-500">All Locations</label>
                <select value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }} className={filterSelectClass}>
                  <option value="">All Locations</option>
                  {locations.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="lg:col-span-3">
                <label className="mb-1 block text-[11px] font-medium text-slate-500">All Brands</label>
                <select value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }} className={filterSelectClass}>
                  <option value="">All Brands</option>
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => load(true)} className="inline-flex items-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--color-primary-hover)]">
            Filter
          </button>
          <button type="button" onClick={resetFilters} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
            Reset
          </button>
        </div>
      </div>

      <div id={activeTab === "spare" ? "spare-table" : undefined} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-[15px] font-semibold text-slate-900">
          {activeTab === "equipment" ? "Equipment List" : "Spare Parts Inventory"}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          {activeTab === "equipment" ? (
            <table className="min-w-full w-full border-collapse text-left text-[13px]">
              <thead className="bg-[#eef6ff] text-[12px] font-semibold text-slate-700">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-3">Equipment Code</th>
                  <th className="border-b border-slate-200 px-3 py-3">Name</th>
                  <th className="border-b border-slate-200 px-3 py-3">Category</th>
                  <th className="border-b border-slate-200 px-3 py-3">Location</th>
                  <th className="border-b border-slate-200 px-3 py-3">Status</th>
                  <th className="border-b border-slate-200 px-3 py-3">Utilization</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border-b border-slate-100 px-3 py-10 text-center text-slate-500">No equipment found</td>
                  </tr>
                ) : (
                  pageRows.map((row, idx) => {
                    const status = normalizeMachineStatus(row.display_status || row.status);
                    const util = Math.round(Number(row.efficiency_pct ?? row.oee_pct ?? 0));
                    return (
                      <tr key={row.id ?? row.code} className={idx % 2 === 1 ? "bg-slate-50/60 hover:bg-slate-50" : "hover:bg-slate-50/80"}>
                        <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-800">{row.code}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{row.name}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600">{row.machine_type || "—"}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600">{row.location || "—"}</td>
                        <td className="border-b border-slate-100 px-3 py-3">
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${equipmentStatusBadgeClass(status)}`}>
                            {equipmentStatusLabel(status)}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-[var(--kpi-success)]" style={{ width: `${Math.min(100, Math.max(0, util))}%` }} />
                            </div>
                            <span className="tabular-nums text-slate-600">{util}%</span>
                          </div>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3">
                          <div className="flex items-center justify-center">
                            <button type="button" className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="View equipment">
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full w-full border-collapse text-left text-[13px]">
              <thead className="bg-[#eef6ff] text-[12px] font-semibold text-slate-700">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-3">Part No</th>
                  <th className="border-b border-slate-200 px-3 py-3">Name</th>
                  <th className="border-b border-slate-200 px-3 py-3">Stock</th>
                  <th className="border-b border-slate-200 px-3 py-3">Min</th>
                  <th className="border-b border-slate-200 px-3 py-3">Vendor</th>
                  <th className="border-b border-slate-200 px-3 py-3">Cost</th>
                  <th className="border-b border-slate-200 px-3 py-3">Status</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border-b border-slate-100 px-3 py-10 text-center text-slate-500">No spare parts found</td>
                  </tr>
                ) : (
                  pageRows.map((row, idx) => (
                    <tr key={row.id ?? row.part_number} className={idx % 2 === 1 ? "bg-slate-50/60 hover:bg-slate-50" : "hover:bg-slate-50/80"}>
                      <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-800">{row.part_number}</td>
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{row.spare_name}</td>
                      <td className="border-b border-slate-100 px-3 py-3 tabular-nums text-slate-700">{row.stock}</td>
                      <td className="border-b border-slate-100 px-3 py-3 tabular-nums text-slate-600">{row.minimum_stock}</td>
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-600">{row.vendor || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-3 tabular-nums text-slate-700">{formatInr(row.cost)}</td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${spareStockBadge(row.stock, row.minimum_stock)}`}>
                          {row.is_low_stock ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <div className="flex items-center justify-center">
                          <button type="button" className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="View part">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {activeRows.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-slate-500">
              Showing {from} to {to} of {activeRows.length} entries
            </p>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`grid h-8 min-w-[2rem] place-items-center rounded-md px-2 text-[12px] font-semibold ${
                    page === n ? "bg-[var(--color-primary)] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  Eye,
  Filter,
  IndianRupee,
  MapPin,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Warehouse,
} from "lucide-react";
import { Link } from "react-router-dom";

import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import KpiCard from "../../components/common/KpiCard";
import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import WarehouseDetailModal, { WarehouseFormModal } from "../../components/inventory/WarehouseDetailModal";
import { useToast } from "../../context/ToastContext";
import useTenantId from "../../hooks/useTenantId";
import usePageRefresh from "../../hooks/usePageRefresh";
import {
  createWarehouseFull,
  deactivateWarehouse,
  getWarehouseDetail,
  getWarehouses,
  updateWarehouse,
} from "../../api/inventoryApi";
import {
  BRANCHES,
  PLANTS,
  WAREHOUSE_STATUSES,
  WAREHOUSE_TYPES,
  enrichApiWarehouse,
} from "../../data/warehousesMasterData";
import { asArray } from "../../utils/apiError";

const MOCKUP_WAREHOUSES = [
  { id: "wh1", code: "WH-001", name: "Main Warehouse", description: "Central storage for raw materials and FG", city: "Hyderabad", state: "Telangana", country: "India", total_items: 2156, inventory_value: 14580320, utilization_pct: 78, status: "active", is_primary: true, thumb: "#2563eb", live: false },
  { id: "wh2", code: "WH-002", name: "Unit-1 Warehouse", description: "Plant-1 production staging", city: "Hyderabad", state: "Telangana", country: "India", total_items: 842, inventory_value: 4820000, utilization_pct: 65, status: "active", is_primary: false, thumb: "#16a34a", live: false },
  { id: "wh3", code: "WH-003", name: "Unit-2 Warehouse", description: "Plant-2 packing store", city: "Chennai", state: "Tamil Nadu", country: "India", total_items: 610, inventory_value: 3150000, utilization_pct: 58, status: "active", is_primary: false, thumb: "#f59e0b", live: false },
  { id: "wh4", code: "WH-004", name: "FG Store", description: "Finished goods dispatch hub", city: "Pune", state: "Maharashtra", country: "India", total_items: 490, inventory_value: 5280000, utilization_pct: 82, status: "active", is_primary: false, thumb: "#7c3aed", live: false },
  { id: "wh5", code: "WH-005", name: "RM Store", description: "Dedicated raw material store", city: "Bengaluru", state: "Karnataka", country: "India", total_items: 380, inventory_value: 2100000, utilization_pct: 70, status: "active", is_primary: false, thumb: "#0ea5e9", live: false },
  { id: "wh6", code: "WH-006", name: "Transit Hub", description: "In-transit consolidation", city: "Hyderabad", state: "Telangana", country: "India", total_items: 95, inventory_value: 420000, utilization_pct: 35, status: "inactive", is_primary: false, thumb: "#64748b", live: false },
  { id: "wh7", code: "WH-007", name: "Spare Parts Store", description: "Maintenance spare inventory", city: "Chennai", state: "Tamil Nadu", country: "India", total_items: 210, inventory_value: 980000, utilization_pct: 48, status: "active", is_primary: false, thumb: "#14b8a6", live: false },
  { id: "wh8", code: "WH-008", name: "Cold Storage", description: "Temperature-controlled goods", city: "Pune", state: "Maharashtra", country: "India", total_items: 73, inventory_value: 1100280, utilization_pct: 61, status: "active", is_primary: false, thumb: "#ef4444", live: false },
];

const MOCKUP_KPIS = {
  total: 8,
  totalItems: 4856,
  stockValue: 32450600,
  avgUtilization: 72,
  active: 7,
};

function formatInrAmount(value) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
}

function utilizationTone(pct) {
  const n = Number(pct) || 0;
  if (n >= 80) return { bar: "bg-[#ef4444]", text: "text-[#ef4444]" };
  if (n >= 55 && n < 70) return { bar: "bg-[#f59e0b]", text: "text-[#d97706]" };
  return { bar: "bg-[#16a34a]", text: "text-[#16a34a]" };
}

function thumbColor(name = "") {
  const colors = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0ea5e9", "#64748b", "#14b8a6", "#ef4444"];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % colors.length;
  return colors[hash];
}

export default function Warehouses() {
  const tenantId = useTenantId();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [formWarehouse, setFormWarehouse] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [headerDate, setHeaderDate] = useState("2026-08-13");
  const [headerScope, setHeaderScope] = useState("");

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const wRes = await getWarehouses().catch(() => ({ data: [] }));
      const apiRows = asArray(wRes.data);
      setWarehouses(apiRows.map((row, i) => ({ ...enrichApiWarehouse(row, i), live: true })));
    } catch {
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  usePageRefresh(loadWarehouses);
  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  const hasLiveData = warehouses.length > 0;

  const rows = useMemo(() => {
    if (hasLiveData) {
      return warehouses.map((w) => ({
        ...w,
        description: w.description || w.warehouse_type || w.plant || "",
        country: w.country || "India",
        total_items: w.total_items ?? w.item_count ?? 0,
        inventory_value: Number(w.inventory_value ?? w.stock_value ?? 0) || 0,
        utilization_pct:
          w.utilization_pct ??
          (w.capacity ? Math.round(((w.used_capacity || 0) / w.capacity) * 100) : 0),
        thumb: thumbColor(w.name || w.code || ""),
        live: true,
      }));
    }
    return MOCKUP_WAREHOUSES;
  }, [hasLiveData, warehouses]);

  const filtered = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((w) =>
        [w.name, w.code, w.city, w.state, w.branch, w.description].some(
          (v) => v && String(v).toLowerCase().includes(q)
        )
      );
    }
    if (statusFilter) list = list.filter((w) => String(w.status || "").toLowerCase() === statusFilter);
    if (branchFilter) list = list.filter((w) => w.branch === branchFilter || w.city === branchFilter);
    if (headerScope && headerScope !== "all") {
      list = list.filter((w) => String(w.id) === String(headerScope) || w.code === headerScope);
    }
    return list;
  }, [rows, search, statusFilter, branchFilter, headerScope]);

  const kpis = useMemo(() => {
    if (!hasLiveData) return MOCKUP_KPIS;
    const active = filtered.filter((w) => w.status === "active").length;
    const totalItems = filtered.reduce((s, w) => s + Number(w.total_items || 0), 0);
    const stockValue = filtered.reduce((s, w) => s + Number(w.inventory_value || 0), 0);
    const utilValues = filtered.map((w) => Number(w.utilization_pct) || 0).filter((n) => n > 0);
    const avgUtilization = utilValues.length
      ? Math.round(utilValues.reduce((a, b) => a + b, 0) / utilValues.length)
      : 0;
    return {
      total: filtered.length,
      totalItems,
      stockValue,
      avgUtilization,
      active,
    };
  }, [hasLiveData, filtered]);

  const openWarehouse = async (wh) => {
    setSelected(wh);
    setDetail(null);
    if (wh.live && typeof wh.id === "number") {
      try {
        const res = await getWarehouseDetail(wh.id);
        setDetail(res.data);
      } catch {
        /* use list data */
      }
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setBranchFilter("");
    setHeaderScope("");
  };

  const handleSave = async (form) => {
    const usedCap = form.used_capacity !== "" && form.used_capacity != null ? Number(form.used_capacity) : 0;
    const cap = form.capacity !== "" && form.capacity != null ? Number(form.capacity) : null;
    const payload = {
      tenant_id: tenantId,
      name: form.name,
      code: form.code,
      branch: form.branch,
      plant: form.plant,
      warehouse_type: form.warehouse_type,
      state: form.state,
      city: form.city,
      address: form.address,
      manager_name: form.manager_name,
      manager_phone: form.manager_phone,
      capacity: cap,
      used_capacity: usedCap,
      is_primary: form.is_primary,
      status: form.status,
    };
    try {
      if (formWarehouse?.id && typeof formWarehouse.id === "number") {
        await updateWarehouse(formWarehouse.id, payload);
        addToast("Warehouse updated");
        loadWarehouses();
        setFormWarehouse(null);
        return;
      }
      await createWarehouseFull(payload);
      addToast("Warehouse created");
      loadWarehouses();
      setFormWarehouse(null);
      return;
    } catch {
      /* local fallback */
    }

    if (formWarehouse?.id) {
      const used = form.used_capacity ? Number(form.used_capacity) : 0;
      const avail =
        form.available_capacity != null && form.available_capacity !== ""
          ? Number(form.available_capacity)
          : cap
            ? Math.max(0, cap - used)
            : 0;
      setWarehouses((prev) =>
        prev.map((w) => (w.id === formWarehouse.id ? { ...w, ...form, used_capacity: used, available_capacity: avail, live: true } : w))
      );
      addToast("Warehouse updated locally");
    } else {
      const used = form.used_capacity ? Number(form.used_capacity) : 0;
      const avail =
        form.available_capacity != null && form.available_capacity !== ""
          ? Number(form.available_capacity)
          : cap
            ? Math.max(0, Number(cap) - used)
            : 0;
      const newW = {
        ...enrichApiWarehouse({ id: `new-${Date.now()}`, ...payload }, warehouses.length),
        id: `new-${Date.now()}`,
        ...form,
        used_capacity: used,
        available_capacity: avail,
        inventory_value: 0,
        created_at: new Date().toISOString().slice(0, 10),
        live: true,
      };
      setWarehouses((prev) => [...prev, newW]);
      addToast("Warehouse added");
    }
    setFormWarehouse(null);
  };

  const handleDeactivate = async (wh) => {
    if (!window.confirm(`Deactivate ${wh.name}?`)) return;
    if (wh.live && typeof wh.id === "number") {
      try {
        await deactivateWarehouse(wh.id);
        addToast("Warehouse deactivated");
        loadWarehouses();
        setSelected(null);
        return;
      } catch {
        addToast("Could not deactivate", "error");
        return;
      }
    }
    setWarehouses((prev) => prev.map((w) => (w.id === wh.id ? { ...w, status: "inactive" } : w)));
    setSelected(null);
    addToast("Warehouse deactivated");
  };

  const columns = [
    {
      key: "name",
      label: "Warehouse Name",
      render: (r) => (
        <div className="flex min-w-[200px] items-start gap-2.5">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: r.thumb || thumbColor(r.name) }}
          >
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-[13px] font-semibold text-[var(--color-text)]">{r.name}</p>
              {r.is_primary ? <StatusBadge tone="success">Primary</StatusBadge> : null}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
              {r.description || "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "code",
      label: "Warehouse Code",
      render: (r) => <span className="tabular-nums text-[13px] text-[var(--color-text-secondary)]">{r.code || "—"}</span>,
    },
    {
      key: "location",
      label: "Location",
      render: (r) => (
        <span className="inline-flex max-w-[180px] items-start gap-1 text-[13px] text-[var(--color-text-secondary)]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
          <span>
            {[r.city, r.state].filter(Boolean).join(", ") || r.branch || "—"}
            {r.country ? ` ${r.country}` : ""}
          </span>
        </span>
      ),
    },
    {
      key: "total_items",
      label: "Total Items",
      render: (r) => (
        <span className="tabular-nums text-[13px] font-semibold text-[var(--color-text)]">
          {Number(r.total_items || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "inventory_value",
      label: "Stock Value",
      render: (r) => (
        <span className="whitespace-nowrap tabular-nums text-[13px] font-semibold text-[var(--color-text)]">
          {formatInrAmount(r.inventory_value)}
        </span>
      ),
    },
    {
      key: "utilization_pct",
      label: "Utilization",
      render: (r) => {
        const pct = Number(r.utilization_pct) || 0;
        const tone = utilizationTone(pct);
        return (
          <div className="min-w-[110px]">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className={`text-[12px] font-semibold tabular-nums ${tone.text}`}>{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
              <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <StatusBadge tone={r.status === "active" ? "success" : "neutral"}>
          {r.status === "active" ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openWarehouse(r)}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-action-teal)]"
            aria-label="View"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setFormWarehouse(r.live ? r : {})}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <Link
            to="/inventory/raw-materials"
            className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
            aria-label="More"
            title="Manage Stock"
          >
            <MoreVertical className="h-4 w-4" />
          </Link>
        </div>
      ),
    },
  ];

  if (loading) return <Loader label="Loading warehouses…" />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Warehouses"
        showTitle
        subtitle="Manage and organize all your warehouses"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative inline-flex items-center">
              <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--color-text-muted)]" aria-hidden />
              <input
                type="date"
                value={headerDate}
                onChange={(e) => setHeaderDate(e.target.value)}
                className="ui-input !w-auto min-w-[10.5rem] !pl-9"
                aria-label="Date"
              />
            </label>
            <select
              value={headerScope}
              onChange={(e) => setHeaderScope(e.target.value)}
              className="ui-select !w-auto min-w-[11rem]"
              aria-label="Warehouse scope"
            >
              <option value="">All Warehouses</option>
              {rows.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total Warehouses" value={kpis.total} icon={Warehouse} tone="info" meta="Across all locations" />
        <KpiCard label="Total Items" value={Number(kpis.totalItems).toLocaleString("en-IN")} icon={Package} tone="success" meta="In all warehouses" />
        <KpiCard label="Total Stock Value" value={formatInrAmount(kpis.stockValue)} icon={IndianRupee} tone="warning" meta="Across all warehouses" />
        <KpiCard label="Avg. Utilization" value={`${kpis.avgUtilization}%`} icon={Building2} tone="primary" meta="Warehouse capacity" />
        <KpiCard label="Active Warehouses" value={kpis.active} icon={ClipboardCheck} tone="success" meta={`Out of ${kpis.total}`} />
      </div>

      <div className="ui-card p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 xl:max-w-lg">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              placeholder="Search by warehouse name, code, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ui-input w-full !pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-4 w-4" /> Filters
            </Button>
            {showFilters ? (
              <>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ui-select !w-auto min-w-[8.5rem]">
                  <option value="">Status</option>
                  {WAREHOUSE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="ui-select !w-auto min-w-[8.5rem]">
                  <option value="">Location</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <select className="ui-select !w-auto min-w-[8.5rem]" defaultValue="">
                  <option value="">Type</option>
                  {WAREHOUSE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select className="ui-select !w-auto min-w-[8.5rem]" defaultValue="">
                  <option value="">Plant</option>
                  {PLANTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </>
            ) : null}
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <RefreshCw className="h-4 w-4" /> Clear
            </Button>
            <Button variant="primary" type="button" onClick={() => setFormWarehouse({})}>
              <Plus className="h-4 w-4" /> Add Warehouse
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
          <DataTable
            columns={columns}
            data={filtered}
            showSearch={false}
            pageSize={10}
            emptyState={
              <EmptyState
                icon="factory"
                title="No warehouses yet"
                description="Add a warehouse to organize stock by location."
                actionLabel="Add Warehouse"
                onAction={() => setFormWarehouse({})}
              />
            }
          />
        </div>
        {filtered.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-[var(--color-text-muted)]">
              Showing 1 to {Math.min(10, filtered.length)} of {filtered.length} warehouses
            </p>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-[var(--color-border-soft)] px-2.5 py-1 text-[12px] text-[var(--color-text-secondary)]">
                10 / page
              </span>
              <div className="flex items-center gap-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-action-teal)] text-[12px] font-semibold text-white">
                  1
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {selected ? (
        <WarehouseDetailModal
          warehouse={selected}
          detail={detail}
          onClose={() => {
            setSelected(null);
            setDetail(null);
          }}
          onEdit={(w) => {
            setFormWarehouse(w);
            setSelected(null);
          }}
          onDeactivate={handleDeactivate}
        />
      ) : null}

      {formWarehouse ? (
        <WarehouseFormModal warehouse={formWarehouse} onClose={() => setFormWarehouse(null)} onSave={handleSave} />
      ) : null}
    </div>
  );
}

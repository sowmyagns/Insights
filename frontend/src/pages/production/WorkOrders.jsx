import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Download, FileSpreadsheet, FileText, Pause, Play, Plus, Printer, Search, Star } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import { calculateProgressPct } from "../../data/productionPlanningMasterData";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import WorkOrderDetailModal, {
  WorkOrderCompleteModal,
  WorkOrderStartModal,
} from "../../components/production/WorkOrderDetailModal";
import QuickWorkOrderModal from "../../components/production/QuickWorkOrderModal";
import IssueMaterialsModal from "../../components/production/IssueMaterialsModal";
import { useToast } from "../../context/ToastContext";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import useAuth from "../../hooks/useAuth";
import { isOperator } from "../../config/permissions";
import {
  completeWorkOrder,
  getWorkOrderDetail,
  getWorkOrders,
  getWorkOrderStartChecks,
  issueWorkOrderMaterials,
  pauseWorkOrder,
  startWorkOrder,
  stopWorkOrder,
  getMachines,
  updateProductionOrderMachine,
} from "../../api/productionApi";
import {
  DEPARTMENTS,
  PRIORITIES,
  SHIFTS,
  STATUS_FLOW,
  WO_STATUSES,
  canWoComplete,
  canWoIssueMaterials,
  canWoPause,
  canWoStart,
  canWoStop,
  computeWorkOrderSummary,
  enrichApiWorkOrder,
  priorityBadge,
  woStatusLabel,
} from "../../data/workOrdersMasterData";
import {
  MANUFACTURING_EVENTS,
  notifyManufacturingSpine,
} from "../../utils/manufacturingEvents";
import { exportToExcel, exportToPdf } from "../../utils/exportUtils";
import { printWorkOrder } from "../../utils/printUtils";

const PAGE_BG = "#F5F5F5";
const YELLOW = "#F5C518";
const PAGE_SIZES = [20, 50, 100];

function SummaryCard({ label, value, icon: Icon, color, onClick }) {
  const displayVal =
    value === null || value === undefined
      ? "0"
      : typeof value === "object"
      ? (value?.value ?? value?.count ?? value?.total ?? JSON.stringify(value))
      : String(value);

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs min-h-[86px] flex flex-col justify-between min-w-0 overflow-hidden ${
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      }`}
      title={typeof label === "string" ? label : undefined}
    >
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-500 leading-tight sm:text-xs min-w-0 flex-1">{label}</p>
        {Icon && (
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${color}`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="truncate text-xl font-extrabold tabular-nums text-slate-900 leading-none">{displayVal}</p>
      </div>
    </div>
  );
}

function PriorityPill({ priority }) {
  const p = priorityBadge(priority);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${p.bg} ${p.text}`}>
      {p.dot} {p.label}
    </span>
  );
}

function ProgressCell({ row }) {
  const pct = calculateProgressPct(row);
  const planned = Number(row.planned_quantity || 0);
  const rawProduced = Number(row.produced_quantity ?? row.actual_quantity ?? 0);
  const produced = (row.status === "completed" || row.status === "closed" || row.status === "done")
    ? Math.max(rawProduced, planned)
    : rawProduced > 0
    ? rawProduced
    : Math.round((planned * pct) / 100);
  return (
    <div className="min-w-[110px]">
      <div className="mb-0.5 flex justify-between text-[10px] text-slate-500">
        <span>{produced} / {planned}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function MachineCell({ row }) {
  const isAssigned = Boolean(row.machine_name && row.machine_name !== "—" && row.machine_name !== "Unassigned");
  return (
    <div>
      <p className={`text-sm font-medium ${isAssigned ? "text-slate-800" : "text-slate-400"}`}>
        {isAssigned ? row.machine_name : "—"}
      </p>
      {isAssigned && row.machine_status && row.machine_status !== "—" && (
        <p className="text-[10px] capitalize text-slate-500">{row.machine_status}</p>
      )}
    </div>
  );
}

const defaultFilters = {
  work_order_number: "",
  production_order: "",
  product: "",
  customer: "",
  machine: "",
  operator: "",
  department: "",
  shift: "",
  priority: "",
  status: "",
  date_from: "",
  date_to: "",
};

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val).slice(0, 10) : d.toLocaleDateString(undefined, { dateStyle: "short" });
}

// Statuses that count as "pending" (i.e. not yet completed)
const PENDING_VIEW_STATUSES = new Set([
  "planned", "draft", "released", "material_ready", "machine_ready",
  "running", "in_progress", "paused", "quality_check",
]);

export default function WorkOrders() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const poFilter = searchParams.get("production_order_id");
  // view=pending → show only non-completed orders (from Pending Orders dashboard widget)
  const pendingView = searchParams.get("view") === "pending";
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startModal, setStartModal] = useState(null);
  const [startChecks, setStartChecks] = useState([]);
  const [startLoading, setStartLoading] = useState(false);
  const [completeModal, setCompleteModal] = useState(null);
  const [completeSteps, setCompleteSteps] = useState([]);
  const [issuingId, setIssuingId] = useState(null);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [issueModalOrder, setIssueModalOrder] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let localWOs = [];
      try {
        const stored = localStorage.getItem("smrt_local_work_orders");
        if (stored) {
          const parsed = JSON.parse(stored);
          localWOs = parsed.map((r, i) => enrichApiWorkOrder(r, i));
        }
      } catch (e) {}

      const poId = poFilter ? Number(poFilter) : undefined;
      const wRes = await getWorkOrders(poId).catch(() => ({ data: [] }));
      const apiRows = wRes.data || [];
      const apiEnriched = apiRows.map((r, i) => enrichApiWorkOrder(r, i));

      const combined = [...localWOs, ...apiEnriched];
      const seen = new Set();
      const enriched = combined.filter((w) => {
        const key = w.id ? `id-${w.id}` : w.work_order_number ? `num-${w.work_order_number}` : null;
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      enriched.sort((a, b) => {
        const idA = typeof a.id === "number" ? a.id : Number(String(a.id).replace(/\D/g, "")) || 0;
        const idB = typeof b.id === "number" ? b.id : Number(String(b.id).replace(/\D/g, "")) || 0;
        if (idA && idB && idA !== idB) return idB - idA;
        const dateA = a.created_at || a.created_date || a.planned_start || "";
        const dateB = b.created_at || b.created_date || b.planned_start || "";
        return dateB.localeCompare(dateA);
      });
      setWorkOrders(enriched);
    } catch {
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [poFilter]);

  const [machines, setMachines] = useState([]);

  useEffect(() => {
    getMachines()
      .then((res) => setMachines(res?.data || []))
      .catch(() => setMachines([]));
  }, []);

  const handleMachineChange = async (workOrderId, machineId) => {
    const numId = machineId ? Number(machineId) : null;
    const selectedM = machines.find((m) => String(m.id) === String(machineId));
    const mName = selectedM ? (selectedM.name || selectedM.code) : (machineId ? `Machine #${machineId}` : "Unassigned");

    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id === workOrderId || w.work_order_number === workOrderId) {
          return { ...w, machine_id: numId, machine_name: mName };
        }
        return w;
      })
    );

    try {
      const storedWOs = localStorage.getItem("smrt_local_work_orders") || localStorage.getItem("smrt_work_orders");
      if (storedWOs) {
        const localWOs = JSON.parse(storedWOs);
        const updatedWOs = localWOs.map((wo) =>
          wo.id === workOrderId || wo.work_order_number === workOrderId
            ? { ...wo, machine_id: numId, machine_name: mName }
            : wo
        );
        localStorage.setItem("smrt_local_work_orders", JSON.stringify(updatedWOs));
        localStorage.setItem("smrt_work_orders", JSON.stringify(updatedWOs));
      }
    } catch {}

    addToast(numId ? `Machine (${mName}) assigned to work order` : "Machine unassigned", "success");

    if (typeof workOrderId === "number" && numId) {
      try {
        await updateProductionOrderMachine(workOrderId, numId).catch(() => null);
        notifyManufacturingSpine(MANUFACTURING_EVENTS.WORK_ORDER_UPDATED, { workOrderId, machineId: numId });
      } catch {}
    }
  };

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);

  const filtered = useMemo(() => {
    return workOrders.filter((w) => {
      // When navigated from Pending Orders widget, only show non-completed orders
      if (pendingView && !PENDING_VIEW_STATUSES.has(w.status)) return false;
      if (poFilter && String(w.production_order_id) !== poFilter) return false;
      if (filters.work_order_number && !w.work_order_number.toLowerCase().includes(filters.work_order_number.toLowerCase())) return false;
      if (filters.production_order && !String(w.production_order_number || "").toLowerCase().includes(filters.production_order.toLowerCase())) return false;
      if (filters.product && !String(w.product_name || "").toLowerCase().includes(filters.product.toLowerCase())) return false;
      if (filters.customer && !String(w.customer_name || "").toLowerCase().includes(filters.customer.toLowerCase())) return false;
      if (filters.machine && !String(w.machine_name || "").toLowerCase().includes(filters.machine.toLowerCase())) return false;
      if (filters.operator && !String(w.operator_name || "").toLowerCase().includes(filters.operator.toLowerCase())) return false;
      if (filters.department && w.department !== filters.department) return false;
      if (filters.shift && w.shift !== filters.shift) return false;
      if (filters.priority && w.priority !== filters.priority) return false;
      if (filters.status && w.status !== filters.status) return false;
      return true;
    });
  }, [workOrders, filters, poFilter, pendingView]);

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const paginatedWorkOrders = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize]);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Always use the locally-enriched list to compute summary counts.
  // The backend API summary uses raw DB status (e.g. "running") which can
  // differ from the enriched status on the frontend (e.g. "completed" when
  // produced >= planned). Using the enriched list keeps the summary cards
  // in sync with what is shown in the table.
  const summary = useMemo(() => computeWorkOrderSummary(filtered), [filtered]);

  const openWo = async (wo) => {
    setSelected(wo);
    setDetail(null);
    if (typeof wo.id === "number") {
      try {
        const res = await getWorkOrderDetail(wo.id);
        setDetail(enrichApiWorkOrder(res.data));
      } catch { /* list data */ }
    }
  };

  const handleStartClick = async (wo) => {
    if (typeof wo.id === "number") {
      try {
        const res = await getWorkOrderStartChecks(wo.id);
        setStartChecks(res.data || []);
        setStartModal(wo);
        return;
      } catch {
        addToast("Could not load checks", "error");
        return;
      }
    }
    setStartChecks([
      { check_type: "production_order", label: "Production Order Ready", ready: true, message: "Production Order linked & ready" },
      { check_type: "material", label: "Material Issued", ready: true, message: "Materials ready" },
      { check_type: "machine", label: "Machine Ready", ready: !!wo.machine_name && wo.machine_name !== "—", message: wo.machine_name && wo.machine_name !== "—" ? `Machine: ${wo.machine_name}` : "No machine assigned" },
      { check_type: "operator", label: "Operator Assigned", ready: !!wo.operator_name && wo.operator_name !== "—", message: wo.operator_name && wo.operator_name !== "—" ? `Operator: ${wo.operator_name}` : "No operator assigned" },
    ]);
    setStartModal(wo);
  };

  const confirmStart = async () => {
    const wo = startModal;
    if (!wo) return;
    setStartLoading(true);
    if (typeof wo.id === "number") {
      try {
        const res = await startWorkOrder(wo.id);
        if (res.data?.success) {
          addToast("Work order started");
          load();
          setStartModal(null);
          setSelected(null);
        } else {
          setStartChecks(res.data?.checks || []);
          addToast(res.data?.message || "Start failed", "error");
        }
      } catch {
        addToast("Start failed", "error");
      } finally {
        setStartLoading(false);
      }
      return;
    }
    setWorkOrders((prev) => prev.map((w) => (w.id === wo.id ? { ...w, status: "running", machine_status: "running" } : w)));
    addToast("Work order started");
    setStartModal(null);
    setStartLoading(false);
  };

  const handlePause = async (wo) => {
    if (typeof wo.id === "number") {
      try {
        await pauseWorkOrder(wo.id);
        addToast("Paused");
        load();
      } catch { addToast("Pause failed", "error"); }
      return;
    }
    setWorkOrders((prev) => prev.map((w) => (w.id === wo.id ? { ...w, status: "paused" } : w)));
    addToast("Paused");
  };

  const handleStop = async (wo) => {
    if (typeof wo.id === "number") {
      try {
        await stopWorkOrder(wo.id);
        addToast("Stopped");
        load();
      } catch { addToast("Stop failed", "error"); }
      return;
    }
    setWorkOrders((prev) => prev.map((w) => (w.id === wo.id ? { ...w, status: "planned", machine_status: "idle" } : w)));
    addToast("Stopped");
  };

  const handleIssueMaterials = (wo) => {
    setIssueModalOrder(wo);
  };

  const handleComplete = async (wo) => {
    if (typeof wo.id === "number") {
      try {
        const res = await completeWorkOrder(wo.id);
        if (res.data?.success) {
          setCompleteSteps(res.data.steps || []);
          setCompleteModal(wo);
          addToast("Completed — inventory, QC, and production updated");
          notifyManufacturingSpine(MANUFACTURING_EVENTS.WORK_ORDER_COMPLETED, {
            workOrderId: wo.id,
            steps: res.data.steps,
          });
          load();
          setSelected(null);
        } else {
          addToast(res.data?.message || "Complete failed", "error");
        }
      } catch (err) {
        const msg = err?.response?.data?.detail || "Complete failed";
        addToast(typeof msg === "string" ? msg : "Complete failed", "error");
      }
      return;
    }
    addToast("Complete requires a saved work order", "error");
  };

  const handlePrintRow = (r) => {
    printWorkOrder(r, user);
  };

  const exportCols = [
    { key: "work_order_number", label: "Work Order Number" },
    { key: "product_name", label: "Product" },
    { key: "production_order_number", label: "Production Order" },
    { key: "customer_name", label: "Customer" },
    { key: "machine_name", label: "Machine" },
    { key: "planned_quantity", label: "Planned" },
    { key: "produced_quantity", label: "Produced" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
  ];

  const columns = [
    { key: "work_order_number", label: "Work Order Number" },
    { key: "product_name", label: "Product" },
    { key: "production_order_number", label: "Production Order" },
    { key: "customer_name", label: "Customer" },
    {
      key: "machine_name",
      label: "Machine",
      render: (r) => <MachineCell row={r} />,
    },
    { key: "operator_name", label: "Operator" },
    { key: "planned_quantity", label: "Planned Quantity" },
    {
      key: "progress",
      label: "Produced",
      sortable: false,
      render: (r) => <ProgressCell row={r} />,
    },
    {
      key: "remaining_quantity",
      label: "Remaining",
      render: (r) => r.remaining_quantity ?? Math.max((r.planned_quantity || 0) - (r.produced_quantity || 0), 0),
    },
    {
      key: "priority",
      label: "Priority",
      render: (r) => <PriorityPill priority={r.priority} />,
    },
    {
      key: "planned_start",
      label: "Start",
      render: (r) => formatDate(r.planned_start),
    },
    {
      key: "planned_end",
      label: "Due",
      render: (r) => formatDate(r.planned_end),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className="inline-flex flex-col gap-0.5">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize">{woStatusLabel(r.status)}</span>
          {r.is_delayed && <span className="text-[10px] font-semibold text-red-600">🔴 Delayed</span>}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <div className="flex flex-wrap gap-1 text-xs">
          <button type="button" onClick={() => openWo(r)} className="font-semibold text-[#2563EB] hover:underline">👁 View</button>
          {canWoIssueMaterials(r.status, r.materials_issued) && (
            <button
              type="button"
              disabled={issuingId === r.id}
              onClick={() => handleIssueMaterials(r)}
              className="font-semibold text-cyan-700 hover:underline disabled:opacity-50"
            >
              {issuingId === r.id ? "Issuing…" : "📦 Issue Materials"}
            </button>
          )}
          {r.materials_issued && (
            <span className="text-[10px] font-semibold text-emerald-600">Materials ✔</span>
          )}
          {canWoStart(r.status) && <button type="button" onClick={() => handleStartClick(r)} className="font-semibold text-green-700 hover:underline">▶ Start</button>}
          {canWoPause(r.status) && <button type="button" onClick={() => handlePause(r)} className="font-semibold text-amber-700 hover:underline">⏸ Pause</button>}
          {canWoStop(r.status) && <button type="button" onClick={() => handleStop(r)} className="font-semibold text-slate-600 hover:underline">⏹ Stop</button>}
          <button type="button" onClick={() => handlePrintRow(r)} className="font-semibold text-slate-500 hover:underline">🖨 Print</button>
          <button type="button" onClick={() => exportToPdf([r], exportCols, `WO ${r.work_order_number}`, r.work_order_number)} className="font-semibold text-slate-500 hover:underline">📄 PDF</button>
        </div>
      ),
    },
  ];

  if (loading) return <Loader label="Loading work orders..." />;

  return (
    <div className="min-h-full pb-8" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs text-slate-400">
            <Link to="/production/planning" className="hover:text-[#2563EB]">Production Planning</Link>
            {" → "}
            <Link to="/production/mrp" className="hover:text-[#2563EB]">MRP</Link>
            {" → Work Orders"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Issue materials, assign machine/operator, run production, complete with QC and finished goods.
          </p>
        </div>

        {pendingView && (
          <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                {filtered.length}
              </span>
              <span className="font-semibold text-orange-800">Pending Orders</span>
              <span className="text-orange-600">— showing only <strong>Planned</strong> and <strong>In Progress</strong> work orders</span>
            </div>
            <Link
              to="/production/work-orders"
              className="rounded-lg border border-orange-300 bg-white px-3 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
            >
              View All Orders
            </Link>
          </div>
        )}

        <ManufacturingWorkflowBar currentStepId="work_order" />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <SummaryCard label="Total Work Orders" value={summary.total_work_orders} icon={ClipboardList} color="bg-[#2563EB]" />
          <SummaryCard label="Planned" value={summary.planned_orders} icon={FileText} color="bg-blue-500" />
          <SummaryCard label="In Progress" value={summary.in_progress_orders} icon={Play} color="bg-amber-500" />
          <SummaryCard label="Completed" value={summary.completed_orders} icon={CheckCircle2} color="bg-green-500" />
          <SummaryCard label="Delayed" value={summary.delayed_orders} icon={AlertTriangle} color="bg-red-500" />
          <SummaryCard label="High Priority" value={summary.high_priority_orders} icon={Star} color="bg-purple-500" />
        </div>

        {/* Card Container */}
        <div className="rounded-xl border border-[#e4e4ea] bg-white p-4 shadow-sm sm:p-5">
          {/* Action Bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                type="search"
                placeholder="Search work orders..."
                value={filters.work_order_number}
                onChange={(e) => setFilters((f) => ({ ...f, work_order_number: e.target.value }))}
                className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[#d0d0d8] focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e4ea] bg-[#f3f3f6] px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f] hover:bg-[#ececf0]"
            >
              {showAdvanced ? "Hide Filters" : "Advanced Filters"}
            </button>
            <button
              type="button"
              onClick={() => exportToExcel(filtered, exportCols, "work-orders")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e4ea] bg-[#f3f3f6] px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f] hover:bg-[#ececf0]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e4ea] bg-[#f3f3f6] px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f] hover:bg-[#ececf0]"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            {!isOperator(user) && (
              <button
                type="button"
                onClick={() => setShowQuickModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f]"
                style={{ background: YELLOW }}
              >
                <Plus className="h-4 w-4" />
                New Work Order
              </button>
            )}
          </div>

          {showAdvanced && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <input placeholder="WO Number" value={filters.work_order_number} onChange={(e) => setFilters((f) => ({ ...f, work_order_number: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Production Order" value={filters.production_order} onChange={(e) => setFilters((f) => ({ ...f, production_order: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Product" value={filters.product} onChange={(e) => setFilters((f) => ({ ...f, product: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Customer" value={filters.customer} onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Machine" value={filters.machine} onChange={(e) => setFilters((f) => ({ ...f, machine: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Operator" value={filters.operator} onChange={(e) => setFilters((f) => ({ ...f, operator: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <select value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filters.shift} onChange={(e) => setFilters((f) => ({ ...f, shift: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Shift</option>
                {SHIFTS.map((s) => {
                  const id = typeof s === "object" ? s.id : s;
                  const label = typeof s === "object" ? s.label : s;
                  return <option key={id} value={id}>{label}</option>;
                })}
              </select>
              <select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Priority</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Status</option>
                {WO_STATUSES.map((s) => <option key={s} value={s}>{woStatusLabel(s)}</option>)}
              </select>
              <button type="button" onClick={() => setFilters(defaultFilters)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Clear</button>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-[#ececf0]">
            <DataTable
              columns={columns}
              data={paginatedWorkOrders}
              showSearch={false}
              pagination={false}
              emptyState={
                <div className="py-12 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-sm font-medium text-slate-600">No work orders found.</p>
                  {!isOperator(user) && (
                    <button type="button" onClick={() => setShowQuickModal(true)} className="ui-btn-primary mt-4 inline-flex">Create Work Order</button>
                  )}
                </div>
              }
            />
          </div>

          {/* Pagination Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#6b6b76]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded border border-[#e2e2e8] bg-white px-2 py-1 outline-none"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>{total === 0 ? "0-0 of 0" : `${from}-${to} of ${total}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="grid h-8 min-w-8 place-items-center rounded border border-[#e0b400] px-2 text-[13px] font-semibold"
                style={{ background: "#fff2b8" }}
              >
                {page}
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <ManufacturingWorkflowBar currentStepId="material_issue" compact />

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-slate-500">Status Workflow</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((s, i) => (
              <span key={s} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">{s}</span>
                {i < STATUS_FLOW.length - 1 && <span className="text-slate-300">↓</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <WorkOrderDetailModal
          workOrder={selected}
          detail={detail}
          onClose={() => { setSelected(null); setDetail(null); }}
          onIssueMaterials={handleIssueMaterials}
          issuing={issuingId === selected.id}
          onStart={handleStartClick}
          onPause={handlePause}
          onStop={handleStop}
          onComplete={handleComplete}
        />
      )}

      {startModal && (
        <WorkOrderStartModal workOrder={startModal} checks={startChecks} onClose={() => setStartModal(null)} onConfirm={confirmStart} loading={startLoading} />
      )}

      {completeModal && (
        <WorkOrderCompleteModal workOrder={completeModal} steps={completeSteps} onClose={() => setCompleteModal(null)} />
      )}

      {showQuickModal && (
        <QuickWorkOrderModal
          onClose={() => setShowQuickModal(false)}
          onSuccess={() => load()}
          addToast={addToast}
        />
      )}

      {issueModalOrder && (
        <IssueMaterialsModal
          workOrder={issueModalOrder}
          onClose={() => setIssueModalOrder(null)}
          onSuccess={() => load()}
          addToast={addToast}
        />
      )}
    </div>
  );
}

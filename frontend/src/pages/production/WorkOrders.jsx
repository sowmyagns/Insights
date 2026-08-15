import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  FileText,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Printer,
  Search,
  Star,
} from "lucide-react";

import Button, { IconButton } from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import KpiCard from "../../components/common/KpiCard";
import Loader from "../../components/common/Loader";
import StatusBadge from "../../components/common/StatusBadge";
import { calculateProgressPct } from "../../data/productionPlanningMasterData";
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
  WO_STATUSES,
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
import { cleanProductLabel } from "../../utils/productLabel";

const PAGE_SIZES = [20, 50, 100];

function isServerWoId(id) {
  return typeof id === "number" || (typeof id === "string" && /^\d+$/.test(id));
}

function woStatusTone(row) {
  if (row?.is_delayed) return "danger";
  const s = String(row?.status || "").toLowerCase();
  if (s === "completed" || s === "closed" || s === "done") return "success";
  if (s === "running" || s === "in_progress" || s === "started") return "progress";
  if (s === "planned" || s === "draft" || s === "released" || s === "material_ready" || s === "machine_ready") return "pending";
  if (s === "cancelled" || s === "canceled") return "neutral";
  if (s === "paused" || s === "on_hold" || s === "quality_check") return "warning";
  return "info";
}

function PriorityPill({ priority }) {
  const p = priorityBadge(priority || "medium");
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${p.bg} ${p.text}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {p.label}
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
    <div className="min-w-[88px] max-w-[120px]">
      <div className="mb-1 flex justify-between text-[11px] tabular-nums text-[var(--color-text-secondary)]">
        <span>
          {produced}/{planned}
        </span>
        <span className="font-semibold text-[var(--color-text)]">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
        <div
          className="h-full rounded-full bg-[var(--color-action-teal)] transition-[width]"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

/** Compact row actions — icon buttons + overflow menu. */
function WoRowActions({
  row,
  onView,
  onIssue,
  onStart,
  onPause,
  onStop,
  onPrint,
  onPdf,
  issuing,
}) {
  const [open, setOpen] = useState(false);
  const serverId = isServerWoId(row.id);

  const more = [];
  if (canWoIssueMaterials(row.status, row.materials_issued)) {
    more.push({
      label: issuing ? "Issuing…" : "Issue Materials",
      onClick: () => onIssue(row),
      disabled: issuing,
    });
  }
  if (canWoPause(row.status)) more.push({ label: "Pause", onClick: () => onPause(row) });
  if (canWoStop(row.status)) more.push({ label: "Stop", onClick: () => onStop(row) });
  more.push({ label: "Print", onClick: () => onPrint(row) });
  more.push({ label: "Export PDF", onClick: () => onPdf(row) });

  return (
    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
      <IconButton aria-label="View" title="View" onClick={() => onView(row)}>
        <Eye className="h-3.5 w-3.5" />
      </IconButton>
      {serverId ? (
        <IconButton to={`/production/job-card?id=${row.id}`} aria-label="Job Card" title="Job Card">
          <ClipboardList className="h-3.5 w-3.5" />
        </IconButton>
      ) : null}
      {canWoStart(row.status) ? (
        <IconButton variant="primary" aria-label="Start" title="Start" onClick={() => onStart(row)}>
          <Play className="h-3.5 w-3.5" />
        </IconButton>
      ) : null}
      {more.length ? (
        <div className="relative">
          <IconButton
            aria-label="More actions"
            title="More actions"
            onClick={(e) => {
              e?.stopPropagation?.();
              setOpen((v) => !v);
            }}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </IconButton>
          {open ? (
            <>
              <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
                {more.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
                    onClick={() => {
                      setOpen(false);
                      item.onClick?.();
                    }}
                  >
                    {item.label === "Pause" ? <Pause className="h-3.5 w-3.5" /> : null}
                    {item.label === "Print" ? <Printer className="h-3.5 w-3.5" /> : null}
                    {item.label === "Export PDF" ? <FileText className="h-3.5 w-3.5" /> : null}
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
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
      let wRes;
      try {
        wRes = await getWorkOrders(poId);
      } catch (e) {
        addToast(e?.response?.data?.detail || "Could not load work orders", "error");
        wRes = { data: [] };
      }
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
      addToast("Could not load work orders", "error");
    } finally {
      setLoading(false);
    }
  }, [poFilter, addToast]);

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
      if (filters.work_order_number) {
        const q = filters.work_order_number.toLowerCase();
        const hay = [
          w.work_order_number,
          w.production_order_number,
          w.product_name,
          w.customer_name,
          w.machine_name,
          w.operator_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
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
    const label = wo.work_order_number || wo.id;
    if (typeof wo.id === "number") {
      try {
        await pauseWorkOrder(wo.id);
        addToast(`Paused ${label}`, "success");
        load();
      } catch { addToast(`Pause failed for ${label}`, "error"); }
      return;
    }
    setWorkOrders((prev) => prev.map((w) => (w.id === wo.id ? { ...w, status: "paused" } : w)));
    addToast(`Paused ${label}`, "success");
  };

  const handleStop = async (wo) => {
    const label = wo.work_order_number || wo.id;
    if (typeof wo.id === "number") {
      try {
        await stopWorkOrder(wo.id);
        addToast(`Stopped ${label}`, "success");
        load();
      } catch { addToast(`Stop failed for ${label}`, "error"); }
      return;
    }
    setWorkOrders((prev) => prev.map((w) => (w.id === wo.id ? { ...w, status: "planned", machine_status: "idle" } : w)));
    addToast(`Stopped ${label}`, "success");
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
    {
      key: "work_order_number",
      label: "Work Order",
      render: (r) => (
        <div className="min-w-[7.5rem]">
          <p className="text-[13px] font-semibold tabular-nums text-[var(--color-text)]">{r.work_order_number || "—"}</p>
          <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]" title={r.production_order_number || undefined}>
            {r.production_order_number ? `PO ${r.production_order_number}` : "No production order"}
          </p>
        </div>
      ),
    },
    {
      key: "product_name",
      label: "Product",
      render: (r) => {
        const product = cleanProductLabel(r.product_name);
        const machine =
          r.machine_name && r.machine_name !== "—" && r.machine_name !== "Unassigned" ? r.machine_name : "";
        const customer = r.customer_name && r.customer_name !== "—" ? r.customer_name : "";
        const operator = r.operator_name && r.operator_name !== "—" ? r.operator_name : "";
        const meta = [customer, machine || "No machine", operator].filter(Boolean).join(" · ");
        return (
          <div className="max-w-[220px]">
            <p className="truncate text-[13px] font-medium text-[var(--color-text)]" title={product}>
              {product}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]" title={meta}>
              {meta}
            </p>
          </div>
        );
      },
    },
    {
      key: "planned_quantity",
      label: "Qty",
      render: (r) => {
        const planned = Number(r.planned_quantity || 0);
        const produced = Number(r.produced_quantity ?? r.actual_quantity ?? 0);
        const remaining = r.remaining_quantity ?? Math.max(planned - produced, 0);
        return (
          <div className="tabular-nums">
            <p className="text-[13px] font-semibold text-[var(--color-text)]">{planned}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {produced} done · {remaining} left
            </p>
          </div>
        );
      },
    },
    {
      key: "priority",
      label: "Priority",
      render: (r) => <PriorityPill priority={r.priority} />,
    },
    {
      key: "progress",
      label: "Progress",
      sortable: false,
      render: (r) => <ProgressCell row={r} />,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone={woStatusTone(r)}>
            {r.is_delayed ? "Delayed" : woStatusLabel(r.status)}
          </StatusBadge>
          {r.materials_issued ? (
            <span className="text-[10px] font-semibold text-emerald-700">Materials issued</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "planned_end",
      label: "Due",
      render: (r) => (
        <span className="whitespace-nowrap text-[12px] tabular-nums text-[var(--color-text-secondary)]">
          {formatDate(r.planned_end || r.planned_start)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <WoRowActions
          row={r}
          onView={openWo}
          onIssue={handleIssueMaterials}
          onStart={handleStartClick}
          onPause={handlePause}
          onStop={handleStop}
          onPrint={handlePrintRow}
          onPdf={(row) => exportToPdf([row], exportCols, `WO ${row.work_order_number}`, row.work_order_number)}
          issuing={issuingId === r.id}
        />
      ),
    },
  ];

  if (loading) return <Loader label="Loading work orders..." />;

  return (
    <div className="space-y-5 pb-4">
        {pendingView && (
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)] px-4 py-3 text-[var(--text-sm)]">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-warning)] text-white text-xs font-bold">
                {filtered.length}
              </span>
              <span className="font-semibold text-[var(--color-warning)]">Pending Orders</span>
              <span className="text-[var(--color-warning)]">— showing only <strong>Planned</strong> and <strong>In Progress</strong> work orders</span>
            </div>
            <Button variant="secondary" to="/production/work-orders">
              View All Orders
            </Button>
          </div>
        )}

        <div className="ui-grid-kpi">
          <KpiCard label="Total Work Orders" value={summary.total_work_orders} icon={ClipboardList} color="bg-[var(--color-primary)]" />
          <KpiCard label="Planned" value={summary.planned_orders} icon={FileText} color="bg-blue-500" />
          <KpiCard label="In Progress" value={summary.in_progress_orders} icon={Play} color="bg-amber-500" />
          <KpiCard label="Completed" value={summary.completed_orders} icon={CheckCircle2} color="bg-green-500" />
          <KpiCard label="Delayed" value={summary.delayed_orders} icon={AlertTriangle} color="bg-red-500" />
          <KpiCard label="High Priority" value={summary.high_priority_orders} icon={Star} color="bg-purple-500" />
        </div>

        <div className="ui-card overflow-hidden p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-[220px] flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-icon)]" />
              <input
                type="search"
                placeholder="Search WO, product, customer, machine…"
                value={filters.work_order_number}
                onChange={(e) => setFilters((f) => ({ ...f, work_order_number: e.target.value }))}
                className="ui-input !rounded-full pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" type="button" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? "Hide Filters" : "Filters"}
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => exportToExcel(filtered, exportCols, "work-orders")}
                title="Export Excel"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button variant="secondary" type="button" onClick={() => window.print()} title="Print">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              {!isOperator(user) && (
                <Button variant="success" type="button" onClick={() => setShowQuickModal(true)}>
                  <Plus className="h-4 w-4" />
                  New Work Order
                </Button>
              )}
            </div>
          </div>

          {showAdvanced && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <input placeholder="WO Number" value={filters.work_order_number} onChange={(e) => setFilters((f) => ({ ...f, work_order_number: e.target.value }))} className="ui-input" />
              <input placeholder="Production Order" value={filters.production_order} onChange={(e) => setFilters((f) => ({ ...f, production_order: e.target.value }))} className="ui-input" />
              <input placeholder="Product" value={filters.product} onChange={(e) => setFilters((f) => ({ ...f, product: e.target.value }))} className="ui-input" />
              <input placeholder="Customer" value={filters.customer} onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))} className="ui-input" />
              <input placeholder="Machine" value={filters.machine} onChange={(e) => setFilters((f) => ({ ...f, machine: e.target.value }))} className="ui-input" />
              <input placeholder="Operator" value={filters.operator} onChange={(e) => setFilters((f) => ({ ...f, operator: e.target.value }))} className="ui-input" />
              <select value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))} className="ui-select">
                <option value="">Department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filters.shift} onChange={(e) => setFilters((f) => ({ ...f, shift: e.target.value }))} className="ui-select">
                <option value="">Shift</option>
                {SHIFTS.map((s) => {
                  const id = typeof s === "object" ? s.id : s;
                  const label = typeof s === "object" ? s.label : s;
                  return <option key={id} value={id}>{label}</option>;
                })}
              </select>
              <select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} className="ui-select">
                <option value="">Priority</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="ui-select">
                <option value="">Status</option>
                {WO_STATUSES.map((s) => <option key={s} value={s}>{woStatusLabel(s)}</option>)}
              </select>
              <Button variant="secondary" type="button" onClick={() => setFilters(defaultFilters)}>Clear</Button>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-[#ececf0]">
            <DataTable
              columns={columns}
              data={paginatedWorkOrders}
              showSearch={false}
              pagination={false}
              emptyState={
                <EmptyState
                  icon="clipboard"
                  title="No work orders found"
                  description={
                    Object.values(filters).some(Boolean)
                      ? "No work orders match your filters. Clear filters or adjust search."
                      : "Create a work order to start production execution and open its Job Card."
                  }
                  actionLabel={!isOperator(user) ? "New Work Order" : undefined}
                  onAction={!isOperator(user) ? () => setShowQuickModal(true) : undefined}
                />
              }
            />
          </div>

          {/* Pagination Bar */}
          <div className="mt-4 ui-pagination justify-between">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="ui-select min-h-0 w-auto py-1"
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
                className="ui-page-btn"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="ui-page-btn ui-page-btn--active"
              >
                {page}
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="ui-page-btn"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
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

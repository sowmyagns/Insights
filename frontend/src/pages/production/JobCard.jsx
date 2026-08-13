import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ClipboardList,
  Clock,
  Factory,
  FileText,
  Package,
  Play,
  Plus,
  Printer,
  Save,
  Search,
  Settings2,
  StopCircle,
  Truck,
  User,
  X,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import QuickWorkOrderModal from "../../components/production/QuickWorkOrderModal";
import { useToast } from "../../context/ToastContext";
import useAuth from "../../hooks/useAuth";
import { isOperator } from "../../config/permissions";
import {
  canWoComplete,
  canWoIssueMaterials,
  canWoStart,
  priorityBadge,
} from "../../data/workOrdersMasterData";
import {
  completeWorkOrder,
  getJobCard,
  getJobCards,
  getMachines,
  issueWorkOrderMaterials,
  startWorkOrder,
  updateWorkOrder,
} from "../../api/productionApi";
import {
  MANUFACTURING_EVENTS,
  notifyManufacturingSpine,
} from "../../utils/manufacturingEvents";

/* ── Reference image stage chrome ──────────────────────────────────────── */
const STAGE_META = [
  { id: "sales_order", number: 1, title: "Sales Order Created", desc: "Sales Team creates customer order.", Icon: FileText, tone: "bg-blue-100 text-blue-700" },
  { id: "production_request", number: 2, title: "Production Request", desc: "Production request created from Sales Order.", Icon: ClipboardList, tone: "bg-sky-100 text-sky-700" },
  { id: "job_card", number: 3, title: "Job Card Created", desc: "Production Manager reviews and creates Job Card.", Icon: ClipboardList, tone: "bg-emerald-100 text-emerald-700" },
  { id: "material_issue", number: 4, title: "Material Issued", desc: "Store issues required materials for production.", Icon: Package, tone: "bg-orange-100 text-orange-700" },
  { id: "production", number: 5, title: "Production Execution", desc: "Operator starts production and updates progress.", Icon: Factory, tone: "bg-violet-100 text-violet-700" },
  { id: "quality", number: 6, title: "Quality Check", desc: "Quality team inspects and approves.", Icon: Search, tone: "bg-cyan-100 text-cyan-700" },
  { id: "packing_dispatch", number: 7, title: "Packing & Dispatch", desc: "Packing completed and goods dispatched.", Icon: Truck, tone: "bg-teal-100 text-[var(--color-success)]" },
  { id: "billing", number: 8, title: "Invoice & Billing", desc: "Invoice generated and accounting completed.", Icon: FileText, tone: "bg-indigo-100 text-indigo-800" },
];

function fmtQty(n, uom = "Nos") {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-IN")} ${uom}`;
}

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `₹ ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dash(v) {
  return v == null || v === "" ? "—" : v;
}

function roleFlags(user) {
  const names = [
    ...(Array.isArray(user?.roles) ? user.roles.map((r) => (typeof r === "object" ? r?.name : r)) : []),
    user?.role,
    user?.role_name,
  ]
    .filter(Boolean)
    .map((x) => String(x).toLowerCase());
  const has = (n) => names.some((x) => x.includes(n));
  return {
    admin: has("admin"),
    production: has("production") || has("admin"),
    store: has("store") || has("inventory"),
    quality: has("quality") || has("qc"),
    accounts: has("account") || has("finance") || has("sales"),
    operator: isOperator(user),
  };
}

/* ── Shared UI atoms matching mockups ──────────────────────────────────── */
function Card({ title, icon: Icon, children, className = "", action, bodyClass = "p-4" }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[var(--color-primary-dark)]">
          {Icon ? <Icon className="h-4 w-4 text-[#2563eb]" strokeWidth={2} /> : null}
          {title}
        </h3>
        {action}
      </div>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

function KV({ label, value, valueClass = "" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className={`text-right text-[12px] font-semibold text-slate-800 ${valueClass}`}>{dash(value)}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Inp(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${props.className || ""}`}
    />
  );
}

function Sel({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${props.className || ""}`}
    >
      {children}
    </select>
  );
}

function QtyBox({ label, value, tone }) {
  const color =
    tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-orange-500" : tone === "info" ? "text-blue-600" : "text-slate-800";
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-center">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

/* ── Screenshot 1: Workflow ribbon ─────────────────────────────────────── */
function WorkflowRibbon({ workflow }) {
  const byId = Object.fromEntries((workflow || []).map((s) => [s.id, s]));
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
      <h2 className="mb-4 text-center text-base font-bold text-[var(--color-primary-dark)]">
        Job Card Workflow – From Sales Order to Dispatch &amp; Billing
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8">
        {STAGE_META.map((meta) => {
          const live = byId[meta.id];
          const status = live?.status || "pending";
          const Icon = meta.Icon;
          return (
            <div
              key={meta.id}
              className={`rounded-lg p-2 ${
                status === "current" ? "ring-2 ring-blue-400 bg-blue-50/50" : status === "blocked" ? "ring-1 ring-orange-300 bg-orange-50/40" : ""
              }`}
            >
              <div className="flex gap-2">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                  {status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : status === "blocked" ? (
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  ) : (
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-slate-800">
                    {meta.number}. {meta.title}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{live?.description || meta.desc}</p>
                  <p
                    className={`mt-1 text-[10px] font-bold uppercase ${
                      status === "completed"
                        ? "text-emerald-600"
                        : status === "current"
                          ? "text-blue-600"
                          : status === "blocked"
                            ? "text-orange-600"
                            : "text-slate-400"
                    }`}
                  >
                    {status === "completed" ? "✓ Completed" : status === "current" ? "● Current" : status === "blocked" ? "⚠ Blocked" : "○ Pending"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Overview dashboard (reference image layout) ───────────────────────── */
function OverviewDashboard({ card, uom, priority, progressPct }) {
  const h = card.header || {};
  const s = card.summary || {};
  const materials = card.materials || [];

  const metaItems = [
    { label: "Job Card No", value: card.job_card_no, Icon: ClipboardList },
    { label: "Sales Order", value: h.sales_order_no, Icon: FileText },
    { label: "Customer", value: h.customer, Icon: User },
    { label: "Product", value: h.product, Icon: Package },
    { label: "Order Qty", value: fmtQty(h.order_qty, uom), Icon: Box },
    { label: "Required Delivery", value: h.required_delivery, Icon: Clock },
  ];

  return (
    <div className="space-y-4">
      {/* Key metadata strip */}
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {metaItems.map(({ label, value, Icon }) => (
            <div key={label} className="flex min-w-[120px] items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[#2563eb]">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                <p className="text-[12px] font-bold text-slate-800">{dash(value)}</p>
              </div>
            </div>
          ))}
          <div className="ml-auto">
            <span className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">
              {priority.label}
            </span>
          </div>
        </div>
      </section>

      {/* Row: Schedule | Materials | Machine */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Production Schedule" icon={Clock}>
          <div className="space-y-2.5 text-[12px]">
            <div className="flex items-start gap-2">
              <Play className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-700">Production Start</p>
                <p className="text-slate-600">{dash(h.planned_start)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <StopCircle className="mt-0.5 h-3.5 w-3.5 text-rose-600" />
              <div>
                <p className="font-semibold text-slate-700">Production End</p>
                <p className="text-slate-600">{dash(h.planned_end)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 text-orange-500" />
              <div>
                <p className="font-semibold text-slate-700">Packing</p>
                <p className="text-slate-600">{dash(h.packing_time || card.packing?.packing_start)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Truck className="mt-0.5 h-3.5 w-3.5 text-blue-600" />
              <div>
                <p className="font-semibold text-slate-700">Dispatch</p>
                <p className="text-slate-600">{dash(h.dispatch_date || card.dispatch?.dispatch_date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-700">Delivery</p>
                <p className="text-slate-600">{dash(h.delivery_date)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Material Requirement" icon={Package} bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase text-slate-500">
                  <th className="px-3 py-2 font-semibold">Material</th>
                  <th className="px-2 py-2 font-semibold">Required Qty</th>
                  <th className="px-2 py-2 font-semibold">Available Qty</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                      No BOM materials
                    </td>
                  </tr>
                ) : (
                  materials.map((m) => (
                    <tr key={m.item_id || m.material} className="border-b border-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">{m.material}</td>
                      <td className="px-2 py-2 tabular-nums">
                        {m.required} {m.unit}
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        {m.available} {m.unit}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`font-bold ${m.status === "available" ? "text-emerald-600" : "text-rose-600"}`}>
                          {m.status_label}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Machine & Operator" icon={Settings2}>
          <KV label="Machine" value={card.machine?.machine_name} />
          <KV label="Operation" value={card.machine?.operation || "Manufacturing"} />
          <KV label="Operator" value={card.operator?.operator_name} />
          <KV label="Shift" value={card.operator?.shift} />
          <KV label="Target Quantity" value={fmtQty(s.target_qty, uom)} />
        </Card>
      </div>

      {/* Row: Progress | QC */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Production Progress" icon={Factory}>
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-[11px]">
              <span className="text-slate-500">Progress</span>
              <span className="font-bold text-emerald-600">{progressPct}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <QtyBox label="Target Qty" value={fmtQty(s.target_qty, uom)} />
            <QtyBox label="Produced" value={fmtQty(s.produced_qty, uom)} tone="good" />
            <QtyBox label="Good Qty" value={fmtQty(s.good_qty, uom)} tone="good" />
            <QtyBox label="Rejected" value={fmtQty(s.rejected_qty, uom)} tone="bad" />
            <QtyBox label="Rework" value={fmtQty(s.rework_qty, uom)} tone="warn" />
          </div>
        </Card>

        <Card title="Quality Check" icon={Search}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase text-slate-500">
                  <th className="px-2 py-2 text-left font-semibold">Checked Qty</th>
                  <th className="px-2 py-2 text-left font-semibold">Passed</th>
                  <th className="px-2 py-2 text-left font-semibold">Rejected</th>
                  <th className="px-2 py-2 text-left font-semibold">Rework</th>
                  <th className="px-2 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-3 font-semibold">{fmtQty(card.quality?.checked_qty, uom)}</td>
                  <td className="px-2 py-3 font-semibold text-emerald-600">{fmtQty(card.quality?.passed_qty, uom)}</td>
                  <td className="px-2 py-3 font-semibold text-rose-600">{fmtQty(card.quality?.rejected_qty, uom)}</td>
                  <td className="px-2 py-3 font-semibold text-orange-500">{fmtQty(card.quality?.rework_qty, uom)}</td>
                  <td className="px-2 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        card.quality?.status === "Approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {card.quality?.status || "Pending"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Row: Packing | Dispatch | Billing */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Packing Details" icon={Box}>
          <KV label="Packing Type" value={card.packing?.packing_type} />
          <KV label="Packed Qty" value={fmtQty(card.packing?.packed_qty, uom)} />
          <KV label="Packing Start" value={card.packing?.packing_start} />
          <KV label="Packing End" value={card.packing?.packing_end} />
        </Card>
        <Card title="Dispatch Details" icon={Truck}>
          <KV label="Dispatch Date" value={card.dispatch?.dispatch_date} />
          <KV label="Vehicle No." value={card.dispatch?.vehicle_no} />
          <KV label="Transporter" value={card.dispatch?.transporter} />
          <KV label="Dispatch Qty" value={fmtQty(card.dispatch?.dispatched_qty, uom)} />
          <KV label="DC No." value={card.dispatch?.dc_no} />
        </Card>
        <Card title="Billing Details" icon={FileText}>
          <KV label="Invoice No." value={card.billing?.invoice_no} />
          <KV label="Invoice Date" value={card.billing?.invoice_date} />
          <KV label="Invoice Amount" value={fmtMoney(card.billing?.invoice_amount)} />
          <KV label="Payment Terms" value={card.billing?.payment_terms} />
          <div className="flex items-center justify-between py-1">
            <span className="text-[12px] text-slate-500">Status</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                card.billing?.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {card.billing?.done ? "Completed" : card.billing?.status || "Pending"}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── Screenshot 1/2: Status timeline ───────────────────────────────────── */
function StatusTimeline({ timeline, closed }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-[var(--color-primary-dark)]">Job Card Status</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {(timeline || []).map((item, i, arr) => (
              <span key={item.label} className="flex items-center gap-1.5 text-[11px]">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ring-1 ${
                    item.done
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      : "bg-slate-50 text-slate-500 ring-slate-200"
                  }`}
                >
                  {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-slate-300" />}
                  {item.label}
                </span>
                {i < arr.length - 1 ? <span className="hidden text-slate-300 sm:inline">→</span> : null}
              </span>
            ))}
          </div>
        </div>
        <div
          className={`w-full shrink-0 rounded-xl px-6 py-3 text-center text-sm font-bold shadow-sm lg:w-auto ${
            closed ? "bg-[var(--color-success)] text-white" : "border border-slate-300 bg-slate-100 text-slate-700"
          }`}
        >
          {closed ? "JOB CARD CLOSED" : "JOB CARD OPEN"}
        </div>
      </div>
    </section>
  );
}

/* ── Screenshot 2: Detailed form ───────────────────────────────────────── */
function DetailForm({
  card,
  draft,
  setDraft,
  machines,
  uom,
  priority,
  roles,
  operatorMode,
  showIssue,
  showStart,
  showComplete,
  busy,
  onIssue,
  onStart,
  onComplete,
  onSave,
  onPrint,
  onClose,
}) {
  const h = card.header || {};
  const s = card.summary || {};
  const materials = card.materials || [];
  const mgr = roles.production || roles.admin;

  return (
    <div className="space-y-4">
      {/* Header — screenshot 2 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-primary-dark)]">JOB CARD</h1>
            <p className="text-sm text-slate-500">Production Order / Work Instruction</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              {card.display_status || card.status || "—"}
            </span>
            <span className="text-sm font-bold text-slate-800">
              Job Card No. <span className="text-[var(--color-primary-dark)]">{card.job_card_no}</span>
            </span>
          </div>
        </div>

        <div className={`grid gap-4 p-5 ${operatorMode ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>
          <div className="space-y-0.5">
            <KV label="Sales Order No." value={h.sales_order_no} />
            <KV label="Customer" value={h.customer} />
            <KV label="Product" value={h.product} />
            <KV label="Order Quantity" value={fmtQty(h.order_qty, uom)} />
            <KV label="Required Delivery" value={h.required_delivery} />
            <div className="flex items-center justify-between py-1">
              <span className="text-[12px] text-slate-500">Priority</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${priority.bg} ${priority.text}`}>
                {priority.label}
              </span>
            </div>
          </div>

          {!operatorMode ? (
            <>
              <div className="space-y-0.5">
                <KV label="Job Card Date" value={h.job_card_date} />
                <KV label="Planned Start" value={h.planned_start} />
                <KV label="Planned End" value={h.planned_end} />
                <KV label="Packing Time" value={h.packing_time || card.packing?.packing_start} />
                <KV label="Dispatch Date" value={h.dispatch_date || card.dispatch?.dispatch_date} />
                <KV label="Delivery Date" value={h.delivery_date} />
              </div>
              <div className="space-y-0.5">
                <KV label="Production Manager" value={h.production_manager} />
                <KV label="Department" value={h.department} />
                <KV label="Production Type" value={h.production_type || "Manufacturing"} />
                <KV label="Plant / Unit" value={h.plant} />
                <Field label="Remarks">
                  <Inp
                    value={draft.remarks}
                    onChange={(e) => setDraft((d) => ({ ...d, remarks: e.target.value }))}
                    placeholder="Optional remarks"
                    disabled={!mgr}
                  />
                </Field>
              </div>
            </>
          ) : (
            <div className="space-y-0.5">
              <KV label="Machine" value={card.machine?.machine_name} />
              <KV label="Operator" value={card.operator?.operator_name} />
              <KV label="Shift" value={card.operator?.shift} />
              <KV label="Planned Start" value={h.planned_start} />
            </div>
          )}

          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-blue-900">Summary</p>
            <KV label="Target Quantity" value={fmtQty(s.target_qty, uom)} />
            <KV label="Produced Quantity" value={fmtQty(s.produced_qty, uom)} valueClass="text-emerald-600" />
            <KV label="Rejected Quantity" value={fmtQty(s.rejected_qty, uom)} valueClass="text-rose-600" />
            <KV label="Rework Quantity" value={fmtQty(s.rework_qty, uom)} valueClass="text-orange-500" />
            <KV label="Good Quantity" value={fmtQty(s.good_qty, uom)} valueClass="text-emerald-600" />
          </div>
        </div>
      </section>

      {/* Row: Material / Machine / Operator */}
      <div className={`grid gap-4 ${operatorMode ? "" : "xl:grid-cols-3"}`}>
        <Card
          title="Material Requirement"
          icon={Package}
          action={
            showIssue ? (
              <button
                type="button"
                disabled={busy || card.has_shortage}
                onClick={onIssue}
                className="rounded-md bg-[var(--color-success)] px-3 py-1 text-xs font-bold text-white hover:bg-[var(--color-success-hover)] disabled:opacity-50"
              >
                Issue Material
              </button>
            ) : card.materials_issued ? (
              <span className="text-[10px] font-bold uppercase text-emerald-600">Issued ✓</span>
            ) : null
          }
        >
          {card.has_shortage ? (
            <div className="mb-2 flex gap-2 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-2 text-[11px] text-orange-900">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Shortage — resolve stock before production start.
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                  <th className="py-2 pr-2 font-semibold">Material</th>
                  <th className="py-2 pr-2 font-semibold">Required</th>
                  <th className="py-2 pr-2 font-semibold">Available</th>
                  <th className="py-2 pr-2 font-semibold">To Issue</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-slate-400">
                      No BOM materials linked
                    </td>
                  </tr>
                ) : (
                  materials.map((m) => (
                    <tr key={m.item_id || m.material} className="border-b border-slate-100">
                      <td className="py-2 pr-2 font-medium">{m.material}</td>
                      <td className="py-2 pr-2 tabular-nums">
                        {m.required} {m.unit}
                      </td>
                      <td className="py-2 pr-2 tabular-nums">
                        {m.available} {m.unit}
                      </td>
                      <td className="py-2 pr-2 tabular-nums">
                        {m.to_issue} {m.unit}
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            m.status === "available" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {m.status_label}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {!operatorMode ? (
          <>
            <Card title="Machine & Operation" icon={Settings2}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Machine">
                  <Sel
                    value={draft.machine_id}
                    onChange={(e) => setDraft((d) => ({ ...d, machine_id: e.target.value }))}
                    disabled={!mgr}
                  >
                    <option value="">Select machine</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.code || `Machine ${m.id}`}
                      </option>
                    ))}
                  </Sel>
                </Field>
                <Field label="Operation">
                  <Inp value={draft.operation || card.machine?.operation || "Manufacturing"} onChange={(e) => setDraft((d) => ({ ...d, operation: e.target.value }))} disabled={!mgr} />
                </Field>
                <Field label="Setup Time">
                  <Inp value={draft.setup_time} onChange={(e) => setDraft((d) => ({ ...d, setup_time: e.target.value }))} placeholder="—" disabled={!mgr} />
                </Field>
                <Field label="Start Time">
                  <Inp value={card.machine?.start_time || "—"} readOnly />
                </Field>
                <Field label="End Time">
                  <Inp value={card.machine?.end_time || "—"} readOnly />
                </Field>
                <Field label="Total Planned Hours">
                  <Inp value={draft.planned_hours || "—"} onChange={(e) => setDraft((d) => ({ ...d, planned_hours: e.target.value }))} disabled={!mgr} />
                </Field>
              </div>
            </Card>

            <Card title="Operator & Shift" icon={User}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Operator">
                  <Inp
                    value={draft.operator_name}
                    onChange={(e) => setDraft((d) => ({ ...d, operator_name: e.target.value }))}
                    disabled={!mgr}
                    placeholder="Operator name"
                  />
                </Field>
                <Field label="Assistant Operator">
                  <Inp
                    value={draft.assistant_name}
                    onChange={(e) => setDraft((d) => ({ ...d, assistant_name: e.target.value }))}
                    disabled={!mgr}
                    placeholder="—"
                  />
                </Field>
                <Field label="Shift">
                  <Sel value={draft.shift || ""} onChange={(e) => setDraft((d) => ({ ...d, shift: e.target.value }))} disabled={!mgr}>
                    <option value="">Select shift</option>
                    <option value="Day">Day Shift (9 AM - 5 PM)</option>
                    <option value="Night">Night Shift (9 PM - 5 AM)</option>
                    <option value="General">General</option>
                  </Sel>
                </Field>
                <Field label="Break Time">
                  <Inp value={draft.break_time} onChange={(e) => setDraft((d) => ({ ...d, break_time: e.target.value }))} placeholder="—" disabled={!mgr} />
                </Field>
                <Field label="Shift Start">
                  <Inp value={draft.shift_start} onChange={(e) => setDraft((d) => ({ ...d, shift_start: e.target.value }))} placeholder="—" disabled={!mgr} />
                </Field>
                <Field label="Shift End">
                  <Inp value={draft.shift_end} onChange={(e) => setDraft((d) => ({ ...d, shift_end: e.target.value }))} placeholder="—" disabled={!mgr} />
                </Field>
              </div>
            </Card>
          </>
        ) : null}
      </div>

      {/* Row: Production / QC / Packing */}
      <div className={`grid gap-4 ${operatorMode ? "" : "xl:grid-cols-3"}`}>
        <Card
          title="Production Details"
          icon={Play}
          action={
            <div className="flex gap-1.5">
              {showStart ? (
                <button type="button" disabled={busy} onClick={onStart} className="rounded-md bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50">
                  Start Job
                </button>
              ) : null}
              {showComplete ? (
                <button type="button" disabled={busy} onClick={onComplete} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-50">
                  Complete Job
                </button>
              ) : null}
            </div>
          }
        >
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Field label="Target Quantity">
              <Inp value={s.target_qty ?? ""} readOnly />
            </Field>
            <Field label="UOM">
              <Inp value={uom} readOnly />
            </Field>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <QtyBox label="Produced Qty" value={fmtQty(s.produced_qty, uom)} tone="good" />
            <QtyBox label="Rejected Qty" value={fmtQty(s.rejected_qty, uom)} tone="bad" />
            <QtyBox label="Rework Qty" value={fmtQty(s.rework_qty, uom)} tone="warn" />
            <QtyBox label="Good Qty" value={fmtQty(s.good_qty, uom)} tone="good" />
            <QtyBox label="Balance Qty" value={fmtQty(s.balance_qty, uom)} tone="info" />
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Field label="Produced Qty (update)">
              <Inp
                type="number"
                min="0"
                value={draft.produced_qty}
                onChange={(e) => setDraft((d) => ({ ...d, produced_qty: e.target.value }))}
              />
            </Field>
            <Field label="Production Start">
              <Inp value={card.production?.production_start || "—"} readOnly />
            </Field>
            <Field label="Production End">
              <Inp value={card.production?.production_end || "—"} readOnly />
            </Field>
          </div>
          <Field label="Operator Remarks">
            <textarea
              className="min-h-[72px] w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={draft.operator_remarks}
              onChange={(e) => setDraft((d) => ({ ...d, operator_remarks: e.target.value }))}
              placeholder="Notes from operator…"
            />
          </Field>
        </Card>

        {!operatorMode ? (
          <>
            <Card title="Quality Check" icon={Search}>
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <Field label="Checked By">
                  <Inp value={card.quality?.checked_by || "—"} readOnly />
                </Field>
                <Field label="Checked Date">
                  <Inp value={card.quality?.checked_date || "—"} readOnly />
                </Field>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <QtyBox label="Checked Qty" value={fmtQty(card.quality?.checked_qty, uom)} />
                <QtyBox label="Passed Qty" value={fmtQty(card.quality?.passed_qty, uom)} tone="good" />
                <QtyBox label="Rejected Qty" value={fmtQty(card.quality?.rejected_qty, uom)} tone="bad" />
                <QtyBox label="Rework Qty" value={fmtQty(card.quality?.rework_qty, uom)} tone="warn" />
              </div>
              <Field label="QC Remarks">
                <textarea
                  className="min-h-[72px] w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
                  value={card.quality?.remarks || ""}
                  readOnly
                />
              </Field>
              <div
                className={`mt-3 rounded-lg border px-3 py-2 text-center text-xs font-bold ${
                  card.quality?.status === "Approved"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {(card.quality?.status || "Pending").toUpperCase()}
              </div>
            </Card>

            <Card title="Packing Details" icon={Box}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Packing Type">
                  <Inp value={card.packing?.packing_type || "—"} readOnly />
                </Field>
                <Field label="Packed Quantity">
                  <Inp value={card.packing?.packed_qty ?? "—"} readOnly />
                </Field>
                <Field label="No. of Cartons">
                  <Inp value={card.packing?.cartons ?? "—"} readOnly />
                </Field>
                <Field label="Packed By">
                  <Inp value={card.packing?.packed_by || "—"} readOnly />
                </Field>
                <Field label="Packing Start">
                  <Inp value={card.packing?.packing_start || "—"} readOnly />
                </Field>
                <Field label="Packing End">
                  <Inp value={card.packing?.packing_end || "—"} readOnly />
                </Field>
              </div>
            </Card>
          </>
        ) : null}
      </div>

      {!operatorMode ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Dispatch Details" icon={Truck}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Dispatch Date">
                <Inp value={card.dispatch?.dispatch_date || "—"} readOnly />
              </Field>
              <Field label="Vehicle No.">
                <Inp value={card.dispatch?.vehicle_no || "—"} readOnly />
              </Field>
              <Field label="Transporter">
                <Inp value={card.dispatch?.transporter || "—"} readOnly />
              </Field>
              <Field label="DC No.">
                <Inp value={card.dispatch?.dc_no || "—"} readOnly />
              </Field>
              <Field label="Dispatched Quantity">
                <Inp value={card.dispatch?.dispatched_qty ?? "—"} readOnly />
              </Field>
            </div>
          </Card>

          <Card title="Billing / Invoice Details" icon={FileText}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Invoice No.">
                <Inp value={card.billing?.invoice_no || "—"} readOnly />
              </Field>
              <Field label="Invoice Date">
                <Inp value={card.billing?.invoice_date || "—"} readOnly />
              </Field>
              <Field label="Invoice Amount">
                <Inp value={fmtMoney(card.billing?.invoice_amount)} readOnly />
              </Field>
              <Field label="Payment Terms">
                <Inp value={card.billing?.payment_terms || "—"} readOnly />
              </Field>
              <Field label="Billed By">
                <Inp value={card.billing?.billed_by || "—"} readOnly />
              </Field>
            </div>
            <div
              className={`mt-3 rounded-lg border px-3 py-2 text-center text-xs font-bold ${
                card.billing?.done ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {(card.billing?.done ? "COMPLETED" : String(card.billing?.status || "Pending")).toUpperCase()}
            </div>
          </Card>

          <Card title="Approvals" icon={CheckCircle2}>
            {(card.approvals || []).length === 0 ? (
              <p className="text-xs text-slate-400">No approval events yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {card.approvals.map((a) => (
                  <li key={`${a.step}-${a.at}`} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{a.step}</p>
                      <p className="text-[11px] text-slate-500">
                        {a.name}
                        {a.role ? ` · ${a.role}` : ""}
                        {a.at ? ` · ${a.at}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {/* Notes + actions — screenshot 2 footer */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[var(--color-primary-dark)]">
              Notes / Instructions
            </h3>
            <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-600">
              {(card.notes || []).map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ol>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={onPrint} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button type="button" disabled={busy} onClick={onSave} className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
              <Save className="h-4 w-4" /> Save
            </button>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <X className="h-4 w-4" /> Back to list
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}


/* ── List ──────────────────────────────────────────────────────────────── */
function JobCardList({ rows, loading, onOpen, onCreate, canCreate }) {
  if (loading) return <Loader />;
  if (!rows.length) {
    return (
      <EmptyState
        title="No job cards yet"
        description="Job Cards mirror live Work Orders. Create one to open the workflow and form views."
        actionLabel={canCreate ? "New Job Card" : "Go to Work Orders"}
        onAction={canCreate ? onCreate : undefined}
        actionHref={canCreate ? undefined : "/production/work-orders"}
      />
    );
  }
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Job Card</th>
              <th className="px-4 py-3 font-semibold">Customer / Product</th>
              <th className="px-4 py-3 font-semibold">Qty</th>
              <th className="px-4 py-3 font-semibold">Machine</th>
              <th className="px-4 py-3 font-semibold">Operator</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = priorityBadge(r.priority);
              return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{r.job_card_no}</p>
                    <p className="text-[11px] text-slate-500">{r.production_order_number || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.customer_name || "—"}</p>
                    <p className="text-[11px] text-slate-500">{r.product_name || "—"}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {Number(r.produced_quantity || 0).toLocaleString()} / {Number(r.planned_quantity || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{r.machine_name || "—"}</td>
                  <td className="px-4 py-3">{r.operator_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-700">
                      {r.display_status || r.status}
                    </span>
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.bg} ${p.text}`}>{p.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white" onClick={() => onOpen(r.id)}>
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function JobCard() {
  const [params, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  const { user } = useAuth();
  const roles = roleFlags(user);
  const operatorMode = roles.operator && !roles.admin && !roles.production;
  const canCreate = !operatorMode && (roles.production || roles.admin);

  const woId = params.get("id");
  const viewParam = params.get("view") === "form" ? "form" : "overview";
  const [list, setList] = useState([]);
  const [card, setCard] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({
    machine_id: "",
    operator_name: "",
    assistant_name: "",
    shift: "",
    produced_qty: "",
    remarks: "",
    operator_remarks: "",
    operation: "",
    setup_time: "",
    planned_hours: "",
    break_time: "",
    shift_start: "",
    shift_end: "",
  });

  const setView = (v) => {
    const next = new URLSearchParams(params);
    if (v === "form") next.set("view", "form");
    else next.delete("view");
    setSearchParams(next);
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getJobCards();
      setList(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      addToast(e?.response?.data?.detail || "Failed to load job cards", "error");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const loadCard = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const [cardRes, machRes] = await Promise.all([
          getJobCard(id),
          getMachines().catch(() => ({ data: [] })),
        ]);
        const data = cardRes?.data;
        if (!data) throw new Error("not found");
        setCard(data);
        setMachines(Array.isArray(machRes?.data) ? machRes.data : []);
        setDraft((d) => ({
          ...d,
          machine_id: data.machine?.machine_id ? String(data.machine.machine_id) : "",
          operator_name: data.operator?.operator_name || "",
          shift: data.operator?.shift || "",
          produced_qty: data.production?.produced_qty != null ? String(data.production.produced_qty) : "",
          operation: data.machine?.operation || "Manufacturing",
        }));
      } catch (e) {
        addToast(e?.response?.data?.detail || "Failed to load job card", "error");
        setCard(null);
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    if (woId) loadCard(woId);
    else loadList();
  }, [woId, loadCard, loadList]);

  const openCard = (id) => setSearchParams({ id: String(id) });
  const closeCard = () => {
    setCard(null);
    setSearchParams({});
  };

  const runAction = async (fn, okMsg) => {
    if (!woId || busy) return;
    setBusy(true);
    try {
      await fn();
      addToast(okMsg, "success");
      notifyManufacturingSpine(MANUFACTURING_EVENTS.WORK_ORDER_CHANGED);
      await loadCard(woId);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      addToast(typeof detail === "string" ? detail : detail?.message || e.message || "Action failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleIssue = () => runAction(() => issueWorkOrderMaterials(woId), "Materials issued — inventory updated");
  const handleStart = () => runAction(() => startWorkOrder(woId), "Production started");
  const handleComplete = () => runAction(() => completeWorkOrder(woId), "Production completed");
  const handleSave = async () => {
    if (!woId || busy) return;
    const payload = {};
    if (!operatorMode) {
      if (draft.machine_id) payload.machine_id = Number(draft.machine_id);
      if (draft.shift) payload.shift = draft.shift;
      if (draft.operator_name) payload.operator_name = draft.operator_name;
    }
    if (draft.produced_qty !== "" && draft.produced_qty != null) {
      payload.actual_quantity = Number(draft.produced_qty);
    }
    if (Object.keys(payload).length === 0) {
      addToast("Nothing to save — change quantity, machine, operator, or shift first", "info");
      return;
    }
    await runAction(async () => {
      await updateWorkOrder(woId, null, payload);
    }, "Job card saved");
  };

  if (!woId) {
    return (
      <div className="space-y-5 pb-6">
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--color-primary-dark)]">Job Cards</h2>
              <p className="text-xs text-slate-500">Same workflow + form as the Job Card reference — live work orders</p>
            </div>
            <div className="flex gap-2">
              <Link to="/production/work-orders" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                Work Orders
              </Link>
              {canCreate ? (
                <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white">
                  <Plus className="h-3.5 w-3.5" /> New Job Card
                </button>
              ) : null}
            </div>
          </div>
        </section>
        <JobCardList rows={list} loading={loading} onOpen={openCard} canCreate={canCreate} onCreate={() => setShowCreate(true)} />
        {showCreate ? (
          <QuickWorkOrderModal
            onClose={() => setShowCreate(false)}
            addToast={addToast}
            onSuccess={(created) => {
              setShowCreate(false);
              notifyManufacturingSpine(MANUFACTURING_EVENTS.WORK_ORDER_CHANGED);
              loadList().then(() => {
                if (created?.id && !String(created.id).startsWith("wo-")) {
                  setSearchParams({ id: String(created.id) });
                }
              });
            }}
          />
        ) : null}
      </div>
    );
  }

  if (loading && !card) return <Loader />;
  if (!card) {
    return (
      <EmptyState title="Job card not found" description="This work order may have been removed or you do not have access." actionLabel="Back to list" onAction={closeCard} />
    );
  }

  const header = card.header || {};
  const summary = card.summary || {};
  const uom = header.uom || "Nos";
  const status = (card.status || "").toLowerCase();
  const showIssue = (roles.store || roles.production || roles.admin) && canWoIssueMaterials(status, card.materials_issued);
  const showStart =
    (roles.operator || roles.production || roles.admin) &&
    (card.can_start_production || canWoStart(status)) &&
    card.materials_issued;
  const showComplete =
    (roles.operator || roles.production || roles.admin) &&
    (card.can_complete_production || canWoComplete(status));
  const progressPct = Math.min(100, Math.max(0, Number(summary.progress_pct || 0)));
  const priority = priorityBadge(card.priority);
  const view = operatorMode ? "form" : viewParam;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {!operatorMode ? (
            <>
              <button
                type="button"
                onClick={() => setView("overview")}
                aria-pressed={view === "overview"}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${view === "overview" ? "bg-[var(--color-primary)] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                Workflow Overview
              </button>
              <button
                type="button"
                onClick={() => setView("form")}
                aria-pressed={view === "form"}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${view === "form" ? "bg-[var(--color-primary)] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                Job Card Form
              </button>
            </>
          ) : (
            <span className="px-3 py-1.5 text-xs font-bold text-slate-600">My Job Card</span>
          )}
        </div>
        <button type="button" onClick={closeCard} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
          ← Back to list
        </button>
      </div>

      {!operatorMode ? <WorkflowRibbon workflow={card.workflow} /> : null}

      {view === "overview" && !operatorMode ? (
        <OverviewDashboard card={card} uom={uom} priority={priority} progressPct={progressPct} />
      ) : (
        <DetailForm
          card={card}
          draft={draft}
          setDraft={setDraft}
          machines={machines}
          uom={uom}
          priority={priority}
          roles={roles}
          operatorMode={operatorMode}
          showIssue={showIssue}
          showStart={showStart}
          showComplete={showComplete}
          busy={busy}
          onIssue={handleIssue}
          onStart={handleStart}
          onComplete={handleComplete}
          onSave={handleSave}
          onPrint={() => window.print()}
          onClose={closeCard}
        />
      )}

      <StatusTimeline timeline={card.status_timeline} closed={card.closed} />
    </div>
  );
}

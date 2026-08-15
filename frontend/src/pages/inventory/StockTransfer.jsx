import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Eye,
  Filter,
  MoreVertical,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";

import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../context/ToastContext";
import {
  createStockTransfer,
  getInventoryDashboard,
  getStockTransfers,
  getWarehouses,
  updateStockTransferStatus,
} from "../../api/inventoryApi";
import usePageRefresh from "../../hooks/usePageRefresh";
import { asArray } from "../../utils/apiError";

const STATUS_TONE = {
  draft: "neutral",
  pending_approval: "warning",
  pending: "warning",
  approved: "success",
  in_transit: "info",
  received: "success",
  completed: "success",
  rejected: "danger",
  cancelled: "danger",
};

const STATUS_LABEL = {
  draft: "Draft",
  pending_approval: "Pending",
  pending: "Pending",
  approved: "Approved",
  in_transit: "In Transit",
  received: "Received",
  completed: "Completed",
  rejected: "Cancelled",
  cancelled: "Cancelled",
};

const STEPS = [
  { id: 1, label: "Transfer Details" },
  { id: 2, label: "Select Items" },
  { id: 3, label: "Review & Confirm" },
];

const MOCKUP_TRANSFERS = [
  { id: "t1", transfer_number: "TRF-2026-0054", transfer_date: "2026-08-13", from_warehouse: "Main Warehouse", to_warehouse: "Unit-2 Warehouse", item_name: "PET Resin", items: 1, quantity: 500, status: "pending", expected_date: "2026-08-15", created_by: "Raj K.", live: false },
  { id: "t2", transfer_number: "TRF-2026-0053", transfer_date: "2026-08-12", from_warehouse: "Main Warehouse", to_warehouse: "FG Store", item_name: "HDPE Caps", items: 2, quantity: 1200, status: "approved", expected_date: "2026-08-14", created_by: "Store Admin", live: false },
  { id: "t3", transfer_number: "TRF-2026-0052", transfer_date: "2026-08-12", from_warehouse: "RM Store", to_warehouse: "Main Warehouse", item_name: "PP Granules", items: 1, quantity: 750, status: "in_transit", expected_date: "2026-08-13", created_by: "Raj K.", live: false },
  { id: "t4", transfer_number: "TRF-2026-0051", transfer_date: "2026-08-11", from_warehouse: "Unit-2 Warehouse", to_warehouse: "Main Warehouse", item_name: "Label Roll", items: 3, quantity: 40, status: "completed", expected_date: "2026-08-12", created_by: "Ops Team", live: false },
  { id: "t5", transfer_number: "TRF-2026-0050", transfer_date: "2026-08-10", from_warehouse: "Main Warehouse", to_warehouse: "Unit-1 Warehouse", item_name: "Carton Box", items: 1, quantity: 200, status: "draft", expected_date: "2026-08-12", created_by: "Raj K.", live: false },
  { id: "t6", transfer_number: "TRF-2026-0049", transfer_date: "2026-08-09", from_warehouse: "FG Store", to_warehouse: "Main Warehouse", item_name: "Shrink Film", items: 1, quantity: 80, status: "cancelled", expected_date: "2026-08-10", created_by: "Store Admin", live: false },
  { id: "t7", transfer_number: "TRF-2026-0048", transfer_date: "2026-08-08", from_warehouse: "Main Warehouse", to_warehouse: "Unit-2 Warehouse", item_name: "Ink Cyan", items: 2, quantity: 15, status: "completed", expected_date: "2026-08-09", created_by: "Raj K.", live: false },
];

const emptyForm = {
  transfer_number: "",
  transfer_date: "2026-08-13",
  reference: "",
  from_warehouse_id: "",
  to_warehouse_id: "",
  expected_date: "2026-08-15",
  remarks: "",
  item_id: "",
  batch_number: "",
  quantity: "",
};

function formatInrAmount(value) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatQty(value) {
  return Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}

function warehouseValue(wh) {
  if (!wh) return 0;
  return Number(wh.inventory_value ?? wh.stock_value ?? wh.used_capacity ?? 0) || 0;
}

export default function StockTransfer() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [headerDate, setHeaderDate] = useState("2026-08-13");
  const [headerWarehouse, setHeaderWarehouse] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [trRes, whRes, itemsRes] = await Promise.allSettled([
        getStockTransfers(),
        getWarehouses(),
        getInventoryDashboard(),
      ]);
      if (trRes.status === "fulfilled") setTransfers(asArray(trRes.value?.data));
      else setTransfers([]);
      if (whRes.status === "fulfilled") setWarehouses(asArray(whRes.value?.data));
      if (itemsRes.status === "fulfilled") setItems(asArray(itemsRes.value?.data));
    } finally {
      setLoading(false);
    }
  }, []);

  usePageRefresh(() => load(true));
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!headerWarehouse && warehouses.length) setHeaderWarehouse(String(warehouses[0].id));
    if (!form.from_warehouse_id && warehouses.length) {
      setForm((f) => ({
        ...f,
        from_warehouse_id: String(warehouses[0].id),
        to_warehouse_id: warehouses[1] ? String(warehouses[1].id) : "",
      }));
    }
  }, [warehouses, headerWarehouse, form.from_warehouse_id]);

  const fromWh = warehouses.find((w) => String(w.id) === String(form.from_warehouse_id));
  const toWh = warehouses.find((w) => String(w.id) === String(form.to_warehouse_id));
  const selectedItem = items.find((i) => String(i.id) === String(form.item_id));

  const qty = Number(form.quantity) || 0;
  const unitCost = Number(selectedItem?.unit_cost ?? selectedItem?.average_cost ?? 0) || 0;
  const lineValue = qty * unitCost;

  const canNextFromDetails =
    form.from_warehouse_id &&
    form.to_warehouse_id &&
    form.from_warehouse_id !== form.to_warehouse_id &&
    form.transfer_date &&
    form.expected_date;

  const canNextFromItems = form.item_id && qty > 0;

  const displayTransfers = useMemo(() => {
    if (transfers.length) {
      return transfers.map((t) => ({
        ...t,
        items: 1,
        expected_date: t.expected_date || t.transfer_date,
        created_by: t.approved_by || t.created_by || "—",
        live: true,
      }));
    }
    return MOCKUP_TRANSFERS;
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    let rows = displayTransfers;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.transfer_number, r.from_warehouse, r.to_warehouse, r.item_name].some(
          (v) => v && String(v).toLowerCase().includes(q)
        )
      );
    }
    if (statusFilter) {
      rows = rows.filter((r) => {
        const st = String(r.status || "").toLowerCase();
        if (statusFilter === "pending") return st === "pending" || st === "pending_approval";
        return st === statusFilter;
      });
    }
    return rows;
  }, [displayTransfers, search, statusFilter]);

  const resetForm = () => {
    setForm({
      ...emptyForm,
      from_warehouse_id: warehouses[0] ? String(warehouses[0].id) : "",
      to_warehouse_id: warehouses[1] ? String(warehouses[1].id) : "",
    });
    setStep(1);
  };

  const handleSubmit = async () => {
    if (form.from_warehouse_id === form.to_warehouse_id) {
      addToast("From & To warehouses must differ", "error");
      return;
    }
    if (!canNextFromItems) {
      addToast("Select an item and quantity", "error");
      return;
    }
    setSubmitting(true);
    try {
      const notes = [form.reference ? `Ref: ${form.reference}` : "", form.remarks, form.expected_date ? `Expected: ${form.expected_date}` : ""]
        .filter(Boolean)
        .join(" | ");
      await createStockTransfer({
        transfer_number: form.transfer_number || null,
        transfer_date: form.transfer_date || null,
        from_warehouse_id: Number(form.from_warehouse_id),
        to_warehouse_id: Number(form.to_warehouse_id),
        item_id: Number(form.item_id),
        batch_number: form.batch_number || null,
        quantity: Number(form.quantity),
        notes: notes || null,
      });
      addToast("Transfer created — pending approval");
      resetForm();
      setShowForm(false);
      load();
    } catch {
      addToast("Transfer failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (transferId, newStatus) => {
    if (typeof transferId !== "number") return;
    setUpdatingId(transferId);
    try {
      await updateStockTransferStatus(transferId, {
        status: newStatus,
        approved_by: "Store Manager",
      });
      addToast(`Transfer updated to ${STATUS_LABEL[newStatus] || newStatus.replace(/_/g, " ")}`);
      await load();
    } catch {
      addToast("Failed to update status", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const historyColumns = [
    {
      key: "transfer_number",
      label: "Transfer No.",
      render: (r) => <span className="font-semibold tabular-nums text-[var(--color-text)]">{r.transfer_number}</span>,
    },
    {
      key: "transfer_date",
      label: "Date",
      render: (r) => <span className="whitespace-nowrap text-[12px] text-[var(--color-text-secondary)]">{formatDate(r.transfer_date)}</span>,
    },
    {
      key: "from_warehouse",
      label: "From Warehouse",
      render: (r) => <span className="text-[13px] text-[var(--color-text)]">{r.from_warehouse || "—"}</span>,
    },
    {
      key: "to_warehouse",
      label: "To Warehouse",
      render: (r) => <span className="text-[13px] text-[var(--color-text)]">{r.to_warehouse || "—"}</span>,
    },
    {
      key: "items",
      label: "Items",
      render: (r) => <span className="tabular-nums text-[13px]">{r.items ?? 1}</span>,
    },
    {
      key: "quantity",
      label: "Quantity",
      render: (r) => <span className="tabular-nums text-[13px] font-semibold">{formatQty(r.quantity)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => {
        const st = String(r.status || "").toLowerCase();
        return (
          <StatusBadge tone={STATUS_TONE[st] || "neutral"}>
            {STATUS_LABEL[st] || String(r.status || "—").replace(/_/g, " ")}
          </StatusBadge>
        );
      },
    },
    {
      key: "expected_date",
      label: "Expected Date",
      render: (r) => <span className="whitespace-nowrap text-[12px] text-[var(--color-text-secondary)]">{formatDate(r.expected_date)}</span>,
    },
    {
      key: "created_by",
      label: "Created By",
      render: (r) => <span className="text-[13px] text-[var(--color-text-secondary)]">{r.created_by || "—"}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => {
        const isBusy = updatingId === r.id;
        const st = String(r.status || "").toLowerCase();
        return (
          <div className="flex items-center gap-1">
            {r.live && (st === "pending_approval" || st === "pending") ? (
              <>
                <Button type="button" variant="success" size="sm" disabled={isBusy} onClick={() => handleStatusChange(r.id, "approved")} title="Approve">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="danger" size="sm" disabled={isBusy} onClick={() => handleStatusChange(r.id, "rejected")} title="Reject">
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : null}
            {r.live && st === "approved" ? (
              <Button type="button" variant="primary" size="sm" disabled={isBusy} onClick={() => handleStatusChange(r.id, "in_transit")} title="Dispatch">
                <Truck className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {r.live && st === "in_transit" ? (
              <Button type="button" variant="success" size="sm" disabled={isBusy} onClick={() => handleStatusChange(r.id, "completed")} title="Complete">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <button type="button" className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="View" title="View">
              <Eye className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Print" title="Print">
              <Printer className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="More" title="More">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  if (loading) return <Loader label="Loading stock transfers…" />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Stock Transfer"
        showTitle
        subtitle="Transfer stock between warehouses."
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
              value={headerWarehouse}
              onChange={(e) => setHeaderWarehouse(e.target.value)}
              className="ui-select !w-auto min-w-[11rem]"
              aria-label="Warehouse"
            >
              {warehouses.length ? (
                warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))
              ) : (
                <option value="">Main Warehouse</option>
              )}
            </select>
          </div>
        }
      />

      {showForm ? (
        <section className="ui-card p-4 sm:p-5">
          {/* Stepper */}
          <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-[var(--color-border-soft)] pb-4">
            {STEPS.map((s, i) => {
              const active = step === s.id;
              const done = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        active || done
                          ? "bg-[var(--color-success)] text-white"
                          : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {s.id}
                    </span>
                    <span className={`text-sm font-semibold ${active ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 ? <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)]" /> : null}
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
            <div>
              {step === 1 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm">
                    <span className="ui-label">Transfer No.</span>
                    <input value="Auto generated" readOnly className="ui-input bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" />
                  </label>
                  <label className="text-sm">
                    <span className="ui-label">Transfer Date</span>
                    <input
                      type="date"
                      value={form.transfer_date}
                      onChange={(e) => setForm((f) => ({ ...f, transfer_date: e.target.value }))}
                      className="ui-input"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="ui-label">Reference (Optional)</span>
                    <input
                      placeholder="Enter reference"
                      value={form.reference}
                      onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                      className="ui-input"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="ui-label">Source Warehouse *</span>
                    <select
                      value={form.from_warehouse_id}
                      onChange={(e) => setForm((f) => ({ ...f, from_warehouse_id: e.target.value }))}
                      className="ui-select"
                    >
                      <option value="">Select source</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                      {!warehouses.length ? <option value="main">Main Warehouse</option> : null}
                    </select>
                    <span className="mt-1 block text-xs font-medium text-[var(--color-success)]">
                      Available:{" "}
                      {fromWh
                        ? formatInrAmount(warehouseValue(fromWh))
                        : warehouses.length
                          ? "—"
                          : formatInrAmount(2845210)}
                    </span>
                  </label>

                  <label className="text-sm">
                    <span className="ui-label">Destination Warehouse *</span>
                    <select
                      value={form.to_warehouse_id}
                      onChange={(e) => setForm((f) => ({ ...f, to_warehouse_id: e.target.value }))}
                      className="ui-select"
                    >
                      <option value="">Select destination</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                      {!warehouses.length ? <option value="unit2">Unit-2 Warehouse</option> : null}
                    </select>
                    <span className="mt-1 block text-xs font-medium text-[var(--color-success)]">
                      Available:{" "}
                      {toWh
                        ? formatInrAmount(warehouseValue(toWh))
                        : warehouses.length
                          ? "—"
                          : formatInrAmount(1275430)}
                    </span>
                  </label>

                  <label className="text-sm">
                    <span className="ui-label">Expected Date *</span>
                    <input
                      type="date"
                      value={form.expected_date}
                      onChange={(e) => setForm((f) => ({ ...f, expected_date: e.target.value }))}
                      className="ui-input"
                    />
                  </label>

                  <label className="text-sm sm:col-span-2 lg:col-span-3">
                    <span className="ui-label">Remarks</span>
                    <textarea
                      value={form.remarks}
                      maxLength={250}
                      onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                      className="ui-input"
                      rows={3}
                      placeholder="Add remarks…"
                    />
                    <span className="mt-1 block text-right text-[11px] text-[var(--color-text-muted)]">
                      {form.remarks.length} / 250
                    </span>
                  </label>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm sm:col-span-2">
                    <span className="ui-label">Item *</span>
                    <select
                      value={form.item_id}
                      onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))}
                      className="ui-select"
                    >
                      <option value="">Select item</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.sku ? `${i.sku} — ` : ""}{i.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="ui-label">Quantity *</span>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                      className="ui-input"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="ui-label">Batch (Optional)</span>
                    <input
                      value={form.batch_number}
                      onChange={(e) => setForm((f) => ({ ...f, batch_number: e.target.value }))}
                      className="ui-input"
                    />
                  </label>
                  {selectedItem ? (
                    <p className="sm:col-span-2 text-xs text-[var(--color-text-muted)]">
                      Available stock:{" "}
                      <span className="font-semibold text-[var(--color-text)]">
                        {Number(selectedItem.total_quantity ?? selectedItem.quantity ?? 0).toLocaleString("en-IN")}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {step === 3 ? (
                <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]/40 p-4 text-sm">
                  <h3 className="mb-3 font-semibold text-[var(--color-text)]">Review transfer</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-[var(--color-text-muted)]">From</dt>
                      <dd className="font-medium">{fromWh?.name || "Main Warehouse"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-text-muted)]">To</dt>
                      <dd className="font-medium">{toWh?.name || "Unit-2 Warehouse"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-text-muted)]">Transfer Date</dt>
                      <dd className="font-medium">{formatDate(form.transfer_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-text-muted)]">Expected Date</dt>
                      <dd className="font-medium">{formatDate(form.expected_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-text-muted)]">Item</dt>
                      <dd className="font-medium">{selectedItem?.name || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-text-muted)]">Quantity</dt>
                      <dd className="font-semibold tabular-nums">{formatQty(qty)}</dd>
                    </div>
                    {form.reference ? (
                      <div>
                        <dt className="text-xs text-[var(--color-text-muted)]">Reference</dt>
                        <dd className="font-medium">{form.reference}</dd>
                      </div>
                    ) : null}
                    {form.remarks ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-[var(--color-text-muted)]">Remarks</dt>
                        <dd className="font-medium">{form.remarks}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {step > 1 ? (
                  <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
                    Back
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={() => { resetForm(); setShowForm(false); }}>
                    Cancel
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={step === 1 ? !canNextFromDetails : !canNextFromItems}
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Next: {STEPS[step]?.label} <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" variant="primary" loading={submitting} disabled={submitting || !canNextFromItems} onClick={handleSubmit}>
                    Confirm Transfer
                  </Button>
                )}
              </div>
            </div>

            <aside className="h-fit rounded-xl border border-[var(--color-success)]/25 bg-[#ecfdf5] p-4">
              <div className="mb-3 flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-[var(--color-success)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Transfer Summary</h3>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[var(--color-text-muted)]">Total Items</dt>
                  <dd className="font-semibold tabular-nums">{form.item_id ? 1 : 0}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[var(--color-text-muted)]">Total Quantity</dt>
                  <dd className="font-semibold tabular-nums">{formatQty(qty)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-[var(--color-success)]/20 pt-3">
                  <dt className="text-[var(--color-text-muted)]">Total Value</dt>
                  <dd className="font-bold tabular-nums text-[var(--color-text)]">{formatInrAmount(lineValue)}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>
      ) : null}

      <section className="ui-card p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Recent Transfers</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 xl:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="search"
                placeholder="Search by transfer no., warehouse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ui-input w-full !pl-9"
              />
            </div>
            <Button type="button" variant="secondary" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-4 w-4" /> Filters
            </Button>
            {showFilters ? (
              <>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ui-select !w-auto min-w-[8.5rem]">
                  <option value="">Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="in_transit">In Transit</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Button type="button" variant="ghost" onClick={() => { setSearch(""); setStatusFilter(""); }}>
                  <RefreshCw className="h-4 w-4" /> Clear
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setShowForm(true);
                setStep(1);
              }}
            >
              <Plus className="h-4 w-4" /> New Transfer
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
          <DataTable
            columns={historyColumns}
            data={filteredTransfers}
            showSearch={false}
            pageSize={10}
            emptyState={
              <EmptyState
                icon="clipboard"
                title="No transfers yet"
                description="Create a transfer to move stock between warehouses."
                actionLabel="New Transfer"
                onAction={() => { setShowForm(true); setStep(1); }}
              />
            }
          />
        </div>
      </section>
    </div>
  );
}

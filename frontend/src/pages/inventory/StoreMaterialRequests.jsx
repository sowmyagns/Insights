import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { CheckCircle2, Plus, XCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import StoreManagerNav from "../../components/inventory/StoreManagerNav";
import { useToast } from "../../context/ToastContext";
import {
  approveStoreMaterialRequest,
  confirmStoreMaterialReceived,
  consumeStoreMaterial,
  createStoreMaterialRequest,
  getInventoryDashboard,
  getStoreMaterialRequests,
  getWarehouses,
  issueStoreMaterial,
  rejectStoreMaterialRequest,
} from "../../api/inventoryApi";
import {
  MANUFACTURING_EVENTS,
  notifyManufacturingSpine,
} from "../../utils/manufacturingEvents";
import IssueMaterialsModal from "../../components/production/IssueMaterialsModal";

const STATUS_CLS = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-blue-50 text-blue-800 ring-blue-200",
  issued: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  received: "bg-teal-50 text-teal-800 ring-teal-200",
  closed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-red-50 text-red-800 ring-red-200",
};

function itemLabel(item) {
  const code = item.product_code || item.code || item.item_code;
  const name = item.name || "Item";
  return code ? `${code} — ${name}` : name;
}

/**
 * mode: "requests" | "issue"
 * - requests: create + full list
 * - issue: focus on pending/approved ready to issue
 */
export default function StoreMaterialRequests({ mode = "requests" }) {
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const issueMode = mode === "issue" || searchParams.get("view") === "issue";

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showForm, setShowForm] = useState(!issueMode);
  const [consumeRow, setConsumeRow] = useState(null);
  const [consumeForm, setConsumeForm] = useState({ used_qty: "", waste_qty: "0", returned_qty: "0" });
  const [form, setForm] = useState({
    warehouse_id: "",
    item_id: "",
    quantity: "",
    operator_name: "",
    employee_id: "",
    machine: "",
    shift: "",
    reason: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = issueMode ? undefined : undefined;
      const [reqRes, itemsRes, whRes] = await Promise.allSettled([
        getStoreMaterialRequests(status),
        getInventoryDashboard(),
        getWarehouses(),
      ]);

  usePageRefresh(load);

      let list = reqRes.status === "fulfilled" ? reqRes.value?.data || [] : [];
      if (issueMode) {
        list = list.filter((r) => ["pending", "approved", "issued", "received"].includes(r.status));
      }
      setRows(list);
      setItems(itemsRes.status === "fulfilled" ? itemsRes.value?.data || [] : []);
      setWarehouses(whRes.status === "fulfilled" ? whRes.value?.data || [] : []);
    } finally {
      setLoading(false);
    }
  }, [issueMode]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === "pending").length,
    [rows]
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createStoreMaterialRequest({
        warehouse_id: Number(form.warehouse_id),
        item_id: Number(form.item_id),
        quantity: Number(form.quantity),
        operator_name: form.operator_name,
        employee_id: form.employee_id || null,
        machine: form.machine || null,
        shift: form.shift || null,
        reason: form.reason || null,
      });
      addToast("Material request submitted — Pending");
      setForm({
        warehouse_id: "",
        item_id: "",
        quantity: "",
        operator_name: "",
        employee_id: "",
        machine: "",
        shift: "",
        reason: "",
      });
      setShowForm(false);
      load();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Could not create request", "error");
    }
  };

  const runAction = async (id, action, payload) => {
    setBusyId(id);
    try {
      if (action === "approve") await approveStoreMaterialRequest(id, payload);
      if (action === "reject") await rejectStoreMaterialRequest(id, payload);
      if (action === "issue") {
        await issueStoreMaterial(id, payload);
        notifyManufacturingSpine(MANUFACTURING_EVENTS.MATERIALS_ISSUED, { request_id: id });
        notifyManufacturingSpine(MANUFACTURING_EVENTS.INVENTORY_CHANGED, { request_id: id });
      }
      if (action === "confirm") await confirmStoreMaterialReceived(id, payload);
      addToast("Updated successfully");
      load();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Action failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleConsume = async (e) => {
    e.preventDefault();
    if (!consumeRow) return;
    setBusyId(consumeRow.id);
    try {
      await consumeStoreMaterial(consumeRow.id, {
        used_qty: Number(consumeForm.used_qty || 0),
        waste_qty: Number(consumeForm.waste_qty || 0),
        returned_qty: Number(consumeForm.returned_qty || 0),
      });
      notifyManufacturingSpine(MANUFACTURING_EVENTS.INVENTORY_CHANGED, {
        request_id: consumeRow.id,
      });
      addToast("Consumption recorded — returned stock added back if any");
      setConsumeRow(null);
      load();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Consumption failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    { key: "request_number", label: "Request No", render: (r) => <span className="font-mono text-xs font-semibold">{r.request_number}</span> },
    { key: "item_name", label: "Material" },
    { key: "quantity", label: "Qty", render: (r) => <span className="font-semibold tabular-nums">{r.quantity}</span> },
    { key: "operator_name", label: "Operator" },
    { key: "machine", label: "Machine", render: (r) => r.machine || "—" },
    { key: "warehouse_name", label: "Warehouse" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${STATUS_CLS[r.status] || STATUS_CLS.pending}`}>
          {r.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => {
        const busy = busyId === r.id;
        return (
          <div className="flex flex-wrap gap-1">
            {r.status === "pending" && (
              <>
                <button type="button" disabled={busy} onClick={() => runAction(r.id, "approve")} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                  <CheckCircle2 className="mr-0.5 inline h-3 w-3" /> Approve
                </button>
                <button type="button" disabled={busy} onClick={() => runAction(r.id, "reject")} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                  <XCircle className="mr-0.5 inline h-3 w-3" /> Reject
                </button>
                <button type="button" disabled={busy} onClick={() => runAction(r.id, "issue")} className="rounded-lg bg-[var(--color-primary)] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                  Issue
                </button>
              </>
            )}
            {r.status === "approved" && (
              <button type="button" disabled={busy} onClick={() => runAction(r.id, "issue")} className="rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">
                Issue Material
              </button>
            )}
            {r.status === "issued" && (
              <button type="button" disabled={busy} onClick={() => runAction(r.id, "confirm")} className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">
                Confirm Received
              </button>
            )}
            {(r.status === "issued" || r.status === "received") && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConsumeRow(r);
                  setConsumeForm({
                    used_qty: String(r.issued_qty || r.quantity),
                    waste_qty: "0",
                    returned_qty: "0",
                  });
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                Record Use
              </button>
            )}
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <StoreManagerNav />
        <Loader label="Loading material requests…" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <StoreManagerNav />

      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-500">
            {issueMode
              ? "Approve and issue materials to production. Stock reduces automatically."
              : "Operators submit requests digitally — no paper notebooks."}
          </p>
          {!issueMode && pendingCount > 0 ? (
            <p className="mt-2 text-sm font-semibold text-amber-700">{pendingCount} pending request(s)</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {issueMode ? (
            <button type="button" onClick={() => setShowIssueModal(true)} className="ui-btn-primary">
              <Plus className="h-4 w-4" /> Issue Materials Form
            </button>
          ) : (
            <button type="button" onClick={() => setShowForm((v) => !v)} className="ui-btn-primary">
              <Plus className="h-4 w-4" /> New Request
            </button>
          )}
        </div>
      </header>

      {showForm && !issueMode && (
        <form onSubmit={handleCreate} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            Operator Name
            <input required value={form.operator_name} onChange={(e) => setForm((f) => ({ ...f, operator_name: e.target.value }))} placeholder="e.g. Ramesh" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            Employee ID
            <input value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            Machine
            <input value={form.machine} onChange={(e) => setForm((f) => ({ ...f, machine: e.target.value }))} placeholder="Extruder-01" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            Warehouse
            <select required value={form.warehouse_id} onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">Select</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Material
            <select required value={form.item_id} onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">Select</option>
              {items.map((i) => <option key={i.id} value={i.id}>{itemLabel(i)}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Required Quantity
            <input type="number" min="1" required value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            Shift
            <input value={form.shift} onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))} placeholder="A / B / C" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </label>
          <label className="text-sm sm:col-span-2">
            Reason
            <input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Today's Production" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className="ui-btn-primary">Submit Request</button>
          </div>
        </form>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <DataTable columns={columns} data={rows} showSearch pageSize={10} />
      </section>

      {consumeRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleConsume} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Material Consumption</h3>
            <p className="text-sm text-slate-500">
              {consumeRow.item_name} — Issued {consumeRow.issued_qty || consumeRow.quantity}
            </p>
            <label className="block text-sm">
              Used
              <input type="number" min="0" required value={consumeForm.used_qty} onChange={(e) => setConsumeForm((f) => ({ ...f, used_qty: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Waste
              <input type="number" min="0" value={consumeForm.waste_qty} onChange={(e) => setConsumeForm((f) => ({ ...f, waste_qty: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Returned to Store
              <input type="number" min="0" value={consumeForm.returned_qty} onChange={(e) => setConsumeForm((f) => ({ ...f, returned_qty: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="ui-btn-primary flex-1">Save</button>
              <button type="button" onClick={() => setConsumeRow(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showIssueModal && (
        <IssueMaterialsModal
          onClose={() => setShowIssueModal(false)}
          onSuccess={() => load()}
          addToast={addToast}
        />
      )}
    </div>
  );
}

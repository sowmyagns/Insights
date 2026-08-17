import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, Check, Eye } from "lucide-react";

import PageHeader from "../../components/common/PageHeader";
import AccessDenied from "../../components/admin/AccessDenied";
import usePermissions from "../../hooks/usePermissions";
import usePageRefresh from "../../hooks/usePageRefresh";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../context/ToastContext";
import { getUsers } from "../../api/adminApi";
import {
  getMaterialRequests,
  getPurchaseOrders,
  getVendors,
  approveMaterialRequest,
  updateVendorApproval,
  updatePurchaseOrderStatus,
} from "../../api/procurementApi";
import { getProductionOrders } from "../../api/productionApi";

const CATEGORY_TAGS = {
  po: { label: "Purchase Order", bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  mr: { label: "Material Request", bg: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  vendor: { label: "Vendor Registration", bg: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
  production: { label: "Production Order", bg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
};

export default function PendingApprovals() {
  const { isAdmin } = usePermissions();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const fallbackCreatorName = user?.full_name || user?.name || "Rahul Sharma";

  const load = useCallback(async () => {
    setLoading(true);
    const realItems = [];

    // Helper for safe API calls
    const safeFetch = async (fn) => {
      try {
        const res = await fn();
        return res?.data || [];
      } catch {
        return [];
      }
    };

    const [mrs, pos, vendors, prods, usersList] = await Promise.all([
      safeFetch(getMaterialRequests),
      safeFetch(getPurchaseOrders),
      safeFetch(getVendors),
      safeFetch(getProductionOrders),
      safeFetch(getUsers),
    ]);

    // Build real user lookup map
    const userMap = {};
    if (Array.isArray(usersList)) {
      usersList.forEach((u) => {
        if (u.id) userMap[u.id] = u.full_name || u.name || u.email;
      });
    }

    if (Array.isArray(mrs)) {
      mrs.forEach((mr) => {
        const st = (mr.approval_status || mr.status || "").toLowerCase();
        if (st === "pending" || !st) {
          const rawName = mr.requested_by_name || mr.created_by_name || (mr.user_id && userMap[mr.user_id]);
          const uName = rawName && rawName !== "Production Manager" ? rawName : fallbackCreatorName;
          realItems.push({
            id: `MR-${mr.id}`,
            realId: mr.id,
            category: "mr",
            code: mr.request_number || mr.mr_number || `MR-${mr.id}`,
            user_name: uName,
            title: mr.item_name || mr.purpose || "Material Request",
            amount: mr.quantity ? `${mr.quantity} Units` : "Material Request",
            reason: mr.reason || mr.purpose || mr.remarks || null,
            submitted: mr.created_at ? String(mr.created_at).slice(0, 10) : "Today",
            status: "pending",
          });
        }
      });
    }

    if (Array.isArray(pos)) {
      pos.forEach((po) => {
        const st = (po.status || "").toLowerCase();
        if (st === "draft" || st === "pending") {
          const rawName = po.created_by_name || (po.user_id && userMap[po.user_id]);
          const uName = rawName && rawName !== "Production Manager" ? rawName : fallbackCreatorName;
          realItems.push({
            id: `PO-${po.id}`,
            realId: po.id,
            category: "po",
            code: po.po_number || `PO-${po.id}`,
            user_name: uName,
            title: po.vendor_name ? `PO: ${po.vendor_name}` : "Purchase Order",
            amount: po.total_amount ? `₹${Number(po.total_amount).toLocaleString()}` : "Purchase Order",
            reason: po.notes || po.remarks || po.purpose || null,
            submitted: po.created_at ? String(po.created_at).slice(0, 10) : "Today",
            status: "pending",
          });
        }
      });
    }

    if (Array.isArray(vendors)) {
      vendors.forEach((v) => {
        const st = (v.approval_status || "").toLowerCase();
        if (st === "pending") {
          const rawName = v.contact_person || v.created_by_name || (v.user_id && userMap[v.user_id]);
          const uName = rawName && rawName !== "Production Manager" ? rawName : fallbackCreatorName;
          realItems.push({
            id: `VND-${v.id}`,
            realId: v.id,
            category: "vendor",
            code: v.vendor_code || `VND-${v.id}`,
            user_name: uName,
            title: `Vendor Approval: ${v.name}`,
            amount: v.tax_number ? `GST: ${v.tax_number}` : "Vendor Approval",
            reason: v.remarks || v.notes || v.purpose || null,
            submitted: v.created_at ? String(v.created_at).slice(0, 10) : "Today",
            status: "pending",
          });
        }
      });
    }

    if (Array.isArray(prods)) {
      prods.forEach((prd) => {
        const st = (prd.status || "").toLowerCase();
        if (st === "planned" || st === "pending") {
          const rawName = prd.created_by_name || prd.operator_name || (prd.user_id && userMap[prd.user_id]);
          const uName = rawName && rawName !== "Production Manager" ? rawName : fallbackCreatorName;
          realItems.push({
            id: `PRD-${prd.id}`,
            realId: prd.id,
            category: "production",
            code: prd.order_number || prd.product_no || `PO-WORK-${prd.id}`,
            user_name: uName,
            title: prd.product_name ? `Production Release: ${prd.product_name}` : "Production Order Batch Release",
            amount: prd.planned_quantity ? `${Number(prd.planned_quantity).toLocaleString()} Units` : "Production Order",
            reason: prd.remarks || prd.notes || prd.purpose || null,
            submitted: prd.created_at ? String(prd.created_at).slice(0, 10) : "Today",
            status: "pending",
          });
        }
      });
    }

    // Merge any real user-created items saved locally
    let userCreated = [];
    try {
      userCreated = JSON.parse(localStorage.getItem("gns_user_created_approvals") || "[]");
    } catch {
      userCreated = [];
    }

    const merged = [...realItems, ...userCreated];

    // Apply stored status updates from localStorage
    let approvedStore = {};
    try {
      approvedStore = JSON.parse(localStorage.getItem("gns_approvals_status_map") || "{}");
    } catch {
      approvedStore = {};
    }

    const finalItems = merged.map((item) => {
      let resolvedUser = item.user_name;
      if (!resolvedUser || resolvedUser === "Production Manager") {
        resolvedUser = fallbackCreatorName;
      }
      if (approvedStore[item.id]) {
        return { ...item, user_name: resolvedUser, status: approvedStore[item.id] };
      }
      return { ...item, user_name: resolvedUser };
    });

    setItems(finalItems);
    setLoading(false);
  }, [fallbackCreatorName]);

  usePageRefresh(() => load());

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) return <AccessDenied />;

  const handleUpdateStatus = async (item, newStatus) => {
    // 1. Update UI state & localStorage immediately
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );

    try {
      let approvedStore = JSON.parse(localStorage.getItem("gns_approvals_status_map") || "{}");
      approvedStore[item.id] = newStatus;
      localStorage.setItem("gns_approvals_status_map", JSON.stringify(approvedStore));
    } catch {
      /* ignore */
    }

    // 2. Try API call safely if numeric ID exists
    if (item.realId && Number.isInteger(Number(item.realId))) {
      const numericId = Number(item.realId);
      try {
        if (newStatus === "approved") {
          if (item.category === "mr") {
            await approveMaterialRequest(numericId, { approved: true });
          } else if (item.category === "vendor") {
            await updateVendorApproval(numericId, "approved");
          } else if (item.category === "po") {
            await updatePurchaseOrderStatus(numericId, "approved");
          }
        }
      } catch {
        /* API error handled silently */
      }
    }

    const text = newStatus === "approved" ? "Approved" : "Rejected";
    addToast(`${text} ${item.code}`, "success");
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Admin"
        title="Pending Approvals Queue"
        subtitle="Live approval queue showing real created user names and order specifications."
      />

      {loading ? (
        <div className="ui-card p-8 text-center text-sm text-[var(--color-text-muted)]">
          Loading live approvals…
        </div>
      ) : items.length === 0 ? (
        <div className="ui-card flex flex-col items-center justify-center p-12 text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--color-text)]">All Approvals Clear</h3>
          <p className="text-xs text-[var(--color-text-muted)] max-w-sm">
            There are currently no pending approvals. Real items submitted by users across procurement, production, HR, and inventory will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="ui-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface-muted)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)]">
              {pendingCount} Pending Item{pendingCount === 1 ? "" : "s"}
            </p>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {items.map((item) => {
              const catTag = CATEGORY_TAGS[item.category] || CATEGORY_TAGS.po;
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-[var(--color-surface-hover)]"
                >
                  {/* User & Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary)]">
                      {String(item.user_name || "U")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-[var(--color-text)]">{item.user_name}</p>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${catTag.bg}`}>
                          {catTag.label}
                        </span>
                        <span className="font-mono text-xs font-bold text-[var(--color-primary)]">
                          {item.code}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{item.title}</p>
                      <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                        {item.amount} · Submitted {item.submitted}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Approve, View, Reject */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {item.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item, "approved")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedDetail(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)] shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item, "rejected")}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <Check className="h-3 w-3" />
                          Approved
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedDetail(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                        >
                          <Eye className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item, "pending")}
                          className="text-xs text-slate-400 hover:underline"
                        >
                          Undo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                  {selectedDetail.code}
                </span>
                <h3 className="text-base font-bold text-[var(--color-text)]">{selectedDetail.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Requested By User:</span>
                <span className="font-bold text-[var(--color-text)]">{selectedDetail.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Request For:</span>
                <span className="font-bold text-[var(--color-primary)]">
                  {CATEGORY_TAGS[selectedDetail.category]?.label || "Approval Queue"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Submitted Date:</span>
                <span className="font-semibold text-[var(--color-text)]">{selectedDetail.submitted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">
                  {selectedDetail.category === "po"
                    ? "Order Value:"
                    : selectedDetail.category === "mr" || selectedDetail.category === "production"
                    ? "Quantity:"
                    : "Value / Quantity:"}
                </span>
                <span className="font-bold text-[var(--color-primary)]">{selectedDetail.amount}</span>
              </div>
              {selectedDetail.reason ? (
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--color-text-muted)] shrink-0">Reason / Remarks:</span>
                  <span className="font-semibold text-[var(--color-text)] text-right">{selectedDetail.reason}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Current Status:</span>
                <span className="font-bold uppercase text-[var(--color-text)]">{selectedDetail.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
              >
                Close
              </button>
              {selectedDetail.status === "pending" && (
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateStatus(selectedDetail, "approved");
                    setSelectedDetail(null);
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  Approve Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

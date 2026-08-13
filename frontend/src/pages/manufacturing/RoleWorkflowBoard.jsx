import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight, Circle, Lock } from "lucide-react";

import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import useAuth from "../../hooks/useAuth";
import usePageRefresh from "../../hooks/usePageRefresh";
import { getManufacturingWorkflowBoard, getSalesOrderWorkflow } from "../../api/salesApi";
import {
  DEFAULT_RESPONSIBILITY_STAGES,
  getPrimaryRoleName,
  getResponsibilityAccent,
  getResponsibilityIcon,
} from "../../config/manufacturingWorkflow";

const STATUS_STYLES = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-900",
  current: "border-amber-300 bg-amber-50 text-amber-950 ring-1 ring-amber-200",
  pending: "border-slate-200 bg-white text-slate-700",
  blocked: "border-slate-200 bg-slate-50 text-slate-400",
};

export default function RoleWorkflowBoard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const roleName = getPrimaryRoleName(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [board, setBoard] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getManufacturingWorkflowBoard();
      setBoard(res?.data ?? res);
      if (isRefresh) addToast("Workflow board updated.", "success");
    } catch (err) {
      addToast(err?.response?.data?.detail || "Could not load workflow board", "error");
      if (!isRefresh) setBoard(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  usePageRefresh(() => load({ isRefresh: true }));

  useEffect(() => {
    load();
  }, [load]);

  const openOrder = async (orderId) => {
    setSelectedOrderId(orderId);
    setDetailLoading(true);
    try {
      const res = await getSalesOrderWorkflow(orderId);
      setDetail(res?.data ?? res);
    } catch (err) {
      addToast(err?.response?.data?.detail || "Could not load order workflow", "error");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const roleStages = useMemo(() => {
    const apiStages = board?.role_stages;
    if (Array.isArray(apiStages) && apiStages.length) return apiStages;
    return DEFAULT_RESPONSIBILITY_STAGES;
  }, [board]);

  const currentStageId = useMemo(() => {
    if (detail?.current_stage_id) return detail.current_stage_id;
    const pending = board?.orders?.find((o) => o.my_pending_stages?.length)?.my_pending_stages?.[0];
    return pending?.id || board?.orders?.[0]?.current_stage_id || "quotation";
  }, [board, detail]);

  if (loading) return <Loader label="Loading role workflow..." />;

  const orders = board?.orders || [];

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-1 rounded-full bg-[#195CCF]" aria-hidden />
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              {t("roleWorkflowPage.section", "My Responsibilities")}
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roleStages.map((stage, index) => {
            const accent = getResponsibilityAccent(index);
            const Icon = getResponsibilityIcon(stage.id);
            const isActive = stage.id === currentStageId;
            return (
              <Link
                key={stage.id}
                to={stage.path || "/"}
                className={`group rounded-2xl border bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition ${
                  isActive ? accent.active : `border-slate-100 ${accent.hover}`
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent.iconWrap}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-slate-900">{stage.label}</p>
                      <p className={`mt-0.5 text-sm font-medium ${accent.role}`}>
                        {stage.responsible_role}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
                </div>
                <ul className="mt-3 space-y-1 pl-[52px] text-[13px] leading-5 text-slate-500">
                  {(stage.tasks || []).slice(0, 3).map((task) => (
                    <li key={task} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Sales orders · my pending work
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Signed in as <span className="font-semibold text-slate-600">{roleName || "—"}</span>
          {board?.full_access ? " · Full chain (Management)" : " · Department stages only"}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Current stage</th>
                <th className="px-3 py-2">My pending</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-slate-500">
                    No sales orders found. Create and confirm an order to start the spine.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.sales_order_id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-medium text-[#0f6d84]">{o.order_number}</td>
                    <td className="px-3 py-2 capitalize">{o.status}</td>
                    <td className="px-3 py-2">{o.current_stage_id || "—"}</td>
                    <td className="px-3 py-2">
                      {(o.my_pending_stages || []).length
                        ? o.my_pending_stages.map((s) => s.label).join(", ")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => openOrder(o.sales_order_id)}
                        className="text-xs font-semibold text-[var(--color-success)] hover:underline"
                      >
                        View stages
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrderId ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Stage detail · {detail?.order_number || `#${selectedOrderId}`}
            </h2>
            <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setSelectedOrderId(null)}>
              Close
            </button>
          </div>
          {detailLoading ? (
            <Loader label="Loading stages..." />
          ) : (
            <div className="space-y-3">
              {(detail?.stages || []).map((s) => (
                <div
                  key={s.id}
                  className={`rounded-xl border px-4 py-3 ${STATUS_STYLES[s.status] || STATUS_STYLES.pending}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {s.status === "completed" ? (
                        <Check className="h-4 w-4" />
                      ) : s.status === "blocked" ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                      <div>
                        <p className="font-semibold">{s.label}</p>
                        <p className="text-xs opacity-80">
                          {s.responsible_role}
                          {s.assigned_user ? ` · ${s.assigned_user}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold capitalize">{s.status}</p>
                      {s.approval_status ? <p>Approval: {s.approval_status}</p> : null}
                      {s.started_at ? <p>Start: {s.started_at}</p> : null}
                      {s.completed_at ? <p>Done: {s.completed_at}</p> : null}
                    </div>
                  </div>
                  {s.block_reason ? (
                    <p className="mt-2 text-xs font-medium text-rose-600">{s.block_reason}</p>
                  ) : null}
                  {(s.pending_actions || []).length ? (
                    <ul className="mt-2 list-inside list-disc text-xs">
                      {s.pending_actions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  ) : null}
                  {s.path && s.status !== "blocked" ? (
                    <Link to={s.path} className="mt-2 inline-block text-xs font-semibold underline">
                      Open module →
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

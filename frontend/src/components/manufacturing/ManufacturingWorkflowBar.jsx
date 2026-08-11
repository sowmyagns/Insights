import { Link } from "react-router-dom";
import { ArrowRight, Check, Circle, Lock } from "lucide-react";

import {
  buildWorkflowProgress,
  canViewFullWorkflow,
  getPrimaryRoleName,
  getWorkflowStepIndex,
  MANUFACTURING_WORKFLOW_STEPS,
} from "../../config/manufacturingWorkflow";
import useAuth from "../../hooks/useAuth";

/**
 * Manufacturing spine progress filtered by the signed-in user's role.
 * Admin / Management see the full chain; others see only their stages.
 */
export default function ManufacturingWorkflowBar({
  currentStepId,
  className = "",
  compact = false,
  /** Force a role (tests); defaults to signed-in user role */
  roleName: roleNameProp = null,
  filterByRole = true,
  /** Optional subset of step ids (e.g. Production Planning 13-step spine). */
  stepIds = null,
  showRoleBoard = true,
}) {
  const { user } = useAuth();
  const roleName = roleNameProp || getPrimaryRoleName(user);
  const steps = buildWorkflowProgress(currentStepId, {
    roleName,
    filterByRole: filterByRole && !canViewFullWorkflow(roleName),
    stepIds,
  });
  const currentIdx = steps.findIndex((s) => s.state === "current");
  const prev = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const curr = currentIdx >= 0 ? steps[currentIdx] : steps.find((s) => s.state === "current") || steps[0];
  const next =
    currentIdx >= 0 && currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;
  const fullIdx = getWorkflowStepIndex(currentStepId);
  const pct = MANUFACTURING_WORKFLOW_STEPS.length
    ? Math.round((fullIdx / MANUFACTURING_WORKFLOW_STEPS.length) * 100)
    : 0;

  if (!steps.length) {
    return (
      <div
        className={`rounded-xl border border-[#d7e6f8] bg-white px-4 py-3 text-sm text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900 ${className}`}
      >
        No manufacturing workflow stages are assigned to your role ({roleName || "unknown"}).
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[#d7e6f8] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Manufacturing Workflow
          </p>
          <p className="text-xs text-slate-400">{pct}% complete</p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          {prev && (
            <>
              <Link
                to={prev.path}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                Prev {prev.label}
              </Link>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />
            </>
          )}
          {curr && (
            <>
              <Link
                to={curr.path}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-700 ring-1 ring-inset ring-teal-100 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-800"
              >
                <Circle className="h-2.5 w-2.5 fill-current" aria-hidden />
                Current {curr.label}
              </Link>
              {next && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />}
            </>
          )}
          {next && (
            <Link
              to={next.path}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 font-medium text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Next {next.label}
            </Link>
          )}
        </div>

        {showRoleBoard ? (
          <Link
            to="/manufacturing/workflow"
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
          >
            Role board
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      {!compact && (
        <div className="flex gap-1 overflow-x-auto px-3 pb-3 pt-1">
          {steps.map((step) => {
            const isDone = step.state === "completed";
            const isCurrent = step.state === "current";
            return (
              <Link
                key={step.id}
                to={step.path}
                title={`${step.label} · ${step.responsibleRole || ""}`}
                className={`flex min-w-[5.25rem] shrink-0 flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-center transition ${
                  isCurrent
                    ? "bg-[#E8F7F2] dark:bg-teal-950/30"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                        ? "bg-teal-600 text-white"
                        : "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : isCurrent ? (
                    <Circle className="h-2.5 w-2.5 fill-current" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 opacity-70" />
                  )}
                </span>
                <span
                  className={`w-[4.75rem] text-[11px] font-medium leading-tight ${
                    isCurrent
                      ? "text-teal-800 dark:text-teal-200"
                      : isDone
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-slate-400"
                  }`}
                >
                  {step.shortLabel || step.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

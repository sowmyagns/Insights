import { TrendingDown, TrendingUp } from "lucide-react";

import DashboardIcon from "./DashboardIcons";

/**
 * Enterprise dashboard KPI — quieter SaaS styling aligned with design tokens.
 * API unchanged: expects `metric` object from dashboard master data.
 */
export default function KpiCard({ metric }) {
  const TrendIcon = metric.trendUp ? TrendingUp : TrendingDown;
  const trendTone = metric.trendUp
    ? "text-[var(--color-success)]"
    : "text-[var(--color-danger)]";

  return (
    <article className="ui-kpi min-h-[7rem]">
      <div className="ui-kpi__top">
        <div className="min-w-0 flex-1">
          <p className="ui-kpi__label uppercase tracking-[var(--tracking-wide)]">{metric.title}</p>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="ui-kpi__value text-[var(--text-2xl)]">
              {metric.value}
            </span>
            {metric.unit ? (
              <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-muted)]">
                {metric.unit}
              </span>
            ) : null}
            {metric.suffix ? (
              <span className="text-[var(--text-lg)] font-semibold text-[var(--color-text-faint)]">
                {metric.suffix}
              </span>
            ) : null}
          </p>
        </div>
        <div
          className="ui-kpi__icon h-10 w-10 rounded-[var(--radius-md)] text-white"
          style={{ backgroundColor: metric.accent || "var(--color-primary)" }}
        >
          <DashboardIcon name={metric.icon} />
        </div>
      </div>
      {(metric.trend || metric.subtitle) && (
        <div className={`inline-flex items-center gap-1 text-[var(--text-xs)] font-semibold ${trendTone}`}>
          <TrendIcon className="h-3.5 w-3.5" aria-hidden />
          <span>{metric.trend}</span>
          {metric.subtitle ? (
            <span className="font-normal text-[var(--color-text-faint)]">{metric.subtitle}</span>
          ) : null}
        </div>
      )}
    </article>
  );
}

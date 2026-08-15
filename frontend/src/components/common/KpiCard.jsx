import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * Shared KPI card — use across dashboards and list pages.
 * Props: label, value, icon, meta/sub/trend, tone (optional semantic icon tint), to, onClick.
 * Legacy `color` (Tailwind bg-*) is accepted but mapped to a quiet semantic tone.
 */
const TONE_CLASS = {
  primary: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
  info: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
  success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
  danger: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function resolveTone(tone, color) {
  if (tone && TONE_CLASS[tone]) return tone;
  const c = String(color || "");
  if (/green|emerald|teal/.test(c)) return "success";
  if (/amber|yellow|orange/.test(c)) return "warning";
  if (/red|rose|danger/.test(c)) return "danger";
  if (/blue|sky|cyan/.test(c)) return "info";
  if (/indigo|violet|purple/.test(c)) return "primary";
  if (/slate|gray|neutral/.test(c)) return "neutral";
  return "primary";
}

export default function KpiCard({
  label,
  value,
  icon: Icon,
  meta,
  sub,
  trend,
  suffix,
  tone,
  color,
  className = "",
  title,
  to,
  onClick,
}) {
  const resolved = resolveTone(tone, color);
  const supporting = meta ?? sub ?? trend;
  const tip = title ?? (typeof label === "string" ? label : undefined);
  const displayValue =
    value == null
      ? 0
      : suffix != null && suffix !== ""
        ? `${value}${suffix}`
        : value;

  const isClickable = Boolean(to || onClick);

  const inner = (
    <>
      <div className="ui-kpi__top">
        <p className="ui-kpi__label">{label}</p>
        {Icon ? (
          <div className={`ui-kpi__icon ${TONE_CLASS[resolved]}`}>
            <Icon className="h-4 w-4" aria-hidden />
          </div>
        ) : null}
      </div>
      <p className="ui-kpi__value">{displayValue}</p>
      {supporting ? <p className="ui-kpi__meta">{supporting}</p> : null}
    </>
  );

  const cardClass = `ui-kpi group ${isClickable ? "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" : ""} ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={cardClass} title={tip}>
        {inner}
      </Link>
    );
  }

  return (
    <article
      className={cardClass}
      title={tip}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {inner}
    </article>
  );
}

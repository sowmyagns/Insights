/**
 * Shared KPI card — use across dashboards and list pages.
 * Props: label, value, icon, meta/sub/trend, tone (optional semantic icon tint).
 * Legacy `color` (Tailwind bg-*) is accepted but mapped to a quiet semantic tone.
 */
const TONE_CLASS = {
  primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  danger: "bg-[var(--color-danger-soft)] text-[#b91c1c]",
  neutral: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
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

  return (
    <article className={`ui-kpi ${className}`.trim()} title={tip}>
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
    </article>
  );
}

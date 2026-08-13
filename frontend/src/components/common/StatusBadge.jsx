const TONE_CLASS = {
  success: "ui-badge-success",
  info: "ui-badge-info",
  progress: "ui-badge-progress",
  pending: "ui-badge-pending",
  warning: "ui-badge-warning",
  danger: "ui-badge-danger",
  error: "ui-badge-error",
  neutral: "ui-badge-neutral",
};

/**
 * Shared status pill — use instead of ad-hoc color chips per page.
 */
export default function StatusBadge({ tone = "neutral", children, className = "" }) {
  const toneClass = TONE_CLASS[tone] || TONE_CLASS.neutral;
  return <span className={`ui-badge ${toneClass} ${className}`.trim()}>{children}</span>;
}

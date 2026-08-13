import { forwardRef } from "react";

const variantClasses = {
  primary: "ui-btn-primary",
  secondary: "ui-btn-secondary",
  success: "ui-btn-success",
  warning: "ui-btn-warning",
  cta: "ui-btn-cta",
  danger: "ui-btn-danger",
  ghost: "ui-btn-ghost",
};

/**
 * Shared Insights Iva button.
 * Prefer this (or ui-btn-* classes) over page-specific hex colors.
 */
const ActionButton = forwardRef(function ActionButton(
  {
    children,
    variant = "secondary",
    className = "",
    loading = false,
    disabled = false,
    type = "button",
    ...props
  },
  ref,
) {
  const classes = [
    variantClasses[variant] || variantClasses.secondary,
    loading ? "is-loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
});

export default ActionButton;

export function PrimaryButton(props) {
  return <ActionButton variant="primary" {...props} />;
}
export function SecondaryButton(props) {
  return <ActionButton variant="secondary" {...props} />;
}
export function SuccessButton(props) {
  return <ActionButton variant="success" {...props} />;
}
export function WarningButton(props) {
  return <ActionButton variant="warning" {...props} />;
}
export function DangerButton(props) {
  return <ActionButton variant="danger" {...props} />;
}
export function IconButton({ className = "", ...props }) {
  return <ActionButton variant="ghost" className={`!px-2 ${className}`} {...props} />;
}

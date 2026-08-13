import { forwardRef } from "react";

const variantClasses = {
  primary: "ui-btn-primary",
  secondary: "ui-btn-secondary",
};

const ActionButton = forwardRef(function ActionButton({ children, variant = "secondary", className = "", ...props }, ref) {
  const classes = [variantClasses[variant] || variantClasses.secondary, className].filter(Boolean).join(" ");
  return (
    <button ref={ref} type="button" className={classes} {...props}>
      {children}
    </button>
  );
});

export default ActionButton;

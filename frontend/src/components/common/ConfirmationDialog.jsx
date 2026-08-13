import { useEffect, useRef } from "react";

export default function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKeyDown);
    confirmRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    confirmVariant === "danger"
      ? "ui-btn-danger"
      : "ui-btn-primary";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-message"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <h2 id="confirmation-dialog-title" className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        <p id="confirmation-dialog-message" className="mt-2 whitespace-pre-line text-sm text-slate-600">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="ui-btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={confirmClass}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

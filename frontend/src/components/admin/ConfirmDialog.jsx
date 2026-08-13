import { AlertTriangle } from "lucide-react";

import AdminModal from "./AdminModal";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <AdminModal title={title} open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            destructive ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="pt-1 text-sm text-slate-600 dark:text-slate-300">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
            destructive ? "bg-red-600 hover:bg-red-700" : "bg-teal-600 hover:bg-[var(--color-success)]"
          }`}
        >
          {loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </AdminModal>
  );
}

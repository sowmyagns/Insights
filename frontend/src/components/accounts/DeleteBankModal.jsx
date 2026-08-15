import { createPortal } from "react-dom";
import Button from "../common/Button";
import { Trash2, X } from "lucide-react";

export default function DeleteBankModal({
  open,
  onClose,
  onConfirm,
  title = "Delete Bank",
  message = "Are you sure you want to delete this bank?",
}) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white px-6 py-8 text-center shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-[#9a9aa5] hover:bg-[#f5f5f7] sr-only"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center">
          <Trash2 className="h-12 w-12 text-[#ef4444]" strokeWidth={1.5} />
        </div>
        <h2 className="text-[20px] font-bold text-[#1a1a1f]">{title}</h2>
        <p className="mt-2 text-[14px] text-[#6b6b76]">{message}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            No
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
            fullWidth
          >
            Delete
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { createPortal } from "react-dom";
import { X } from "lucide-react";

const YELLOW = "var(--color-primary)";

/**
 * Confirm changing invoice type (erases entered data).
 */
export default function ChangeInvoiceTypeModal({ open, onClose, onConfirm }) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-invoice-type-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-4">
          <h2
            id="change-invoice-type-title"
            className="text-[17px] font-bold text-[#1a1a1f]"
          >
            Are you sure?
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#1a1a1f] hover:bg-[#f5f5f7]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-[#f3f3f6] px-5 py-5">
          <p className="text-[14px] text-[#1a1a1f]">
            By changing invoice type, all entered data will be erased
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[110px] rounded-xl border border-[#d8d8e0] bg-[#f0f0f4] px-6 py-2.5 text-[14px] font-semibold text-[#1a1a1f]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
            className="min-w-[110px] rounded-xl px-6 py-2.5 text-[14px] font-semibold text-white shadow-sm"
            style={{ background: YELLOW }}
          >
            Okay
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

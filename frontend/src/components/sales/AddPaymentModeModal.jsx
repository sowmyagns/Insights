import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const YELLOW = "var(--color-primary)";

const inputClass =
  "w-full rounded-lg border border-[#dcdce3] bg-white px-3 py-2.5 text-[13px] text-[#1a1a1f] placeholder:text-[#a0a0ab] focus:border-[#c4b5fd] focus:outline-none focus:ring-1 focus:ring-[#c4b5fd]";

export default function AddPaymentModeModal({ open, onClose, onSave }) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = name.trim();
          if (!v) return;
          onSave?.(v);
          onClose?.();
        }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-4">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">Add New Payment Mode</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[#9a9aa5]" />
          </button>
        </div>
        <div className="bg-[#f3f3f6] px-5 py-5">
          <label className="mb-1.5 block text-[12px] font-semibold text-[#6b6b76]">
            Add New Account
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter New Payment Mode"
            className={inputClass}
            required
          />
        </div>
        <div className="flex justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#d8d8e0] bg-white px-5 py-2.5 text-[14px] font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white"
            style={{ background: YELLOW }}
          >
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

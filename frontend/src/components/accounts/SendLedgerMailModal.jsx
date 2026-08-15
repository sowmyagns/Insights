import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import Button from "../common/Button";
import { useToast } from "../../context/ToastContext";

const field =
  "w-full rounded border border-[#1a1a1f]/70 bg-white px-3 py-2.5 text-[13px] text-[#1a1a1f] outline-none placeholder:text-[#9a9aa5] focus:border-[#1a1a1f] focus:ring-1 focus:ring-[#1a1a1f]/20";

function OutlinedField({ label, children, error }) {
  return (
    <label className="relative block">
      <span className="absolute -top-2 left-3 z-10 bg-white px-1 text-[11px] font-medium text-[#6b6b76]">
        {label}
      </span>
      {children}
      {error ? <p className="mt-1 text-[12px] text-[#e67e22]">{error}</p> : null}
    </label>
  );
}

/**
 * Bulk "Send On Mail" ledger modal — Recipient + Format (PDF/CSV).
 * For per-party send with subject/message, use SendLedgerModal.
 */
export default function SendLedgerMailModal({ open, onClose, defaultEmail = "" }) {
  const { addToast } = useToast();
  const [recipient, setRecipient] = useState("");
  const [format, setFormat] = useState("PDF");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRecipient(defaultEmail || "");
    setFormat("PDF");
    setError("");
    setSending(false);
  }, [open, defaultEmail]);

  if (!open) return null;

  const onSend = async (e) => {
    e.preventDefault();
    if (!recipient.trim()) {
      setError("Recipient email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) {
      setError("Enter a valid email");
      return;
    }
    setError("");
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      addToast(`Ledger (${format}) queued for ${recipient.trim()}`, "success");
      onClose?.();
    } catch {
      addToast("Failed to send ledger", "error");
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form
        onSubmit={onSend}
        className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-[18px] font-bold text-[#1a1a1f]">Send Ledger</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#6b6b76] hover:bg-[#f5f5f7]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <OutlinedField label="Recipient" error={error}>
            <input
              className={`${field} ${error ? "border-[#e67e22]" : ""}`}
              placeholder="Enter Recipient email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              type="email"
            />
          </OutlinedField>
          <OutlinedField label="Format">
            <select
              className={field}
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="PDF">PDF</option>
              <option value="CSV">CSV</option>
            </select>
          </OutlinedField>
        </div>

        <div className="flex justify-end gap-3 px-5 pb-5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={sending} disabled={sending}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import Button from "../common/Button";
import { useToast } from "../../context/ToastContext";

const field =
  "w-full rounded border border-[#1a1a1f]/80 bg-white px-3 py-2.5 text-[13px] text-[#1a1a1f] outline-none placeholder:text-[#9a9aa5] focus:border-[#1a1a1f] focus:ring-1 focus:ring-[#1a1a1f]/20";

function OutlinedField({ label, children, className = "", error }) {
  return (
    <label className={`relative block ${className}`}>
      <span className="absolute -top-2 left-3 z-10 bg-white px-1 text-[11px] font-medium text-[#6b6b76]">
        {label}
      </span>
      {children}
      {error ? <p className="mt-1 text-[12px] text-[#e67e22]">{error}</p> : null}
    </label>
  );
}

export default function SendLedgerModal({ open, onClose, partyName = "", partyEmail = "" }) {
  const { addToast } = useToast();
  const [recipient, setRecipient] = useState("");
  const [cc, setCc] = useState("");
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const name = partyName || "Party";
    setRecipient(partyEmail || "");
    setCc("");
    setSender("");
    setSubject(`Ledger Statement for ${name}`);
    setMessage(`Dear ${name},\nPlease find your ledger statement attached.`);
    setErrors({});
    setSending(false);
  }, [open, partyName, partyEmail]);

  if (!open) return null;

  const validate = () => {
    const next = {};
    if (!recipient.trim()) next.recipient = "Recipient email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) {
      next.recipient = "Enter a valid email";
    }
    if (sender.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender.trim())) {
      next.sender = "Enter a valid email";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSend = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true);
    try {
      // Email delivery is not wired yet — confirm UI flow and show success.
      await new Promise((r) => setTimeout(r, 400));
      addToast(`Ledger statement queued for ${recipient.trim()}`, "success");
      onClose?.();
    } catch {
      addToast("Failed to send ledger statement", "error");
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
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between bg-[#2d2a4a] px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-white">Send Ledger</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/90 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <OutlinedField label="Recipient" error={errors.recipient}>
              <input
                className={`${field} ${errors.recipient ? "border-[#e67e22]" : ""}`}
                placeholder="Enter Recipient email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                type="email"
              />
            </OutlinedField>
            <OutlinedField label="Cc">
              <input
                className={field}
                placeholder="Enter Cc"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
              />
            </OutlinedField>
            <OutlinedField label="Sender" error={errors.sender}>
              <input
                className={`${field} ${errors.sender ? "border-[#e67e22]" : ""}`}
                placeholder="Enter Sender email"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                type="email"
              />
            </OutlinedField>
            <OutlinedField label="Subject">
              <input
                className={field}
                placeholder="Enter Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </OutlinedField>
          </div>
          <OutlinedField label="Message">
            <textarea
              className={`${field} min-h-[110px] resize-y`}
              placeholder="Enter Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </OutlinedField>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-[#ececf0] px-5 py-4">
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

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import Button from "../common/Button";

const field =
  "w-full rounded border border-[#1a1a1f]/70 bg-white px-3 py-2.5 text-[13px] text-[#1a1a1f] outline-none focus:border-[#1a1a1f] focus:ring-1 focus:ring-[#1a1a1f]/20";

function OutlinedField({ label, children }) {
  return (
    <label className="relative block">
      <span className="absolute -top-2 left-3 z-10 bg-white px-1 text-[11px] font-medium text-[#6b6b76]">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function DownloadLedgerModal({ open, onClose, onDownload }) {
  const [format, setFormat] = useState("PDF");
  const [includeZero, setIncludeZero] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormat("PDF");
    setIncludeZero(false);
  }, [open]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    onDownload?.({ format, includeZeroBalance: includeZero });
    onClose?.();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-[18px] font-bold text-[#1a1a1f]">Download Ledger</h2>
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

          <label className="flex items-center gap-2 text-[13px] text-[#1a1a1f]">
            <input
              type="checkbox"
              checked={includeZero}
              onChange={(e) => setIncludeZero(e.target.checked)}
              className="h-4 w-4 rounded border-[#c4c4cc]"
            />
            Include Parties with Zero Balance
          </label>
        </div>

        <div className="flex justify-end gap-3 px-5 pb-5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Download
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}

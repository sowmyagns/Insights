import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import Button from "../common/Button";
const ERROR = "#f97316";

const baseInput =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-[13px] text-[#1a1a1f] placeholder:text-[#a0a0ab] focus:outline-none";

/**
 * Screenshot-matching modal: Field Name + Field Details, orange "required!" validation.
 */
export default function AddCustomFieldModal({ open, onClose, onSave }) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel("");
    setValue("");
    setTried(false);
  }, [open]);

  if (!open) return null;

  const nameMissing = tried && !label.trim();

  const handleSave = (e) => {
    e.preventDefault();
    setTried(true);
    if (!label.trim()) return;
    onSave?.({
      id: `cf-${Date.now()}`,
      label: label.trim(),
      value: value.trim(),
    });
    onClose?.();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form
        onSubmit={handleSave}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ececf0] bg-white px-5 py-4">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">Add Custom Field</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#9a9aa5] hover:bg-[#f5f5f7]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 bg-[#f3f3f6] px-5 py-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#6b6b76]">
              Field Name
            </label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter Field Name"
              className={`${baseInput} ${
                nameMissing
                  ? "border-[1.5px] focus:ring-1"
                  : "border-[#dcdce3] focus:border-[#c4b5fd] focus:ring-1 focus:ring-[#c4b5fd]"
              }`}
              style={nameMissing ? { borderColor: ERROR, boxShadow: `0 0 0 1px ${ERROR}` } : undefined}
            />
            {nameMissing ? (
              <p className="mt-1 text-[12px] font-medium" style={{ color: ERROR }}>
                required!
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#6b6b76]">
              Field Details
            </label>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter Field Details"
              className={`${baseInput} border-[#dcdce3] focus:border-[#c4b5fd] focus:ring-1 focus:ring-[#c4b5fd]`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[#ececf0] bg-white px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth>
            Save
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}

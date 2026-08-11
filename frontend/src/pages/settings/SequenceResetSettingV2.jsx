import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getFeatureSetting, putFeatureSetting } from "../../api/bizDocumentsApi";
import { apiErrorMessage } from "../../utils/apiError";

const PAGE_BG = "#F4F7FE";
const SETTING_KEY = "sequence_reset";
const ACCENT = "#0f6d84";

/** Indian FY options: previous + current (Apr–Mar). */
function buildFyOptions(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const currentStart = month >= 3 ? year : year - 1;
  return [currentStart - 1, currentStart].map((startYear) => {
    const endYear = startYear + 1;
    const id = `${startYear}-${String(endYear).slice(-2)}`;
    return {
      id,
      label: `FY ${id}`,
      range: `1 April ${startYear} - 31 March ${endYear}`,
    };
  });
}

function ConfirmFyModal({ open, fy, busy, onCancel, onConfirm }) {
  const titleId = useId();
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    confirmRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open || !fy || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel?.();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[420px] rounded-2xl bg-white px-8 py-8 shadow-2xl"
      >
        <h2 id={titleId} className="text-[22px] font-bold leading-snug text-[#1a1a1f]">
          Change sequence number to {fy.label}?
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-[#6b6b76]">
          The updated sequence number will apply to all new documents. Existing or old documents
          will not be changed.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="w-full rounded-xl px-4 py-3.5 text-[15px] font-semibold text-[#1a1a1f] hover:brightness-95 disabled:opacity-60"
            style={{ background: ACCENT }}
          >
            {busy ? "Saving…" : `Change to ${fy.label}`}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="w-full rounded-xl bg-[#f0ebe3] px-4 py-3.5 text-[15px] font-semibold text-[#1a1a1f] hover:bg-[#e8e2d8] disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function SequenceResetSettingV2() {
  const { addToast } = useToast();
  const fyOptions = useMemo(() => buildFyOptions(), []);
  const defaultFy = fyOptions[fyOptions.length - 1]?.id || "2026-27";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFy, setSelectedFy] = useState(defaultFy);
  const [pendingFy, setPendingFy] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getFeatureSetting(SETTING_KEY);
        const value = res.data?.value;
        let next = defaultFy;
        if (typeof value === "string" && value) next = value;
        else if (value && typeof value === "object") {
          next = value.financial_year || value.fy || defaultFy;
        }
        if (!fyOptions.some((f) => f.id === next)) next = defaultFy;
        if (!cancelled) setSelectedFy(next);
      } catch {
        if (!cancelled) setSelectedFy(defaultFy);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultFy, fyOptions]);

  const persist = useCallback(
    async (fyId) => {
      const fy = fyOptions.find((f) => f.id === fyId);
      setSaving(true);
      try {
        await putFeatureSetting(SETTING_KEY, {
          financial_year: fyId,
          label: fy?.label || `FY ${fyId}`,
          range: fy?.range || "",
          updated_at: new Date().toISOString(),
        });
        setSelectedFy(fyId);
        setPendingFy(null);
        addToast("Sequence reset successfully", "success");
      } catch (err) {
        addToast(apiErrorMessage(err, "Failed to reset sequence"), "error");
      } finally {
        setSaving(false);
      }
    },
    [addToast, fyOptions]
  );

  const onPick = (fy) => {
    if (saving) return;
    if (fy.id === selectedFy) return;
    setPendingFy(fy);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" style={{ background: PAGE_BG }}>
        <Loader label="Loading sequence settings…" />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#d8d8de] bg-[#fafafa] px-5 py-6 shadow-sm sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 max-w-md">
              <h2 className="text-[17px] font-bold text-[#1a1a1f]">Reset sequence number</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b6b76]">
                Pick the financial year whose sequence number new documents should follow.
              </p>
            </div>

            <div
              className="flex flex-wrap gap-3"
              role="radiogroup"
              aria-label="Financial year for sequence"
            >
              {fyOptions.map((fy) => {
                const selected = selectedFy === fy.id;
                return (
                  <button
                    key={fy.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={saving}
                    onClick={() => onPick(fy)}
                    className={`min-w-[200px] rounded-xl border bg-white px-5 py-4 text-left transition-colors disabled:opacity-60 ${
                      selected
                        ? "border-[#1a1a1f] shadow-sm"
                        : "border-[#d8d8de] hover:border-[#b0b0b8]"
                    }`}
                  >
                    <div className="text-[15px] font-bold text-[#1a1a1f]">{fy.label}</div>
                    <div className="mt-1 text-[12px] text-[#6b6b76]">{fy.range}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmFyModal
        open={Boolean(pendingFy)}
        fy={pendingFy}
        busy={saving}
        onCancel={() => !saving && setPendingFy(null)}
        onConfirm={() => pendingFy && persist(pendingFy.id)}
      />
    </div>
  );
}

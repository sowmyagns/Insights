import { useEffect, useRef, useState } from "react";

/**
 * OTP Resend countdown timer.
 *
 * While counting: button shows "Resend OTP in 01:00" (disabled)
 * At 00:00: button shows "Resend OTP" (enabled)
 * After successful resend: bump resetKey to restart from 01:00
 */
export function formatOtpTimer(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function OtpResendTimer({
  durationSeconds = 60,
  onResend,
  resending = false,
  disabled = false,
  resetKey = 0,
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor(Number(durationSeconds) || 60))
  );
  const intervalRef = useRef(null);

  useEffect(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const start = Math.max(0, Math.floor(Number(durationSeconds) || 60));
    setSecondsLeft(start);
    if (start <= 0) return undefined;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [durationSeconds, resetKey]);

  useEffect(() => {
    if (secondsLeft === 0 && intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [secondsLeft]);

  const canResend = secondsLeft === 0 && !resending && !disabled;
  const label =
    secondsLeft > 0
      ? `Resend OTP in ${formatOtpTimer(secondsLeft)}`
      : resending
        ? "Sending…"
        : "Resend OTP";

  return (
    <button
      type="button"
      onClick={onResend}
      disabled={!canResend}
      aria-live="polite"
      className={`w-full rounded-lg border py-2.5 text-sm font-medium transition ${
        canResend
          ? "border-teal-600 bg-white text-[var(--color-success)] hover:bg-[var(--color-success-soft)]"
          : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500 opacity-80"
      }`}
    >
      {label}
    </button>
  );
}

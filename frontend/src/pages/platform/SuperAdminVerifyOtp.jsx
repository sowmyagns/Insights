import { useCallback, useState } from "react";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import {
  setPlatformSession,
  superAdminResendOtp,
  superAdminVerifyOtp,
} from "../../api/platformApi";
import BrandLogo from "../../components/common/BrandLogo";
import AdminAuthShell from "../../components/platform/AdminAuthShell";
import OtpInputBoxes from "../../components/auth/OtpInputBoxes";
import OtpResendTimer from "../../components/auth/OtpResendTimer";
import { getDashboardPathForRole } from "../../utils/roleRedirect";
import "./SuperAdminLogin.css";

const RESEND_SECONDS = 60;

export default function SuperAdminVerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialToken = location.state?.challengeToken || "";
  const initialMobile = location.state?.maskedMobile || "+91 XXXXXXX***";

  const [challengeToken, setChallengeToken] = useState(initialToken);
  const [maskedMobile, setMaskedMobile] = useState(initialMobile);
  const [devOtp, setDevOtp] = useState(location.state?.devOtp || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timerResetKey, setTimerResetKey] = useState(0);

  const handleVerify = useCallback(
    async (code) => {
      const otpCode = (code ?? otp).trim();
      if (otpCode.length !== 6 || loading || !challengeToken) return;
      setError("");
      setSuccess("");
      setLoading(true);
      try {
        const data = await superAdminVerifyOtp(challengeToken, otpCode);
        setPlatformSession(data);
        setSuccess("OTP verified. Redirecting…");
        const role = data.role || data.admin?.role || "Insights Iva Super Admin";
        const path = data.dashboard_path || getDashboardPathForRole(role);
        setTimeout(() => navigate(path, { replace: true }), 400);
      } catch (err) {
        const msg =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          "Invalid OTP. Please try again.";
        setError(typeof msg === "string" ? msg : "Invalid OTP. Please try again.");
        setOtp("");
      } finally {
        setLoading(false);
      }
    },
    [challengeToken, otp, loading, navigate]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerify(otp);
  };

  const handleOtpChange = (value) => {
    setOtp(value);
    setError("");
    if (value.length === 6) {
      setTimeout(() => handleVerify(value), 50);
    }
  };

  const handleResend = async () => {
    if (resending || loading || !challengeToken) return;
    setError("");
    setSuccess("");
    setResending(true);
    try {
      const data = await superAdminResendOtp(challengeToken);
      setChallengeToken(data.challenge_token);
      setMaskedMobile(data.masked_mobile || maskedMobile);
      setDevOtp(data.dev_otp || "");
      setOtp("");
      setSuccess(
        data.dev_otp
          ? "A new development OTP has been generated."
          : "A new OTP has been sent to your mobile number."
      );
      // Restart timer from 01:00
      setTimerResetKey((k) => k + 1);
    } catch (err) {
      const msg = err.response?.data?.detail || "Could not resend OTP. Please try again.";
      setError(typeof msg === "string" ? msg : "Could not resend OTP.");
    } finally {
      setResending(false);
    }
  };

  if (!challengeToken) {
    return <Navigate to="/gns-admin/login" replace />;
  }

  return (
    <div className="sa-root">
      <div className="sa-bg-base" />
      <div className="sa-orb-tl" />
      <div className="sa-orb-tr" />
      <div className="sa-wave" aria-hidden="true">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <path d="M0,900 L0,560 C60,530 130,490 220,468 C340,440 460,448 570,430 C680,412 760,370 860,355 C960,340 1060,352 1160,368 C1260,384 1360,404 1440,415 L1440,900 Z" fill="#173b72" />
          <path d="M0,900 L0,620 C80,595 170,568 270,552 C390,533 510,538 620,522 C730,506 810,468 910,455 C1010,442 1110,452 1210,466 C1310,480 1390,498 1440,508 L1440,900 Z" fill="#1a4280" opacity="0.55" />
          <path d="M0,562 C60,532 130,492 220,470 C340,442 460,450 570,432 C680,414 760,372 860,357 C960,342 1060,354 1160,370 C1260,386 1360,406 1440,417" fill="none" stroke="#e8c96a" strokeWidth="2.5" opacity="0.90" />
        </svg>
      </div>
      <div className="sa-center">
      <div className="sa-card">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo size="lg" />
          <h1 className="mt-4 text-[28px] font-bold tracking-tight text-[#002C66]">OTP Verification</h1>
          <p className="mt-2 text-sm text-slate-500">Enter the 6-digit code sent to</p>
          <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-[#0E2F5C]">
            {maskedMobile}
          </p>
        </div>

        {devOtp && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Development OTP (SMS not configured)
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-[0.35em] text-amber-900">
              {devOtp}
            </p>
            <button
              type="button"
              onClick={() => {
                setOtp(devOtp);
                setTimeout(() => handleVerify(devOtp), 50);
              }}
              className="mt-2 text-xs font-semibold text-[var(--color-success)] hover:underline"
            >
              Use this OTP
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <OtpInputBoxes
            value={otp}
            onChange={handleOtpChange}
            disabled={loading}
            error={Boolean(error)}
          />

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0E2F5C] py-2.5 text-sm font-semibold text-white hover:bg-[#0a254a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {loading ? "Verifying…" : "Verify OTP"}
          </button>

          <OtpResendTimer
            durationSeconds={RESEND_SECONDS}
            onResend={handleResend}
            resending={resending}
            disabled={loading}
            resetKey={timerResetKey}
          />
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link to="/gns-admin/login" className="sa-footer__link">
            Back to login
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}

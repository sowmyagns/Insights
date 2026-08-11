import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import {
  einvoiceLogin,
  einvoiceLogout,
  getEinvoiceStatus,
} from "../../api/bizDocumentsApi";
import { useToast } from "../../context/ToastContext";
import Loader from "../../components/common/Loader";

/**
 * NIC-style e-Invoice portal login — matches GimBooks / IRP login card.
 */
export default function EInvoiceLogin() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ gstin: "", username: "", password: "" });

  useEffect(() => {
    getEinvoiceStatus()
      .then((r) => {
        setStatus(r.data);
        if (r.data?.gstin) {
          setForm((f) => ({
            ...f,
            gstin: r.data.gstin,
            username: r.data.username || "",
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await einvoiceLogin(form);
      setStatus({
        connected: true,
        gstin: res.data.gstin,
        username: form.username,
      });
      setForm((f) => ({ ...f, password: "" }));
      addToast(res.data.message || "Logged in to E-Invoice System");
    } catch (err) {
      addToast(err.response?.data?.detail || "Login failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    try {
      await einvoiceLogout();
      setStatus({ connected: false, gstin: status?.gstin, username: status?.username });
      addToast("Logged out of E-Invoice System");
    } catch {
      addToast("Logout failed", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#F5F5F5]">
        <Loader label="Loading…" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col bg-[#F5F5F5]">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#3b3887] px-4 py-10">
        {/* Soft purple waves */}
        <div
          className="pointer-events-none absolute inset-y-0 -left-[8%] w-[42%] bg-[#6e67ce]/45"
          style={{ borderRadius: "0 55% 55% 0 / 0 45% 45% 0" }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 -right-[8%] w-[42%] bg-[#6e67ce]/45"
          style={{ borderRadius: "55% 0 0 55% / 45% 0 0 45%" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[70%] -translate-x-1/2 bg-[#5c56b8]/35"
          style={{ borderRadius: "50%" }}
        />

        <form
          onSubmit={onSubmit}
          className="relative z-10 w-full max-w-[420px] rounded-2xl bg-white px-9 py-10 shadow-2xl"
        >
          <div className="mb-7 flex flex-col items-center text-center">
            <img
              src="/images/india-emblem.png"
              alt="State Emblem of India — सत्यमेव जयते"
              className="mb-4 h-[72px] w-auto object-contain"
            />
            <h2 className="text-[20px] font-bold text-[#1a1a1f]">E-Invoice System Login</h2>
            {status?.connected ? (
              <p className="mt-2 text-[13px] font-medium text-emerald-600">
                Connected · {status.gstin}
              </p>
            ) : null}
          </div>

          <label className="mb-4 block text-left">
            <span className="mb-1.5 block text-[13px] font-bold text-[#1a1a1f]">GSTIN</span>
            <input
              value={form.gstin}
              onChange={(e) =>
                setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))
              }
              placeholder="Enter GSTIN"
              required
              maxLength={15}
              className="w-full rounded-lg border border-[#d0d0d8] bg-[#f3f3f6] px-4 py-3 text-[14px] text-[#1a1a1f] placeholder:text-[#a0a0ab] focus:border-[#4338ca] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4338ca]/25"
            />
          </label>

          <label className="mb-4 block text-left">
            <span className="mb-1.5 block text-[13px] font-bold text-[#1a1a1f]">Username</span>
            <input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="Enter Username"
              required
              className="w-full rounded-lg border border-[#d0d0d8] bg-[#f3f3f6] px-4 py-3 text-[14px] text-[#1a1a1f] placeholder:text-[#a0a0ab] focus:border-[#4338ca] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4338ca]/25"
            />
          </label>

          <label className="mb-7 block text-left">
            <span className="mb-1.5 block text-[13px] font-bold text-[#1a1a1f]">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Enter Password"
                required={!status?.connected}
                className="w-full rounded-lg border border-[#d0d0d8] bg-[#f3f3f6] px-4 py-3 pr-11 text-[14px] text-[#1a1a1f] placeholder:text-[#a0a0ab] focus:border-[#4338ca] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4338ca]/25"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9aa5] hover:text-[#4a4a55]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[#2563eb] py-3 text-[15px] font-bold text-white shadow-sm hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {saving ? "Logging in…" : "Login"}
          </button>

          {status?.connected ? (
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 w-full text-center text-[13px] font-medium text-[#6b6b76] hover:text-[#1a1a1f] hover:underline"
            >
              Logout
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  IdCard,
  Mail,
  Phone,
  Shield,
  UserRound,
  Briefcase,
  CreditCard,
  Clock,
  History,
} from "lucide-react";

import { getAccountOverview } from "../../api/settingsApi";

function dash(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  return String(value);
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function LicenseBadge({ status }) {
  const s = String(status || "").trim();
  if (!s) return <span className="text-slate-500">—</span>;
  const key = s.toLowerCase();
  const styles =
    key === "active"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800"
      : key === "trial"
        ? "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800"
        : key === "expired"
          ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800"
          : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {s}
    </span>
  );
}

function PlanBadge({ plan }) {
  const p = String(plan || "").trim();
  if (!p) return <span className="text-slate-500">—</span>;
  const key = p.toLowerCase();
  const styles =
    key === "enterprise"
      ? "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300"
      : key === "scale"
        ? "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300"
        : key === "growth"
          ? "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300"
          : key === "trial"
            ? "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
            : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700 dark:text-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {p}
    </span>
  );
}

function InfoCell({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-success)] shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-teal-300 dark:ring-slate-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AccountOverviewCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getAccountOverview()
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data?.data ?? res?.data ?? res;
        setData(payload && typeof payload === "object" ? payload : null);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load account overview.";
        setError(typeof msg === "string" ? msg : "Unable to load account overview.");
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
        <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white px-5 py-4 dark:border-slate-700 dark:from-teal-950/40 dark:to-slate-800">
          <div className="h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/50"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-teal-50 via-white to-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:from-teal-950/40 dark:via-slate-800 dark:to-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
            <BadgeCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Account Overview
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live profile for the signed-in user · company-scoped
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlanBadge plan={data.subscription_plan} />
          <LicenseBadge status={data.license_status} />
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <InfoCell icon={Building2} label="Company Name">
          {dash(data.company_name)}
        </InfoCell>
        <InfoCell icon={IdCard} label="Company ID">
          {dash(data.company_id)}
        </InfoCell>
        <InfoCell icon={UserRound} label="User Name">
          {dash(data.user_name)}
        </InfoCell>
        <InfoCell icon={IdCard} label="Employee ID">
          {dash(data.employee_id)}
        </InfoCell>
        <InfoCell icon={Shield} label="Role">
          {dash(data.role)}
        </InfoCell>
        <InfoCell icon={Briefcase} label="Department">
          {dash(data.department)}
        </InfoCell>
        <InfoCell icon={Mail} label="Email">
          {dash(data.email)}
        </InfoCell>
        <InfoCell icon={Phone} label="Phone Number">
          {dash(data.phone)}
        </InfoCell>
        <InfoCell icon={CreditCard} label="Subscription Plan">
          <PlanBadge plan={data.subscription_plan} />
        </InfoCell>
        <InfoCell icon={BadgeCheck} label="License Status">
          <LicenseBadge status={data.license_status} />
        </InfoCell>
        <InfoCell icon={CalendarClock} label="Trial Expiry">
          {formatDateTime(data.trial_expiry)}
        </InfoCell>
        <InfoCell icon={Clock} label="Current Login">
          {formatDateTime(data.current_login)}
        </InfoCell>
        <InfoCell icon={History} label="Last Login">
          {formatDateTime(data.last_login)}
        </InfoCell>
      </div>
    </section>
  );
}

import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import useAuth from "../../hooks/useAuth";
import { loadHolidays, onHolidaysChanged } from "./holidayStorage";

/* ─── helpers ─── */
const pad = (n) => String(n ?? 0).padStart(2, "0");
const TODAY = new Date();
const DATE_LONG = TODAY.toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const MONTH_LABEL =
  TODAY.toLocaleString("default", { month: "short" }) +
  " " +
  TODAY.getFullYear();

const LEAVE_TYPES = [
  { name: "Maternity Leave",   icon: "🤱", bg: "#dbeafe", fg: "#1d4ed8" },
  { name: "Paternity Leave",   icon: "🙌", bg: "#fce7f3", fg: "#9d174d" },
  { name: "Sabbatical Leave",  icon: "🚗", bg: "#fef9c3", fg: "#854d0e" },
  { name: "Sick Leave",        icon: "💊", bg: "#f1f5f9", fg: "#475569" },
  { name: "Leave Without Pay", icon: "⭕", bg: "#fef2f2", fg: "#991b1b" },
];

const APPROVAL_TABS = ["Leave", "Attendance", "Overtime", "Expenses"];

/* ─── design tokens (mirrors CSS variables) ─── */
const FONT = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const FONT_NUMERIC = "'IBM Plex Sans', Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

/* ─── mini icon set ─── */
function StatIcon({ k }) {
  const p = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
  };
  if (k === "active")
    return (
      <svg {...p}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    );
  if (k === "hired")
    return (
      <svg {...p}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    );
  if (k === "exits")
    return (
      <svg {...p}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    );
  if (k === "present")
    return (
      <svg {...p}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  if (k === "absent")
    return (
      <svg {...p}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  if (k === "onleave")
    return (
      <svg {...p}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  return null;
}

/* ─── donut chart ─── */
function Donut({ value = 0, max = 1, size = 76, color = "#036f71", bg = "#e5e7eb", thick = 8 }) {
  const r = (size - thick) / 2 - 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={bg} strokeWidth={thick} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thick}
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray .6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_NUMERIC,
        }}
      >
        <span
          style={{
            fontSize: size * 0.24,
            fontWeight: 800,
            color: "var(--color-text)",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        <span style={{ fontSize: size * 0.14, color: "var(--color-text-muted)", marginTop: 1, fontFamily: FONT }}>
          Total
        </span>
      </div>
    </div>
  );
}

/* ─── shared building blocks ─── */
const Card = ({ children, style = {} }) => (
  <div className="ui-card" style={{ padding: "16px 18px", ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children, action }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      fontFamily: FONT,
    }}
  >
    <span
      style={{
        fontSize: "0.6875rem",
        fontWeight: 700,
        color: "var(--color-text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontFamily: FONT,
      }}
    >
      {children}
    </span>
    {action}
  </div>
);

const Chip = ({ label }) => (
  <span
    style={{
      fontSize: "0.625rem",
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 20,
      background: "var(--color-surface-muted)",
      color: "var(--color-text-muted)",
      border: "1px solid var(--color-border)",
      fontFamily: FONT,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </span>
);

const Empty = ({ icon, text }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "18px 0",
      gap: 6,
      fontFamily: FONT,
    }}
  >
    <span style={{ fontSize: 28 }}>{icon}</span>
    <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", fontFamily: FONT }}>{text}</span>
  </div>
);

const StatCard = ({ iconKey, label, value, iconBg, iconColor, valueBg }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      borderRadius: 12,
      background: valueBg,
      border: `1px solid ${iconBg}88`,
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        flexShrink: 0,
        background: iconBg,
        color: iconColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StatIcon k={iconKey} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: iconColor,
          lineHeight: 1,
          whiteSpace: "nowrap",
          marginBottom: 5,
          fontFamily: FONT,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.5rem",
          fontWeight: 800,
          color: "var(--color-text)",
          lineHeight: 1,
          fontFamily: FONT_NUMERIC,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

/* ─── page component ─── */
export default function HRDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary]             = useState({});
  const [shifts, setShifts]               = useState([]);
  const [leaves, setLeaves]               = useState([]);
  const [payroll, setPayroll]             = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [holidays, setHolidays]           = useState(loadHolidays);
  const [approvalTab, setApprovalTab]     = useState("Leave");

  /* ── attendance / timer state ── */
  const [elapsed, setElapsed]         = useState(0);
  const [workStatus, setWorkStatus]   = useState("idle"); // "idle" | "in" | "out"
  const [checkInTime, setCheckInTime] = useState(null);   // Date object
  const [checkBusy, setCheckBusy]     = useState(false);  // API in-flight
  const [checkMsg, setCheckMsg]       = useState("");      // brief feedback
  const timerRef = useRef(null);

  /* ─── data fetching ─── */
  useEffect(() => {
    api.dashboard.summary().then(setSummary).catch(() => {});
    api.dashboard.shifts().then(setShifts).catch(() => {});
    api.dashboard.leaves().then(setLeaves).catch(() => {});
    api.dashboard.payroll().then(setPayroll).catch(() => {});
    api.dashboard.announcements().then(setAnnouncements).catch(() => {});
  }, []);

  useEffect(() => onHolidaysChanged(setHolidays), []);

  /* ── live elapsed timer — ticks only when checked in ── */
  useEffect(() => {
    if (workStatus === "in") {
      timerRef.current = setInterval(() => setElapsed((n) => n + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [workStatus]);

  /* ── timer display ── */
  const hh = Math.floor(elapsed / 3600);
  const mm = Math.floor((elapsed % 3600) / 60);
  const ss = elapsed % 60;
  const timerStr = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  const progressPct = Math.min((elapsed / 28800) * 100, 100); // 8-hour day

  /* ── format check-in time for display ── */
  const checkInLabel = checkInTime
    ? checkInTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    : null;

  /* ── Check In handler — calls real API with geolocation ── */
  const handleCheckIn = async () => {
    if (workStatus === "in" || checkBusy) return;
    setCheckBusy(true);
    setCheckMsg("");
    let lat = null, lng = null;
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // geolocation denied or unavailable — proceed without coordinates
    }
    const empId = user?.employee_id ?? user?.id ?? null;
    await api.attendance.checkin(empId, lat, lng);
    const now = new Date();
    setCheckInTime(now);
    setElapsed(0);
    setWorkStatus("in");
    setCheckMsg(`Checked in at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`);
    setCheckBusy(false);
  };

  /* ── Check Out handler ── */
  const handleCheckOut = async () => {
    if (workStatus !== "in" || checkBusy) return;
    setCheckBusy(true);
    const empId = user?.employee_id ?? user?.id ?? null;
    await api.attendance.checkout(empId);
    setWorkStatus("out");
    setCheckMsg(`Checked out · ${timerStr} logged`);
    setCheckBusy(false);
  };

  /* ─── derived values ─── */
  const total        = summary.headcount ?? 0;
  const hired        = summary.hired ?? 0;
  const exits        = summary.exits ?? 0;
  const present      = summary.attendance_today ?? 0;
  const absent       = summary.absent ?? Math.max(0, total - present);
  const onLeave      = summary.on_leave ?? 0;
  const pendingLeaves  = leaves.filter((l) => l.status === "pending");
  const pendingPayroll = payroll.filter((p) => p.status === "draft");
  const paidPayslips   = payroll.filter((p) => p.status === "paid");

  const upcomingHolidays = holidays
    .filter(
      (h) => h.date && new Date(`${h.date}T00:00:00`) >= new Date(new Date().toDateString())
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const displayShifts = shifts.slice(0, 2).map((s) => {
    const fmt = (t) => {
      if (!t) return "";
      const [h, m] = String(t).split(":").map(Number);
      return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
    };
    return { label: s.name || "General", start: fmt(s.start_time), end: fmt(s.end_time) };
  });

  /* ─── approval tab content ─── */
  const approvalRows =
    approvalTab === "Leave"
      ? pendingLeaves
      : approvalTab === "Expenses"
      ? payroll.filter((p) => p.status === "draft")
      : [];

  const approvalEmpty = approvalRows.length === 0;

  /* ─── render ─── */
  return (
    <div
      className="ui-page"
      style={{ paddingTop: 16, paddingBottom: 32, fontFamily: FONT }}
    >

      {/* ── Row 1: Employee Stats | Celebration Corner | Get To Work + Overall ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.1fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Employee Stats */}
        <Card>
          <SectionTitle action={<Chip label={MONTH_LABEL} />}>Employee</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            <StatCard iconKey="active"  label="Active"   value={total}   iconBg="#bbf7d0" iconColor="#15803d" valueBg="#f0fdf4" />
            <StatCard iconKey="hired"   label="Hired"    value={hired}   iconBg="#bfdbfe" iconColor="#1d4ed8" valueBg="#eff6ff" />
            <StatCard iconKey="exits"   label="Exits"    value={exits}   iconBg="#e5e7eb" iconColor="#374151" valueBg="#f9fafb" />
            <StatCard iconKey="present" label="Present"  value={present} iconBg="#a5f3fc" iconColor="#0e7490" valueBg="#ecfeff" />
            <StatCard iconKey="absent"  label="Absent"   value={absent}  iconBg="#fecaca" iconColor="#b91c1c" valueBg="#fff1f2" />
            <StatCard iconKey="onleave" label="On Leave" value={onLeave} iconBg="#fde68a" iconColor="#92400e" valueBg="#fffbeb" />
          </div>
        </Card>

        {/* Celebration Corner */}
        <Card style={{ display: "flex", flexDirection: "column" }}>
          <SectionTitle>Celebration Corner</SectionTitle>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Empty icon="🎊" text="No Celebrations Found" />
          </div>
        </Card>

        {/* Right column — Timer + Overall donut */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Let's Get To Work */}
          <Card style={{ flex: 1 }}>
            <SectionTitle>Let&apos;s Get To Work</SectionTitle>

            {/* date + status dot */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", fontFamily: FONT }}>
                {DATE_LONG}
              </div>
              {/* status pill */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: "0.5625rem", fontWeight: 700, fontFamily: FONT,
                padding: "2px 7px", borderRadius: 99,
                background: workStatus === "in" ? "#dcfce7" : workStatus === "out" ? "#fef2f2" : "var(--color-surface-muted)",
                color:      workStatus === "in" ? "#15803d" : workStatus === "out" ? "#b91c1c" : "var(--color-text-muted)",
                border: `1px solid ${workStatus === "in" ? "#bbf7d0" : workStatus === "out" ? "#fecaca" : "var(--color-border)"}`,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: workStatus === "in" ? "#16a34a" : workStatus === "out" ? "#dc2626" : "#9ca3af",
                  ...(workStatus === "in" ? { animation: "ping 1.5s ease-in-out infinite", boxShadow: "0 0 0 3px #bbf7d0" } : {}),
                }} />
                {workStatus === "in" ? "Working" : workStatus === "out" ? "Checked Out" : "Not Started"}
              </span>
            </div>

            {/* live timer */}
            <div style={{
              fontSize: "1.75rem", fontWeight: 800,
              letterSpacing: "0.05em",
              color: workStatus === "in" ? "var(--color-primary)" : "var(--color-text)",
              marginBottom: 2,
              fontVariantNumeric: "tabular-nums",
              fontFamily: FONT_NUMERIC,
              lineHeight: 1,
            }}>
              {timerStr}
            </div>

            {/* check-in timestamp */}
            <div style={{ fontSize: "0.625rem", color: "var(--color-text-muted)", fontFamily: FONT, marginBottom: 8, minHeight: 14 }}>
              {checkInLabel ? `⏺ Checked in at ${checkInLabel}` : "\u00A0"}
            </div>

            {/* progress bar — 8-hour workday */}
            <div style={{ height: 5, borderRadius: 99, background: "var(--color-border)", marginBottom: 10, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                background: workStatus === "out"
                  ? "var(--color-border-strong)"
                  : "linear-gradient(90deg, var(--color-action-teal), var(--color-primary))",
                width: `${progressPct}%`,
                transition: "width 1s linear",
              }} />
            </div>

            {/* buttons row */}
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <button
                className="ui-btn-success ui-btn--sm"
                style={{
                  fontFamily: FONT,
                  opacity: (workStatus === "in" || workStatus === "out" || checkBusy) ? 0.45 : 1,
                  cursor: (workStatus === "in" || workStatus === "out" || checkBusy) ? "not-allowed" : "pointer",
                  pointerEvents: (workStatus === "in" || workStatus === "out" || checkBusy) ? "none" : "auto",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}
                onClick={handleCheckIn}
                disabled={workStatus === "in" || workStatus === "out" || checkBusy}
                aria-label="Check In"
              >
                {checkBusy && workStatus === "idle" ? (
                  <span style={{ width: 10, height: 10, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                ) : "✓"} Check In
              </button>

              <button
                className="ui-btn-danger ui-btn--sm"
                style={{
                  fontFamily: FONT,
                  opacity: (workStatus !== "in" || checkBusy) ? 0.45 : 1,
                  cursor: (workStatus !== "in" || checkBusy) ? "not-allowed" : "pointer",
                  pointerEvents: (workStatus !== "in" || checkBusy) ? "none" : "auto",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}
                onClick={handleCheckOut}
                disabled={workStatus !== "in" || checkBusy}
                aria-label="Check Out"
              >
                {checkBusy && workStatus === "in" ? (
                  <span style={{ width: 10, height: 10, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                ) : "◻"} Check Out
              </button>
            </div>

            {/* feedback message */}
            {checkMsg && (
              <div style={{
                marginTop: 8,
                fontSize: "0.625rem",
                color: workStatus === "out" ? "#b91c1c" : "var(--color-primary)",
                fontFamily: FONT,
                fontWeight: 600,
              }}>
                {checkMsg}
              </div>
            )}
          </Card>


          {/* Overall Employees donut */}
          <Card>
            <SectionTitle>Overall Employees</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Donut value={total} max={Math.max(total, 1)} size={72} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.6875rem",
                    fontFamily: FONT,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--color-primary)",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Present:{" "}
                    <b style={{ color: "var(--color-text)", fontFamily: FONT_NUMERIC }}>{present}</b>
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.6875rem",
                    fontFamily: FONT,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#9ca3af",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "var(--color-text-muted)" }}>
                    On Leave:{" "}
                    <b style={{ color: "var(--color-text)", fontFamily: FONT_NUMERIC }}>{onLeave}</b>
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Row 2: Upcoming Holidays | Shift Schedule | My Leaves ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Upcoming Holidays */}
        <Card>
          <SectionTitle>Upcoming Holidays</SectionTitle>
          {upcomingHolidays.length === 0 ? (
            <Empty icon="🏝️" text="No Holidays Found" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {upcomingHolidays.map((holiday) => {
                const d = new Date(`${holiday.date}T00:00:00`);
                return (
                  <div
                    key={holiday.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 9,
                      background: "var(--color-surface-muted)",
                      border: "1px solid var(--color-border-muted)",
                      fontFamily: FONT,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "var(--color-primary-soft)",
                        color: "var(--color-primary)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontFamily: FONT,
                      }}
                    >
                      <span style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.04em" }}>
                        {d.toLocaleString("default", { month: "short" }).toUpperCase()}
                      </span>
                      <span
                        style={{
                          fontSize: "0.9375rem",
                          fontWeight: 800,
                          lineHeight: 1,
                          fontFamily: FONT_NUMERIC,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                    <div style={{ minWidth: 0, fontFamily: FONT }}>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--color-text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {holiday.name}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: 1 }}>
                        {holiday.type}
                        {holiday.branch ? ` · ${holiday.branch}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Shift Schedule */}
        <Card>
          <SectionTitle>Shift Schedule</SectionTitle>
          {displayShifts.length === 0 ? (
            <Empty icon="🕐" text="No Shifts Configured" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {displayShifts.map((sh, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "9px 11px",
                    borderRadius: 9,
                    background: "var(--color-surface-muted)",
                    border: "1px solid var(--color-border-muted)",
                    fontFamily: FONT,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: "var(--color-primary)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.8125rem",
                      fontFamily: FONT,
                    }}
                  >
                    G
                  </div>
                  <div style={{ fontFamily: FONT }}>
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        color: "var(--color-text)",
                        lineHeight: 1.3,
                      }}
                    >
                      {sh.label}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                      🕐 {sh.start}
                      {sh.end ? ` – ${sh.end}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* My Leaves */}
        <Card>
          <SectionTitle>My Leaves</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {LEAVE_TYPES.map((lt) => {
              const count = leaves.filter((l) =>
                l.leave_type?.toLowerCase().includes(lt.name.split(" ")[0].toLowerCase())
              ).length;
              return (
                <div
                  key={lt.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 9px",
                    borderRadius: 8,
                    background: lt.bg + "20",
                    border: `1px solid ${lt.bg}`,
                    fontFamily: FONT,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      flexShrink: 0,
                      background: lt.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.875rem",
                    }}
                  >
                    {lt.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontFamily: FONT }}>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        color: "var(--color-text)",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {lt.name}
                    </div>
                    <div style={{ fontSize: "0.5625rem", color: "var(--color-text-muted)", marginTop: 1 }}>
                      {count} days available
                    </div>
                  </div>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.8125rem",
                      color: lt.fg,
                      flexShrink: 0,
                      fontFamily: FONT_NUMERIC,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Row 3: Approval Requests | Announcements | Payslips ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr", gap: 12 }}>

        {/* Approval Requests */}
        <Card>
          <SectionTitle>Approval Requests</SectionTitle>
          {/* tabs */}
          <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
            {APPROVAL_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setApprovalTab(tab)}
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 20,
                  border: "1.5px solid",
                  borderColor: approvalTab === tab ? "var(--color-primary)" : "var(--color-border)",
                  cursor: "pointer",
                  transition: "all .15s",
                  background: approvalTab === tab ? "var(--color-primary)" : "transparent",
                  color: approvalTab === tab ? "#fff" : "var(--color-text-muted)",
                  fontFamily: FONT,
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* content */}
          {!approvalEmpty ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {approvalRows.slice(0, 5).map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--color-surface-muted)",
                    border: "1px solid var(--color-border-muted)",
                    fontSize: "0.75rem",
                    fontFamily: FONT,
                  }}
                >
                  <span style={{ color: "var(--color-text)", fontFamily: FONT }}>
                    {approvalTab === "Leave"
                      ? `Employee #${row.employee_id} — ${row.leave_type}`
                      : `Employee #${row.employee_id}`}
                  </span>
                  <span className="ui-badge ui-badge-pending" style={{ fontFamily: FONT }}>
                    {approvalTab === "Leave" ? "Pending" : "Draft"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="🔍" text="No Approval Requests" />
          )}
        </Card>

        {/* Announcements */}
        <Card>
          <SectionTitle>Announcements</SectionTitle>
          {announcements.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {announcements.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--color-surface-muted)",
                    border: "1px solid var(--color-border-muted)",
                    fontFamily: FONT,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--color-text)",
                      fontFamily: FONT,
                    }}
                  >
                    {a.title}
                  </div>
                  {a.body && (
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        color: "var(--color-text-muted)",
                        marginTop: 3,
                        lineHeight: 1.4,
                        fontFamily: FONT,
                      }}
                    >
                      {a.body}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="📢" text="No Announcements Found" />
          )}
        </Card>

        {/* Payslips */}
        <Card>
          <SectionTitle>Payslips</SectionTitle>
          {paidPayslips.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {paidPayslips.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 10px",
                    borderRadius: 8,
                    background: "var(--color-surface-muted)",
                    border: "1px solid var(--color-border-muted)",
                    fontSize: "0.75rem",
                    fontFamily: FONT,
                  }}
                >
                  <span style={{ color: "var(--color-text)", fontFamily: FONT }}>
                    Emp #{p.employee_id}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--color-text)",
                      fontFamily: FONT_NUMERIC,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    ₹{Number(p.net_pay).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="🧾" text="No Payslips Found" />
          )}
        </Card>
      </div>
    </div>
  );
}

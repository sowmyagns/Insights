import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import useAuth from "../../hooks/useAuth";

const pad = (n) => String(n ?? 0).padStart(2, "0");
const TODAY = new Date();
const DATE_LONG = TODAY.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const MONTH_LABEL = TODAY.toLocaleString("default", { month: "short" }) + " " + TODAY.getFullYear();

const LEAVE_TYPES = [
  { name: "Maternity Leave",   icon: "🤱", bg: "#dbeafe", fg: "#1d4ed8" },
  { name: "Paternity Leave",   icon: "🙌", bg: "#fce7f3", fg: "#9d174d" },
  { name: "Sabbatical Leave",  icon: "🚗", bg: "#fef9c3", fg: "#854d0e" },
  { name: "Sick Leave",        icon: "💊", bg: "#f1f5f9", fg: "#475569" },
  { name: "Leave Without Pay", icon: "⭕", bg: "#fef2f2", fg: "#991b1b" },
];

function StatIcon({ k }) {
  const p = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" };
  if (k === "active")  return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>;
  if (k === "hired")   return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
  if (k === "exits")   return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
  if (k === "present") return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
  if (k === "absent")  return <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
  if (k === "onleave") return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  return null;
}

function Donut({ value = 0, max = 1, size = 76, color = "#0751b2", bg = "#e5e7eb", thick = 8 }) {
  const r = (size - thick) / 2 - 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const cx = size / 2, cy = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={bg} strokeWidth={thick} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={thick}
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray .6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.24, fontWeight: 800, color: "var(--color-text)", lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: size * 0.13, color: "var(--color-text-muted)", marginTop: 1 }}>Total</span>
      </div>
    </div>
  );
}

const Card = ({ children, style = {} }) => (
  <div className="ui-card" style={{ padding: "14px 16px", ...style }}>{children}</div>
);

const SectionTitle = ({ children, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{children}</span>
    {action}
  </div>
);

const Chip = ({ label }) => (
  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "var(--color-surface-muted)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>{label}</span>
);

const Empty = ({ icon, text }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 5 }}>
    <span style={{ fontSize: 26 }}>{icon}</span>
    <span style={{ fontSize: 11.5, color: "var(--color-text-faint)" }}>{text}</span>
  </div>
);

const StatCard = ({ iconKey, label, value, iconBg, iconColor, valueBg }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px", borderRadius: 12,
    background: valueBg, border: `1px solid ${iconBg}88`,
  }}>
    <div style={{
      width: 46, height: 46, borderRadius: 12, flexShrink: 0,
      background: iconBg, color: iconColor,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <StatIcon k={iconKey} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: iconColor, lineHeight: 1, whiteSpace: "nowrap", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-text)", lineHeight: 1 }}>{value}</div>
    </div>
  </div>
);

export default function HRDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary]         = useState({});
  const [shifts, setShifts]           = useState([]);
  const [leaves, setLeaves]           = useState([]);
  const [payroll, setPayroll]         = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [approvalTab, setApprovalTab] = useState("Leave");
  const [elapsed, setElapsed]         = useState(0);
  const [running, setRunning]         = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    api.dashboard.summary().then(setSummary).catch(() => {});
    api.shifts.list().then(setShifts).catch(() => {});
    api.leaves.list().then(setLeaves).catch(() => {});
    api.payroll.list().then(setPayroll).catch(() => {});
    api.announcements.list().then(setAnnouncements).catch(() => {});
  }, []);

  useEffect(() => {
    if (running) timerRef.current = setInterval(() => setElapsed((n) => n + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [running]);

  const hh = Math.floor(elapsed / 3600);
  const mm = Math.floor((elapsed % 3600) / 60);
  const ss = elapsed % 60;
  const timerStr = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;

  const total       = summary.headcount ?? 0;
  const present     = summary.attendance_today ?? 0;
  const absent      = summary.absent ?? Math.max(0, total - present);
  const onLeave     = summary.on_leave ?? 0;
  const leavePending = summary.leave_pending ?? leaves.filter((l) => l.status === "pending").length;
  const payrollPending = summary.payroll_pending ?? payroll.filter((p) => p.status === "draft").length;

  const approvalTabs = ["Leave", "Attendance", "Overtime", "Expenses"];

  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const pendingPayroll = payroll.filter((p) => p.status === "draft");

  const displayShifts = shifts.length
    ? shifts.slice(0, 2).map((s) => {
        const fmt = (t) => {
          if (!t) return "";
          const [h, m] = String(t).split(":").map(Number);
          return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
        };
        return { label: s.name || "General", start: fmt(s.start_time), end: fmt(s.end_time) };
      })
    : [{ label: "General", start: "10:00 AM", end: "07:00 PM" }];

  return (
    <div className="ui-page" style={{ paddingTop: 16, paddingBottom: 28 }}>

      {/* ── Row 1: Employee | Celebration | Work + Overall ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.1fr 1fr", gap: 12, marginBottom: 12 }}>

        <Card>
          <SectionTitle action={<Chip label={MONTH_LABEL} />}>Employee</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <StatCard iconKey="active"  label="Active"   value={total}    iconBg="#bbf7d0" iconColor="#15803d" valueBg="#f0fdf4" />
            <StatCard iconKey="hired"   label="Hired"    value={0}        iconBg="#bfdbfe" iconColor="#1d4ed8" valueBg="#eff6ff" />
            <StatCard iconKey="exits"   label="Exits"    value={0}        iconBg="#e5e7eb" iconColor="#374151" valueBg="#f9fafb" />
            <StatCard iconKey="present" label="Present"  value={present}  iconBg="#a5f3fc" iconColor="#0e7490" valueBg="#ecfeff" />
            <StatCard iconKey="absent"  label="Absent"   value={absent}   iconBg="#fecaca" iconColor="#b91c1c" valueBg="#fff1f2" />
            <StatCard iconKey="onleave" label="On Leave" value={onLeave}  iconBg="#fde68a" iconColor="#92400e" valueBg="#fffbeb" />
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column" }}>
          <SectionTitle>Celebration Corner</SectionTitle>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Empty icon="🎊" text="No Celebrations Found" />
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <SectionTitle>Let&apos;s Get To Work</SectionTitle>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 3 }}>{DATE_LONG}</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "0.04em", color: "var(--color-text)", marginBottom: 7, fontVariantNumeric: "tabular-nums" }}>{timerStr}</div>
            <div style={{ height: 4, borderRadius: 99, background: "var(--color-border)", marginBottom: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--color-action-teal), var(--color-primary))", width: running ? `${Math.min((elapsed / 28800) * 100, 100)}%` : "0%", transition: "width 1s linear" }} />
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button className="ui-btn-success ui-btn--sm" onClick={() => { if (!running) { setElapsed(0); setRunning(true); } }}>Check In</button>
              <button className="ui-btn-danger ui-btn--sm" onClick={() => setRunning(false)}>Check Out</button>
            </div>
          </Card>

          <Card>
            <SectionTitle>Overall Employees</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Donut value={total} max={Math.max(total, 1)} size={72} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0751b2", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ color: "var(--color-text-muted)" }}>Present: <b style={{ color: "var(--color-text)" }}>{present}</b></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#9ca3af", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ color: "var(--color-text-muted)" }}>On Leave: <b style={{ color: "var(--color-text)" }}>{onLeave}</b></span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Row 2: Holidays | Shift Schedule | My Leaves ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: 12, marginBottom: 12 }}>

        <Card>
          <SectionTitle>Upcoming Holidays</SectionTitle>
          <Empty icon="🏝️" text="No Holidays Found" />
        </Card>

        <Card>
          <SectionTitle>Shift Schedule</SectionTitle>
          {displayShifts.length === 0 ? (
            <Empty icon="🕐" text="No Shifts Configured" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {displayShifts.map((sh, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "center", padding: "8px 10px", borderRadius: 9, background: "var(--color-surface-muted)", border: "1px solid var(--color-border-muted)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: "var(--color-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>G</div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text)" }}>{sh.label}</div>
                    <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 1 }}>🕐 {sh.start}{sh.end ? ` – ${sh.end}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>My Leaves</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {LEAVE_TYPES.map((lt) => {
              const count = leaves.filter((l) => l.leave_type?.toLowerCase().includes(lt.name.split(" ")[0].toLowerCase())).length;
              return (
                <div key={lt.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 8, background: lt.bg + "20", border: `1px solid ${lt.bg}` }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: lt.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{lt.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lt.name}</div>
                    <div style={{ fontSize: 9.5, color: "var(--color-text-muted)" }}>{count} days available</div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 12, color: lt.fg, flexShrink: 0 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Row 3: Approval Requests | Announcements | Payslips ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr", gap: 12 }}>

        <Card>
          <SectionTitle>Approval Requests</SectionTitle>
          <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
            {approvalTabs.map((tab) => (
              <button key={tab} onClick={() => setApprovalTab(tab)} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "1.5px solid", borderColor: approvalTab === tab ? "var(--color-primary)" : "var(--color-border)", cursor: "pointer", transition: "all .15s", background: approvalTab === tab ? "var(--color-primary)" : "transparent", color: approvalTab === tab ? "#fff" : "var(--color-text-muted)" }}>{tab}</button>
            ))}
          </div>
          {approvalTab === "Leave" && pendingLeaves.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pendingLeaves.slice(0, 5).map((l) => (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 8, background: "var(--color-surface-muted)", border: "1px solid var(--color-border-muted)", fontSize: 11.5 }}>
                  <span style={{ color: "var(--color-text)" }}>Employee #{l.employee_id} — {l.leave_type}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "#fef9c3", color: "#854d0e" }}>Pending</span>
                </div>
              ))}
            </div>
          ) : approvalTab === "Payroll" && pendingPayroll.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pendingPayroll.slice(0, 5).map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 8, background: "var(--color-surface-muted)", border: "1px solid var(--color-border-muted)", fontSize: 11.5 }}>
                  <span style={{ color: "var(--color-text)" }}>Employee #{p.employee_id}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "#fef9c3", color: "#854d0e" }}>Draft</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="🔍" text="No Approval Requests" />
          )}
        </Card>

        <Card>
          <SectionTitle>Announcements</SectionTitle>
          {announcements.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {announcements.slice(0, 4).map((a) => (
                <div key={a.id} style={{ padding: "7px 10px", borderRadius: 8, background: "var(--color-surface-muted)", border: "1px solid var(--color-border-muted)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>{a.title}</div>
                  {a.body && <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 2 }}>{a.body}</div>}
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="📢" text="No Announcements Found" />
          )}
        </Card>

        <Card>
          <SectionTitle>Payslips</SectionTitle>
          {payroll.filter((p) => p.status === "paid").length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {payroll.filter((p) => p.status === "paid").slice(0, 4).map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 8, background: "var(--color-surface-muted)", border: "1px solid var(--color-border-muted)", fontSize: 11.5 }}>
                  <span style={{ color: "var(--color-text)" }}>Emp #{p.employee_id}</span>
                  <span style={{ fontWeight: 700, color: "var(--color-text)" }}>₹{Number(p.net_pay).toLocaleString("en-IN")}</span>
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

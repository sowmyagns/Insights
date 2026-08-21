import { useState, useEffect } from "react";
import { api } from "../api";

const LEAVE_TYPES = [
  { name: "Maternity Leave", icon: "🤱", color: "#dbeafe" },
  { name: "Paternity Leave", icon: "🙌", color: "#fecaca" },
  { name: "Sabbatical Leave", icon: "🚗", color: "#fef3c7" },
  { name: "Sick Leave", icon: "💊", color: "#e5e7eb" },
  { name: "Leave Without Pay", icon: "⭕", color: "#dbeafe" },
];

export default function Dashboard({
  employees,
  leaves,
  jobs,
  stats,
  user,
  onNavigate,
  apiMode,
}) {
  const activeCount = employees.filter((e) => e.status === "Active").length;
  const onLeaveCount = employees.filter((e) => e.status === "On Leave").length;
  const presentToday = stats?.present_today ?? activeCount;
  const absentToday = stats?.absent_today ?? Math.max(0, activeCount - presentToday);
  const totalEmployees = stats?.total_employees ?? employees.length;
  const pendingLeave = stats?.pending_leave ?? leaves.filter((l) => l.status === "Pending" || l.status === "pending").length;
  const totalExpenses = stats?.payroll_total ?? 0;
  const userName = user?.name || user?.email?.split("@")[0] || "User";

  const [approvalTab, setApprovalTab] = useState("Leave");
  const [shifts, setShifts] = useState([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [timer, setTimer] = useState("00:00:00");

  useEffect(() => {
    if (apiMode) {
      api.shifts.list().then(setShifts).catch(() => setShifts([]));
      api.expenses.list().then((list) => {
        const sum = list.reduce((a, e) => a + (e.amount || 0), 0);
        setExpensesTotal(sum);
      }).catch(() => setExpensesTotal(0));
    }
  }, [apiMode]);

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const monthTag = `${new Date().toLocaleString("default", { month: "short" })} - ${new Date().getFullYear()}`;

  const formatTime = (t) => {
    if (!t) return "10:00 AM";
    const [h, m] = String(t).split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, "0")} ${ap}`;
  };

  const displayShifts = shifts.length
    ? shifts.slice(0, 2).map((s) => ({
        label: s.name || "General",
        start: formatTime(s.start_time),
        end: formatTime(s.end_time),
        from: "25 Feb 2026",
        to: "31 Mar 2026",
      }))
    : [];

  return (
    <div className="dashboard-otu">
      {/* Welcome Section */}
      <div className="dash-welcome-card">
        <div className="dash-welcome">
          <div>
            <h1 className="dash-welcome-title">Welcome, {userName}</h1>
          </div>
          <div className="dash-welcome-illus" />
        </div>
      </div>

      <div className="dash-grid dash-grid-top">
        {/* Employee Analytics */}
        <div className="dash-card dash-analytics">
          <div className="dash-card-header">
            <span className="dash-card-title">Employee Analytics</span>
            <span className="dash-tag">{monthTag}</span>
          </div>
          <div className="dash-analytics-row">
            <div className="dash-analytics-item">
              <div className="dash-ai-icon dash-ai-green">👥</div>
              <span className="dash-ai-label">Active</span>
              <span className="dash-ai-val">{activeCount}</span>
            </div>
            <div className="dash-analytics-item">
              <div className="dash-ai-icon dash-ai-blue">✓</div>
              <span className="dash-ai-label">Hired</span>
              <span className="dash-ai-val">0</span>
            </div>
            <div className="dash-analytics-item">
              <div className="dash-ai-icon dash-ai-gray">✕</div>
              <span className="dash-ai-label">Exits</span>
              <span className="dash-ai-val">0</span>
            </div>
          </div>
          <div className="dash-analytics-row dash-analytics-row2">
            <div className="dash-analytics-item">
              <div className="dash-ai-icon dash-ai-blue">🪑</div>
              <span className="dash-ai-label">Present</span>
              <span className="dash-ai-val">{presentToday}</span>
            </div>
            <div className="dash-analytics-item">
              <div className="dash-ai-icon dash-ai-red">👥</div>
              <span className="dash-ai-label">Absent</span>
              <span className="dash-ai-val">{absentToday}</span>
            </div>
            <div className="dash-analytics-item">
              <div className="dash-ai-icon dash-ai-yellow">☂</div>
              <span className="dash-ai-label">On leave</span>
              <span className="dash-ai-val">{onLeaveCount}</span>
            </div>
          </div>
        </div>

        {/* Celebration Corner */}
        <div className="dash-card dash-celebration">
          <div className="dash-card-title">Celebration Corner</div>
          <div className="dash-empty-illus">🎊</div>
          <div className="dash-empty-text">No Celebrations Found</div>
        </div>

        <div className="dash-side-col">
          {/* Let's Get To Work */}
          <div className="dash-card dash-work">
            <div className="dash-card-title">Let&apos;s Get To Work</div>
            <div className="dash-date">{formattedDate}</div>
            <div className="dash-timer">{timer}</div>
            <div className="dash-progress">
              <div className="dash-progress-bar" style={{ width: "0%" }} />
            </div>
            <div className="dash-work-btns">
              <button
                className="dash-btn-teal"
                onClick={() => onNavigate?.("attendance-view")}
              >
                Check In
              </button>
              <button
                className="dash-btn-teal"
                onClick={() => onNavigate?.("attendance-overtime")}
              >
                Start Over Time
              </button>
            </div>
          </div>

          {/* Overall Employees */}
          <div className="dash-card dash-donut-card">
            <div className="dash-card-title">Overall Employees</div>
            <div className="dash-donut-wrap">
              <div className="dash-donut">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1e3a8a" strokeWidth="12" strokeDasharray={`${(totalEmployees / Math.max(totalEmployees, 1)) * 251} 251`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <span className="dash-donut-num">{totalEmployees}</span>
              </div>
            </div>
            <div className="dash-donut-legend">
              <span><i className="dot-blue" /> Hired</span>
              <span><i className="dot-gray" /> Exits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Second row: Holidays, Shift Schedule, Total Expenses */}
      <div className="dash-grid dash-grid-3">
        <div className="dash-card">
          <div className="dash-card-title">Upcoming Holidays</div>
          <div className="dash-empty-illus dash-illus-beach">🏝️</div>
          <div className="dash-empty-text">No Holidays Found</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-title">Shift Schedule</div>
          <div className="dash-shifts">
            {displayShifts.length === 0 ? <div className="dash-empty-text">No Shifts Configured</div> : displayShifts.map((s, i) => (
              <div key={i} className="dash-shift-item">
                <div className="dash-shift-avatar">G</div>
                <div>
                  <div className="dash-shift-label">{s.label}</div>
                  <div className="dash-shift-meta">
                    <span>📅 {s.from} - {s.to}</span>
                  </div>
                  <div className="dash-shift-meta">
                    <span>🕐 {s.start} to {s.end}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="dash-card dash-expenses">
          <div className="dash-card-title">Total Expenses</div>
          <div className="dash-expenses-donut">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#94a3b8" strokeWidth="10" strokeDasharray="62 251" strokeLinecap="round" transform="rotate(-90 50 50)" />
            </svg>
            <span className="dash-expenses-val">₹ {(expensesTotal || totalExpenses || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Third row: My Leaves, Approval Requests, Announcements */}
      <div className="dash-grid dash-grid-3">
        <div className="dash-card dash-leaves">
          <div className="dash-card-title">My Leaves</div>
          <div className="dash-leaves-list">
            {LEAVE_TYPES.map((lt, i) => (
              <div key={i} className="dash-leave-row">
                <div className="dash-leave-icon" style={{ background: lt.color }}>{lt.icon}</div>
                <div className="dash-leave-info">
                  <span>{lt.name}</span>
                  <span className="dash-leave-sub">Available 0 Days</span>
                </div>
                <div className="dash-leave-num">0</div>
              </div>
            ))}
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-card-title">Approval Requests</div>
          <div className="dash-approval-tabs">
            {["Leave", "Attendance", "Overtime", "Expenses"].map((t) => (
              <button
                key={t}
                className={`dash-approval-tab ${approvalTab === t ? "active" : ""}`}
                onClick={() => setApprovalTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="dash-empty-state">
            <div className="dash-empty-illus dash-illus-search">🔍</div>
            <div className="dash-empty-text">No Approval Requests</div>
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-card-title">Announcements</div>
          <div className="dash-empty-state">
            <div className="dash-empty-illus">📢</div>
            <div className="dash-empty-text">No Announcements Found</div>
          </div>
        </div>
      </div>

      <div className="dash-grid dash-grid-2">
        <div className="dash-card dash-payslips">
          <div className="dash-card-title">Payslips</div>
          <div className="dash-empty-illus">🧾</div>
          <div className="dash-empty-text">No Payslips Found</div>
        </div>
        <div className="dash-card dash-empty-panel" />
      </div>

      {/* Footer */}
      <div className="dash-footer">©2024 otuindia.com</div>
    </div>
  );
}

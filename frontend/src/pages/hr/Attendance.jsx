import { useState, useEffect } from "react";
import { api } from "../api";
import "./Attendance.css";

const DAY_HEADERS = [
  { label: "Mon", emoji: "👨" }, { label: "Tue", emoji: "☕" },
  { label: "Wed", emoji: "🐪" }, { label: "Thur", emoji: "🧠" },
  { label: "Fri", emoji: "🍸" }, { label: "Sat", emoji: "🎉" },
  { label: "Sun", emoji: "☀️" },
];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtTime(dt) {
  if (!dt) return null;
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function diffMinutes(start, end) {
  if (!start || !end) return 0;
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return Math.round((e - s) / 60000);
}
function fmtHours(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

export default function Attendance({ employees, apiMode }) {
  const today = new Date();
  const [viewMode, setViewMode] = useState("month");
  const [calendarOrList, setCalendarOrList] = useState("calendar");
  const [month, setMonth] = useState(() => today.toISOString().slice(0, 7));
  const [attEmp, setAttEmp] = useState("");

  useEffect(() => {
    if (!attEmp && employees?.length) setAttEmp(String(employees[0].id));
  }, [employees]);
  const [apiAtt, setApiAtt] = useState([]);

  useEffect(() => {
    if (apiMode && attEmp) {
      api.attendance.report(attEmp, month).then(setApiAtt).catch(() => setApiAtt([]));
    } else setApiAtt([]);
  }, [apiMode, attEmp, month]);

  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const prevMonthLast = new Date(y, m - 1, 0).getDate();

  const cells = [];
  const prevMonthIdx = m === 1 ? 11 : m - 2;
  const prevYear = m === 1 ? y - 1 : y;
  for (let i = 0; i < startPad; i++) cells.push({ day: prevMonthLast - startPad + i + 1, month: prevMonthIdx, year: prevYear, isPrev: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, month: m - 1, year: y, isPrev: false });
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const nextMonthIdx = m === 12 ? 0 : m;
    const nextYear = m === 12 ? y + 1 : y;
    for (let i = 0; i < 7 - remainder; i++) cells.push({ day: i + 1, month: nextMonthIdx, year: nextYear, isNext: true });
  }

  const attByDate = {};
  apiAtt.forEach((a) => { attByDate[a.date || ""] = a; });

  let present = 0, absent = 0, onLeave = 0, workingDays = 0, totalMins = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dt = new Date(y, m - 1, d);
    const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
    if (!isWeekend) workingDays++;
    const rec = attByDate[ds];
    if (rec) {
      const st = (rec.status || "").toLowerCase();
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "leave") onLeave++;
      if (rec.check_in && rec.check_out) totalMins += diffMinutes(rec.check_in, rec.check_out);
    }
  }

  const navMonth = (delta) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const buildWeekCells = () => {
    const current = new Date();
    let base = new Date(y, m - 1, 1);
    if (current.getFullYear() === y && current.getMonth() === m - 1) base = new Date(current);
    const weekday = (base.getDay() + 6) % 7;
    const weekStart = new Date(base);
    weekStart.setDate(base.getDate() - weekday);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), isPrev: d.getMonth() < m - 1 || d.getFullYear() < y, isNext: d.getMonth() > m - 1 || d.getFullYear() > y };
    });
  };

  const cellsToRender = viewMode === "week" ? buildWeekCells() : cells;

  const doCheckIn = async () => {
    if (!attEmp || !apiMode) return;
    try {
      const pos = await new Promise((res) => navigator.geolocation?.getCurrentPosition(res, () => res(null)));
      await api.attendance.checkin(Number(attEmp), pos?.coords?.latitude, pos?.coords?.longitude);
    } catch { await api.attendance.checkin(Number(attEmp)); }
    api.attendance.report(attEmp, month).then(setApiAtt);
  };

  const doCheckOut = async () => {
    if (!attEmp || !apiMode) return;
    try {
      const pos = await new Promise((res) => navigator.geolocation?.getCurrentPosition(res, () => res(null)));
      await api.attendance.checkout(Number(attEmp), pos?.coords?.latitude, pos?.coords?.longitude);
    } catch { await api.attendance.checkout(Number(attEmp)); }
    api.attendance.report(attEmp, month).then(setApiAtt);
  };

  const summaryCards = [
    { label: "Present", value: present, color: "#15803d", bg: "#dcfce7" },
    { label: "Absent", value: absent, color: "#b91c1c", bg: "#fee2e2" },
    { label: "Leave", value: onLeave, color: "#92400e", bg: "#fef9c3" },
    { label: "Working Days", value: workingDays, color: "#1d4ed8", bg: "#dbeafe" },
    { label: "Working Hours", value: fmtHours(totalMins), color: "#0e7490", bg: "#cffafe" },
  ];

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Employee Attendance</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Track employee attendance on a daily basis.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(-1)}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", minWidth: 90, textAlign: "center" }}>{MONTHS[m - 1]} {y}</span>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(1)}>›</button>
          <button className={`ui-btn--sm ${viewMode === "month" ? "ui-btn-primary" : "ui-btn-outline"}`} onClick={() => setViewMode("month")}>Month</button>
          <button className={`ui-btn--sm ${viewMode === "week" ? "ui-btn-primary" : "ui-btn-outline"}`} onClick={() => setViewMode("week")}>Week</button>
        </div>
      </div>

      {/* Employee selector + summary */}
      <div className="ui-card" style={{ padding: "14px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 200 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Employee</label>
            <select className="ui-select" style={{ minHeight: 36, fontSize: 13 }} value={attEmp} onChange={(e) => setAttEmp(e.target.value)}>
              {employees?.map((e) => <option key={e.id} value={e.id}>{e.full_name || e.name || `Employee ${e.id}`}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flex: 1 }}>
            {summaryCards.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 14px", borderRadius: 10, background: s.bg, border: `1px solid ${s.bg}`, minWidth: 80 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
                <span style={{ fontSize: 10.5, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
        {["calendar", "list"].map((v) => (
          <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, color: calendarOrList === v ? "var(--color-primary)" : "var(--color-text-muted)" }}>
            <input type="radio" name="attView" checked={calendarOrList === v} onChange={() => setCalendarOrList(v)} style={{ accentColor: "var(--color-primary)" }} />
            {v === "calendar" ? "Calendar View" : "List View"}
          </label>
        ))}
      </div>

      {/* Calendar / List */}
      {calendarOrList === "calendar" ? (
        <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--color-surface-thead)", borderBottom: "1px solid var(--color-border)" }}>
            {DAY_HEADERS.map((h) => (
              <div key={h.label} style={{ padding: "10px 8px", textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)" }}>
                {h.emoji} {h.label}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cellsToRender.map((cell, i) => {
              const ds = `${cell.year}-${String(cell.month + 1).padStart(2,"0")}-${String(cell.day).padStart(2,"0")}`;
              const dt = new Date(cell.year, cell.month, cell.day);
              const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
              const rec = attByDate[ds];
              const workMins = rec?.check_in && rec?.check_out ? diffMinutes(rec.check_in, rec.check_out) : 0;
              return (
                <div key={i} style={{ borderRight: "1px solid var(--color-border-muted)", borderBottom: "1px solid var(--color-border-muted)", padding: "8px 10px", minHeight: 80, background: cell.isPrev || cell.isNext ? "var(--color-surface-muted)" : "var(--color-surface)", opacity: cell.isPrev || cell.isNext ? 0.5 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>📅</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-text)" }}>{String(cell.day).padStart(2,"0")} {MONTHS[cell.month]}</span>
                  </div>
                  {isWeekend && <span style={{ fontSize: 9.5, background: "#fef9c3", color: "#92400e", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>Weekend</span>}
                  {rec && !cell.isPrev && !cell.isNext && (
                    <div style={{ marginTop: 4, fontSize: 10, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                      <div>In: {fmtTime(rec.check_in) || "—"}</div>
                      <div>Out: {fmtTime(rec.check_out) || "—"}</div>
                      <div>Hrs: {fmtHours(workMins)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="ui-table-wrap" style={{ border: "none" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-thead)" }}>
                  {["Date","Check In","Check Out","Status"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apiAtt.length ? apiAtt.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                    <td style={{ padding: "10px 14px", fontSize: 13 }}>{a.date}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13 }}>{fmtTime(a.check_in) || "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13 }}>{fmtTime(a.check_out) || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span className={`ui-badge ui-badge-${(a.status || "present").toLowerCase() === "present" ? "success" : (a.status || "").toLowerCase() === "absent" ? "danger" : "warning"}`}>{a.status || "present"}</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="ui-empty">No attendance records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      {apiMode && (
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button className="ui-btn-success" onClick={doCheckIn}>✓ Check In</button>
          <button className="ui-btn-danger" onClick={doCheckOut}>✗ Check Out</button>
          <button className="ui-btn-outline" onClick={() => api.reports.attendanceExcel(month, attEmp)}>📥 Export Excel</button>
        </div>
      )}
    </div>
  );
}

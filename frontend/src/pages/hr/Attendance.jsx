import { useState, useEffect } from "react";
import { api } from "../api";

const DAY_HEADERS = [
  { label: "Mon", emoji: "👨" },
  { label: "Tue", emoji: "☕" },
  { label: "Wed", emoji: "🐪" },
  { label: "Thur", emoji: "🧠" },
  { label: "Fri", emoji: "🍸" },
  { label: "Sat", emoji: "🎉" },
  { label: "Sun", emoji: "☀️" },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function Attendance({ employees, apiMode }) {
  const today = new Date();
  const [viewMode, setViewMode] = useState("month"); // month | week
  const [calendarOrList, setCalendarOrList] = useState("calendar"); // calendar | list
  const [month, setMonth] = useState(() => today.toISOString().slice(0, 7));
  const [attEmp, setAttEmp] = useState(employees?.[0]?.id ?? "");
  const [apiAtt, setApiAtt] = useState([]);

  const selectedEmp = employees?.find((e) => String(e.id) === String(attEmp));

  useEffect(() => {
    if (apiMode && attEmp) {
      api.attendance.report(attEmp, month).then(setApiAtt).catch(() => setApiAtt([]));
    } else {
      setApiAtt([]);
    }
  }, [apiMode, attEmp, month]);

  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();
  const prevMonthLast = new Date(y, m - 1, 0).getDate();

  const cells = [];
  const prevMonthIdx = m === 1 ? 11 : m - 2;
  const prevYear = m === 1 ? y - 1 : y;
  for (let i = 0; i < startPad; i++) {
    const d = prevMonthLast - startPad + i + 1;
    cells.push({ day: d, month: prevMonthIdx, year: prevYear, isPrev: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: m - 1, year: y, isPrev: false });
  }
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const remaining = 7 - remainder;
    const nextMonthIdx = m === 12 ? 0 : m;
    const nextYear = m === 12 ? y + 1 : y;
    for (let i = 0; i < remaining; i++) {
      cells.push({ day: i + 1, month: nextMonthIdx, year: nextYear, isNext: true });
    }
  }

  const attByDate = {};
  apiAtt.forEach((a) => {
    const key = a.date || "";
    attByDate[key] = a;
  });

  let present = 0, absent = 0, onLeave = 0, workingDays = 0;
  let totalMins = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dt = new Date(y, m - 1, d);
    const dayOfWeek = dt.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (!isWeekend) workingDays++;
    const rec = attByDate[ds];
    if (rec) {
      if ((rec.status || "").toLowerCase() === "present") present++;
      else if ((rec.status || "").toLowerCase() === "absent") absent++;
      else if ((rec.status || "").toLowerCase() === "leave") onLeave++;
      if (rec.check_in && rec.check_out) {
        totalMins += diffMinutes(rec.check_in, rec.check_out);
      }
    }
  }

  const navMonth = (delta) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const buildWeekCells = () => {
    const current = new Date();
    let base = new Date(y, m - 1, 1);
    if (current.getFullYear() === y && current.getMonth() === m - 1) {
      base = new Date(current);
    }
    const weekday = (base.getDay() + 6) % 7; // Monday = 0
    const weekStart = new Date(base);
    weekStart.setDate(base.getDate() - weekday);
    const weekCells = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      weekCells.push({
        day: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        isPrev: d.getMonth() < m - 1 || d.getFullYear() < y,
        isNext: d.getMonth() > m - 1 || d.getFullYear() > y,
      });
    }
    return weekCells;
  };

  const cellsToRender = viewMode === "week" ? buildWeekCells() : cells;

  const doCheckIn = async () => {
    if (!attEmp || !apiMode) return;
    try {
      const pos = await new Promise((res) => navigator.geolocation?.getCurrentPosition(res, () => res(null)));
      const lat = pos?.coords?.latitude;
      const lng = pos?.coords?.longitude;
      await api.attendance.checkin(Number(attEmp), lat, lng);
    } catch {
      await api.attendance.checkin(Number(attEmp));
    }
    api.attendance.report(attEmp, month).then(setApiAtt);
  };

  const doCheckOut = async () => {
    if (!attEmp || !apiMode) return;
    try {
      const pos = await new Promise((res) => navigator.geolocation?.getCurrentPosition(res, () => res(null)));
      const lat = pos?.coords?.latitude;
      const lng = pos?.coords?.longitude;
      await api.attendance.checkout(Number(attEmp), lat, lng);
    } catch {
      await api.attendance.checkout(Number(attEmp));
    }
    api.attendance.report(attEmp, month).then(setApiAtt);
  };

  return (
    <div className="att-view">
      <div className="att-header">
        <div>
          <h1 className="att-title">Employee Attendance</h1>
          <p className="att-subtitle">Keep track of employee&apos;s attendance on a daily basis.</p>
        </div>
        <div className="att-month-nav">
          <button type="button" className="att-nav-btn" onClick={() => navMonth(-1)}>‹</button>
          <span className="att-month-label">{MONTHS[m - 1]} {y}</span>
          <button type="button" className="att-nav-btn" onClick={() => navMonth(1)}>›</button>
        </div>
        <div className="att-view-toggles">
          <button
            type="button"
            className={`att-view-btn ${viewMode === "month" ? "active" : ""}`}
            onClick={() => setViewMode("month")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Month View
          </button>
          <button
            type="button"
            className={`att-view-btn ${viewMode === "week" ? "active" : ""}`}
            onClick={() => setViewMode("week")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Week View
          </button>
        </div>
      </div>

      <div className="att-employee-row">
        <div className="att-employee-select">
          <label>Employee Name</label>
          <select value={attEmp} onChange={(e) => setAttEmp(e.target.value)}>
            {employees?.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div className="att-summary-cards">
          {[
            { label: "Present", value: present },
            { label: "Absent", value: absent },
            { label: "Leave", value: onLeave },
            { label: "Working Days", value: workingDays },
            { label: "Total Working Hours", value: fmtHours(totalMins) },
            { label: "Total Hours", value: fmtHours(totalMins) },
          ].map((s) => (
            <div key={s.label} className="att-summary-card">
              <span className="att-summary-value">{s.value}</span>
              <span className="att-summary-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="att-view-type">
        <label className={`att-radio ${calendarOrList === "calendar" ? "active" : ""}`}>
          <input
            type="radio"
            name="attView"
            checked={calendarOrList === "calendar"}
            onChange={() => setCalendarOrList("calendar")}
          />
          Calendar View
        </label>
        <label className={`att-radio ${calendarOrList === "list" ? "active" : ""}`}>
          <input type="radio" name="attView" checked={calendarOrList === "list"} onChange={() => setCalendarOrList("list")} />
          List View
        </label>
      </div>

      {calendarOrList === "calendar" ? (
        <div className="att-calendar-wrap">
          <div className="att-calendar-headers">
            {DAY_HEADERS.map((h) => (
              <div key={h.label} className="att-day-header">
                {h.emoji} {h.label}
              </div>
            ))}
          </div>
          <div className="att-calendar-grid">
            {cellsToRender.map((cell, i) => {
              const ds = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
              const dt = new Date(cell.year, cell.month, cell.day);
              const dayOfWeek = dt.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const rec = attByDate[ds];
              const workMins = rec && rec.check_in && rec.check_out ? diffMinutes(rec.check_in, rec.check_out) : 0;

              return (
                <div
                  key={i}
                  className={`att-cell ${cell.isPrev || cell.isNext ? "other-month" : ""}`}
                >
                  <div className="att-cell-top">
                    <span className="att-cell-icon">📅</span>
                    <span className="att-cell-date">{String(cell.day).padStart(2, "0")} {MONTHS[cell.month]}</span>
                  </div>
                  {isWeekend && (
                    <div className="att-weekend-tag">Weekend</div>
                  )}
                  {rec && !cell.isPrev && !cell.isNext && (
                    <div className="att-cell-details">
                      <div>Check In {fmtTime(rec.check_in) || "—"}</div>
                      <div>Check Out {fmtTime(rec.check_out) || "—"}</div>
                      <div>Over Time 00:00</div>
                      <div>Working Hours {fmtHours(workMins)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="att-list-wrap">
          <table className="att-list-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {apiAtt.length ? apiAtt.map((a) => (
                <tr key={a.id}>
                  <td>{a.date}</td>
                  <td>{fmtTime(a.check_in) || "—"}</td>
                  <td>{fmtTime(a.check_out) || "—"}</td>
                  <td><span className="badge bg">{(a.status || "present")}</span></td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="att-empty">No attendance records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {apiMode && (
        <div className="att-actions">
          <button type="button" className="att-check-btn" onClick={doCheckIn}>Check In</button>
          <button type="button" className="att-check-btn" onClick={doCheckOut}>Check Out</button>
          <button type="button" className="att-export-btn" onClick={() => api.reports.attendanceExcel(month, attEmp)}>
            📥 Export Excel
          </button>
        </div>
      )}

      <div className="att-footer">©2024 otuindia.com</div>
    </div>
  );
}

<<<<<<< HEAD
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar, List, LogIn, LogOut } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import "./Attendance.css";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function fmtTime(dt) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }); }
  catch { return "—"; }
}
function diffMins(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
}
function fmtHrs(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2,"0")}:${String(mins % 60).padStart(2,"0")}`;
}

const STATUS_COLORS = {
  present:   { bg: "#dcfce7", text: "#15803d" },
  absent:    { bg: "#fee2e2", text: "#dc2626" },
  leave:     { bg: "#fef9c3", text: "#854d0e" },
  "half-day":{ bg: "#dbeafe", text: "#1d4ed8" },
};

export default function HRAttendancePage() {
  const today = new Date();
  const [employees, setEmployees] = useState([]);
  const [empId, setEmpId] = useState("");
  const [month, setMonth] = useState(today.toISOString().slice(0, 7));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("calendar");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    axiosInstance.get("/hr/employees")
      .then((r) => {
        const list = Array.isArray(r.data?.results ?? r.data) ? (r.data?.results ?? r.data) : [];
        setEmployees(list);
        if (list.length) setEmpId(String(list[0].id));
      })
      .catch(() => {});
  }, []);

  const loadRecords = useCallback(async () => {
    if (!empId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get("/hr/attendance", { params: { employee_id: empId, month } });
      const data = Array.isArray(res.data?.results ?? res.data) ? (res.data?.results ?? res.data) : [];
      setRecords(data.map((r) => {
        const checkIn = r.check_in || r.clock_in;
        return { ...r, date: r.date || r.record_date, check_in: checkIn, check_out: r.check_out || r.clock_out, status: r.status || (checkIn ? "present" : r.status) };
      }));
    } catch { setRecords([]); }
    finally { setLoading(false); }
  }, [empId, month]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const doCheckIn = async () => {
    if (!empId) return;
    setCheckingIn(true);
    try {
      let lat, lng;
      if (navigator.geolocation) try {
        const pos = await new Promise((res, rej) => navigator.geolocation?.getCurrentPosition(res, rej, { timeout: 3000 }));
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch { /* no geo */ }
      await axiosInstance.post(
        "/hr/attendance/checkin",
        { employee_id: Number(empId), lat, lng },
        { skipGlobalError: true },
      );
      showToast("Checked in successfully");
      loadRecords();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Check-in failed";
      showToast(message, "error");
    } finally { setCheckingIn(false); }
  };

  const doCheckOut = async () => {
    if (!empId) return;
    setCheckingOut(true);
    try {
      await axiosInstance.post("/hr/attendance/checkout", { employee_id: Number(empId) });
      showToast("Checked out successfully");
      loadRecords();
    } catch (err) {
      showToast(err?.response?.data?.detail || "Check-out failed", "error");
    } finally { setCheckingOut(false); }
  };

  const navMonth = (d) => {
    const [y, m] = month.split("-").map(Number);
    const nd = new Date(y, m - 1 + d, 1);
    setMonth(nd.toISOString().slice(0, 7));
  };

  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startPad = (firstDay.getDay() + 6) % 7;
  const prevLast = new Date(y, m - 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startPad; i++)
    cells.push({ day: prevLast - startPad + i + 1, month: m === 1 ? 11 : m - 2, year: m === 1 ? y - 1 : y, faded: true });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, month: m - 1, year: y, faded: false });
  const rem = cells.length % 7;
  if (rem) for (let i = 1; i <= 7 - rem; i++)
    cells.push({ day: i, month: m === 12 ? 0 : m, year: m === 12 ? y + 1 : y, faded: true });

  const byDate = {};
  records.forEach((r) => { if (r.date) byDate[r.date] = r; });

  let present = 0, absent = 0, onLeave = 0, workDays = 0, totalMins = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dow = new Date(y, m - 1, d).getDay();
    if (dow !== 0 && dow !== 6) workDays++;
    const rec = byDate[ds];
    if (rec) {
      const st = (rec.status || "").toLowerCase();
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "leave") onLeave++;
      totalMins += diffMins(rec.check_in, rec.check_out);
    }
  }

  const todayStr = today.toISOString().slice(0, 10);
  const todayRec = byDate[todayStr];

  return (
    <div className="attendance-page min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">

        {toast && createPortal(
          <div className={`fixed bottom-5 right-5 z-[999] rounded-xl px-5 py-3 text-[13px] font-semibold text-white shadow-xl transition-all ${toast.type === "error" ? "bg-[#dc2626]" : "bg-[#15803d]"}`}>
            {toast.msg}
          </div>,
          document.body
        )}

        {/* Page Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">Employee Attendance</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Track and manage daily attendance records.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navMonth(-1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e2e2e8] bg-white text-[#6b6b76] hover:bg-[#f5f5f7] transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[110px] text-center text-[14px] font-semibold text-[var(--color-text)]">{MONTHS[m - 1]} {y}</span>
            <button onClick={() => navMonth(1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e2e2e8] bg-white text-[#6b6b76] hover:bg-[#f5f5f7] transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Present",       value: present,           color: "#15803d", bg: "#dcfce7" },
            { label: "Absent",        value: absent,            color: "#dc2626", bg: "#fee2e2" },
            { label: "On Leave",      value: onLeave,           color: "#854d0e", bg: "#fef9c3" },
            { label: "Working Days",  value: workDays,          color: "#1d4ed8", bg: "#dbeafe" },
            { label: "Working Hours", value: fmtHrs(totalMins), color: "#0e7490", bg: "#cffafe" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b76]">{k.label}</p>
              <p className="mt-1.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#e4e4ea] bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-end gap-3 border-b border-[#f0f0f4] px-5 py-4">
            {/* Employee selector */}
            <div className="min-w-[220px]">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#6b6b76]">Employee</label>
              <select
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#e2e2e8] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name || e.name || `Employee ${e.id}`}</option>
                ))}
              </select>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-[#e2e2e8] bg-[#f5f5f7] p-1">
              <button
                onClick={() => setView("calendar")}
                className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition-all ${view === "calendar" ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-[#6b6b76] hover:text-[#1a1a1f]"}`}
              >
                <Calendar className="h-3.5 w-3.5" /> Calendar
              </button>
              <button
                onClick={() => setView("list")}
                className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition-all ${view === "list" ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-[#6b6b76] hover:text-[#1a1a1f]"}`}
              >
                <List className="h-3.5 w-3.5" /> List
              </button>
            </div>

            {/* Check-in / Check-out */}
            <div className="ml-auto flex items-center gap-2">
              {todayRec?.check_in && !todayRec?.check_out ? (
                <button
                  onClick={doCheckOut}
                  disabled={checkingOut}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#dc2626] px-4 text-[13px] font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-60 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> {checkingOut ? "Checking out…" : "Check Out"}
                </button>
              ) : (
                <button
                  onClick={doCheckIn}
                  disabled={checkingIn || Boolean(todayRec?.check_in)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#15803d] px-4 text-[13px] font-semibold text-white hover:bg-[#166534] disabled:opacity-60 transition-colors"
                >
                  <LogIn className="h-4 w-4" /> {checkingIn ? "Checking in…" : todayRec?.check_in ? "Checked In ✓" : "Check In"}
                </button>
              )}
            </div>
          </div>

          {/* Today's status bar */}
          {todayRec && (
            <div className="flex flex-wrap items-center gap-5 border-b border-[#f0f0f4] bg-[#f9fafb] px-5 py-3">
              <span className="text-[12px] font-bold uppercase tracking-wide text-[#6b6b76]">Today</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#9a9aa5]">In</span>
                <span className="text-[13px] font-semibold text-[#1a1a1f]">{fmtTime(todayRec.check_in)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#9a9aa5]">Out</span>
                <span className="text-[13px] font-semibold text-[#1a1a1f]">{fmtTime(todayRec.check_out)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#9a9aa5]">Hours</span>
                <span className="text-[13px] font-semibold tabular-nums text-[#0e7490]">{fmtHrs(diffMins(todayRec.check_in, todayRec.check_out))}</span>
              </div>
              {todayRec.status && (
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                  style={{ background: STATUS_COLORS[todayRec.status?.toLowerCase()]?.bg || "#f3f4f6", color: STATUS_COLORS[todayRec.status?.toLowerCase()]?.text || "#6b7280" }}>
                  {todayRec.status}
                </span>
              )}
            </div>
          )}

          <div className="p-5">
            {/* Calendar View */}
            {view === "calendar" && (
              <div className="attendance-calendar">
                <div className="attendance-calendar-weekdays">
                  {DAY_LABELS.map((d) => (
                    <div key={d} className="attendance-calendar-weekday">{d}</div>
                  ))}
                </div>
                <div className="attendance-calendar-grid">
                  {cells.map((cell, i) => {
                    const ds = `${cell.year}-${String(cell.month + 1).padStart(2,"0")}-${String(cell.day).padStart(2,"0")}`;
                    const rec = !cell.faded ? byDate[ds] : null;
                    const dow = new Date(cell.year, cell.month, cell.day).getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    const isToday = ds === todayStr;
                    const sc = rec ? STATUS_COLORS[(rec.status || "").toLowerCase()] : null;
                    const mins = rec ? diffMins(rec.check_in, rec.check_out) : 0;
                    return (
                      <div
                        key={i}
                        className={`attendance-calendar-cell ${cell.faded ? "is-faded" : isWeekend ? "is-weekend" : ""}`}
                      >
                        <div className={`attendance-calendar-day ${isToday ? "is-today" : ""}`}>
                          {cell.day}
                        </div>
                        {isWeekend && !cell.faded && (
                          <div className="attendance-calendar-weekend">Weekend</div>
                        )}
                        {rec && sc && (
                          <div className="attendance-calendar-record">
                            <div className="attendance-calendar-status" style={{ background: sc.bg, color: sc.text }}>
                              {rec.status}
                            </div>
                            <div className="attendance-calendar-time">In: {fmtTime(rec.check_in)}</div>
                            <div className="attendance-calendar-time">Out: {fmtTime(rec.check_out)}</div>
                            {mins > 0 && <div className="attendance-calendar-hours">{fmtHrs(mins)}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List View */}
            {view === "list" && (
              <div className="overflow-hidden rounded-xl border border-[#ececf0]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                        {["SR No.", "Date", "Check In", "Check Out", "Hours", "Status"].map((h) => (
                          <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">Loading…</td></tr>
                      ) : records.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No attendance records for this month</td></tr>
                      ) : records.map((r, i) => {
                        const sc = STATUS_COLORS[(r.status || "").toLowerCase()] || { bg: "#f3f4f6", text: "#6b7280" };
                        const mins = diffMins(r.check_in, r.check_out);
                        return (
                          <tr key={r.id || i} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                            <td className="px-4 py-3.5 text-[#9a9aa5]">{i + 1}</td>
                            <td className="px-4 py-3.5 font-semibold text-[#1a1a1f]">{r.date}</td>
                            <td className="px-4 py-3.5 text-[#4a4a55]">{fmtTime(r.check_in)}</td>
                            <td className="px-4 py-3.5 text-[#4a4a55]">{fmtTime(r.check_out)}</td>
                            <td className="px-4 py-3.5 font-semibold tabular-nums text-[#0e7490]">{mins > 0 ? fmtHrs(mins) : "—"}</td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize" style={{ background: sc.bg, color: sc.text }}>
                                {r.status || "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
=======
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Download,
  Eye,
  Filter,
  MoreVertical,
  Pencil,
  Plane,
  RefreshCw,
  Settings,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import Loader from "../../components/common/Loader";
import { SerialNumberCell, SerialNumberHeader } from "../../components/common/SerialNumberCell";
import usePageRefresh from "../../hooks/usePageRefresh";
import { useToast } from "../../context/ToastContext";
import {
  getAttendanceEnriched,
  getAttendanceSummary,
  getEmployeeSummary,
} from "../../api/hrApi";
import {
  ATTENDANCE_STATUS_COLORS,
  EMPTY_ATTENDANCE_DASHBOARD,
  attendanceStatusBadgeClass,
  attendanceStatusLabel,
  mergeAttendanceDashboard,
} from "../../data/hrMasterData";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[Number(m) - 1]} ${y}`;
}

function AttKpiCard({ label, value, icon: Icon, tone, trend }) {
  const tones = {
    purple: "bg-[#ede9fe] text-[#7c3aed]",
    green: "bg-[#dcfce7] text-[#16a34a]",
    orange: "bg-[#ffedd5] text-[#ea580c]",
    blue: "bg-[#dbeafe] text-[#2563eb]",
    red: "bg-[#fee2e2] text-[#ef4444]",
  };
  let trendClass = "text-slate-500";
  let trendText = trend?.text || "";
  if (trend?.pct != null) {
    const up = trend.dir === "up";
    trendClass = trend.positive === false ? (up ? "text-orange-600" : "text-red-600") : up ? "text-emerald-600" : "text-red-600";
    trendText = `${up ? "↑" : "↓"} ${trend.pct}% vs yesterday`;
  }
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-[26px] font-bold leading-none text-slate-900">{value}</p>
          {trendText ? <p className={`mt-1.5 text-[11px] font-medium ${trendClass}`}>{trendText}</p> : null}
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden />
>>>>>>> 2d0140ee5d6b7bf219d6621ff732a45bcb0870d0
        </div>
      </div>
    </div>
  );
}
<<<<<<< HEAD
=======

function Avatar({ label }) {
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-200 text-[10px] font-bold text-indigo-700">
      {label}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${attendanceStatusBadgeClass(status)}`}>
      {attendanceStatusLabel(status)}
    </span>
  );
}

function Panel({ title, action, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function AttendanceCalendar({ year, month, selectedIso, marks, onSelectDay }) {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const markColor = (key) => ATTENDANCE_STATUS_COLORS[key]?.fill || "#94a3b8";

  return (
    <div>
      <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="h-9" />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = iso === selectedIso;
          const mark = marks[iso];
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay?.(iso)}
              className={`relative grid h-9 place-items-center rounded-lg text-[12px] font-medium transition-colors ${
                isSelected ? "bg-[#6366f1] text-white" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {day}
              {mark && !isSelected ? (
                <span
                  className="absolute bottom-1 h-1.5 w-1.5 rounded-full"
                  style={{ background: markColor(mark) }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-500">
        {["present", "late", "absent", "on_leave", "holiday"].map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: ATTENDANCE_STATUS_COLORS[key].fill }} />
            {ATTENDANCE_STATUS_COLORS[key].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function pageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = [1];
  if (current > 3) items.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p += 1) items.push(p);
  if (current < total - 2) items.push("…");
  if (total > 1) items.push(total);
  return items;
}

export default function Attendance() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(EMPTY_ATTENDANCE_DASHBOARD);
  const [recordDate, setRecordDate] = useState(todayIso());
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [location, setLocation] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(7);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [sumRes, listRes, empRes] = await Promise.allSettled([
        getAttendanceSummary({ record_date: recordDate }),
        getAttendanceEnriched({ record_date: recordDate }),
        getEmployeeSummary(),
      ]);
      const summary = sumRes.status === "fulfilled" ? sumRes.value?.data || {} : {};
      const rows = listRes.status === "fulfilled" ? listRes.value?.data || [] : [];
      const employeeCount = empRes.status === "fulfilled" ? empRes.value?.data?.total_employees : 0;
      setData(mergeAttendanceDashboard({ summary, rows, employeeCount }));
    } catch (err) {
      if (isRefresh) throw err;
      setData(EMPTY_ATTENDANCE_DASHBOARD);
    } finally {
      setLoading(false);
    }
  }, [addToast, recordDate]);

  usePageRefresh(() => load(true));
  useEffect(() => {
    load();
  }, [load]);

  const departments = useMemo(
    () => [...new Set(data.records.map((r) => r.department).filter(Boolean))],
    [data.records]
  );

  const filteredRecords = useMemo(() => {
    return data.records.filter((r) => {
      if (department && r.department !== department) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (designation && !String(r.name).toLowerCase().includes(designation.toLowerCase())) return false;
      if (location && !String(r.department).toLowerCase().includes(location.toLowerCase())) return false;
      return true;
    });
  }, [data.records, department, designation, location, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [department, designation, location, statusFilter, recordDate, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pageRows = filteredRecords.slice((page - 1) * pageSize, page * pageSize);
  const from = filteredRecords.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, filteredRecords.length);

  const donutData = data.summary_slices.map((s) => ({
    name: ATTENDANCE_STATUS_COLORS[s.key]?.label || s.key,
    value: s.count,
    color: ATTENDANCE_STATUS_COLORS[s.key]?.fill || "#94a3b8",
    pct: s.pct,
  }));

  const trends = data.kpi_trends || {};

  const goPrevMonth = () => {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  if (loading) return <Loader label="Loading attendance..." />;

  return (
    <div className="min-w-0 space-y-5 pb-5">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1e3a5f]">Attendance</h1>
          <p className="mt-1 text-[13px] text-slate-500">Track and manage employee attendance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#4f46e5]"
            onClick={() => addToast("Upload attendance coming soon", "info")}
          >
            <Upload className="h-4 w-4" />
            Upload Attendance
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => addToast("Report download started", "success")}
          >
            <Download className="h-4 w-4" />
            Attendance Report
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-600 hover:bg-slate-50"
            aria-label="More actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AttKpiCard label="Total Employees" value={data.total_employees} icon={Users} tone="purple" trend={trends.employees} />
        <AttKpiCard label="Present Today" value={data.present_today} icon={CircleCheck} tone="green" trend={trends.present} />
        <AttKpiCard label="On Leave" value={String(data.on_leave).padStart(2, "0")} icon={Plane} tone="orange" trend={trends.leave} />
        <AttKpiCard label="Late Today" value={data.late_today} icon={Clock} tone="blue" trend={trends.late} />
        <AttKpiCard label="Absent Today" value={data.absent_today} icon={XCircle} tone="red" trend={trends.absent} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            className="border-none bg-transparent text-[13px] outline-none"
          />
        </label>
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-600 outline-none">
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={designation} onChange={(e) => setDesignation(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-600 outline-none">
          <option value="">All Designations</option>
          <option value="manager">Manager</option>
          <option value="engineer">Engineer</option>
          <option value="executive">Executive</option>
        </select>
        <select value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-600 outline-none">
          <option value="">All Locations</option>
          <option value="engineering">Engineering</option>
          <option value="hr">HR</option>
          <option value="sales">Sales</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-600 outline-none">
          <option value="">All Status</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="on_leave">On Leave</option>
        </select>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
          <Filter className="h-4 w-4" />
          Filter
        </button>
        <button
          type="button"
          onClick={() => load(true)}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Middle widgets */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Attendance Summary">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[20px] font-bold text-slate-900">{data.total_employees}</span>
                <span className="text-[11px] text-slate-500">Total</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2 text-[12px]">
              {donutData.map((d) => (
                <li key={d.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {d.value} ({d.pct}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="font-medium text-slate-600">Attendance %</span>
              <span className="font-bold text-emerald-600">{data.attendance_pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${data.attendance_pct}%` }} />
            </div>
          </div>
        </Panel>

        <Panel
          title="Attendance Calendar"
          action={
            <div className="flex items-center gap-1">
              <button type="button" onClick={goPrevMonth} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[88px] text-center text-[13px] font-semibold text-slate-700">
                {MONTHS[calMonth]} {calYear}
              </span>
              <button type="button" onClick={goNextMonth} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); setRecordDate(todayIso()); }} className="ml-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-[#6366f1] hover:bg-indigo-50">
                Today
              </button>
            </div>
          }
        >
          <AttendanceCalendar
            year={calYear}
            month={calMonth}
            selectedIso={recordDate}
            marks={data.calendar_marks || {}}
            onSelectDay={setRecordDate}
          />
        </Panel>

        <Panel title="Today's Status Overview" action={<Link to="/hr/attendance" className="text-[13px] font-semibold text-[#6366f1]">View All</Link>}>
          <ul className="space-y-3">
            {data.today_overview.map((row) => (
              <li key={row.id} className="flex items-center gap-3">
                <Avatar label={row.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-800">{row.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{row.department}</p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge status={row.status} />
                  <p className="mt-1 text-[11px] text-slate-500">{row.check_in || "—"}</p>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="mt-4 w-full rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
            View All Attendance
          </button>
        </Panel>
      </div>

      {/* Records table */}
      <Panel
        title="Attendance Records"
        action={
          <div className="flex items-center gap-2">
            <Link to="/hr/attendance" className="text-[13px] font-semibold text-[#6366f1]">View All</Link>
            <button type="button" className="text-slate-400 hover:text-slate-600" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full w-full border-collapse text-left text-[13px]">
            <thead className="bg-[#eef6ff] text-[12px] font-semibold text-slate-700">
              <tr>
                <SerialNumberHeader className="border-b border-slate-200 px-3 py-3" />
                <th className="border-b border-slate-200 px-3 py-3">Employee ID</th>
                <th className="border-b border-slate-200 px-3 py-3 min-w-[160px]">Employee Name</th>
                <th className="border-b border-slate-200 px-3 py-3">Department</th>
                <th className="border-b border-slate-200 px-3 py-3">Check In</th>
                <th className="border-b border-slate-200 px-3 py-3">Check Out</th>
                <th className="border-b border-slate-200 px-3 py-3">Working Hours</th>
                <th className="border-b border-slate-200 px-3 py-3">Status</th>
                <th className="border-b border-slate-200 px-3 py-3">Remarks</th>
                <th className="border-b border-slate-200 px-3 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    No attendance records for {formatDisplayDate(recordDate)}.
                  </td>
                </tr>
              ) : (
                pageRows.map((row, rowIndex) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <SerialNumberCell rowIndex={rowIndex} page={page} pageSize={pageSize} className="border-b border-slate-100 px-3 py-3" />
                    <td className="border-b border-slate-100 px-3 py-3 font-medium text-slate-700">{row.employee_id}</td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar label={row.avatar} />
                        <span className="font-semibold text-slate-800">{row.name}</span>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-600">{row.department}</td>
                    <td className="border-b border-slate-100 px-3 py-3 tabular-nums text-slate-600">{row.check_in || "—"}</td>
                    <td className="border-b border-slate-100 px-3 py-3 tabular-nums text-slate-600">{row.check_out || "—"}</td>
                    <td className="border-b border-slate-100 px-3 py-3 tabular-nums text-slate-600">{row.working_hours}</td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-500">{row.remarks}</td>
                    <td className="relative border-b border-slate-100 px-3 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-[#6366f1] hover:bg-indigo-50" aria-label="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-[#2563eb] hover:bg-blue-50" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-[#6366f1] hover:bg-slate-50"
                          aria-label="More"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-slate-500">
          <span>
            Showing {from} to {to} of {filteredRecords.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageItems(page, totalPages).map((item) =>
              item === "…" ? (
                <span key={`e-${item}`} className="px-1 text-xs">…</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`grid h-8 min-w-8 place-items-center rounded-md border px-2 text-[13px] font-semibold ${
                    item === page ? "border-[#6366f1] bg-[#6366f1] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              )
            )}
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[13px] outline-none"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>
      </Panel>
    </div>
  );
}
>>>>>>> 2d0140ee5d6b7bf219d6621ff732a45bcb0870d0

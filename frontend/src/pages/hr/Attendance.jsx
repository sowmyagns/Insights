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
        </div>
      </div>
    </div>
  );
}

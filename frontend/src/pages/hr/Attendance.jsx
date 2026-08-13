import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { Calendar, Clock, Filter, Moon, Timer, UserCheck, UserMinus, UserX } from "lucide-react";
import KpiCard from "../../components/common/KpiCard";
import PageHeader from "../../components/common/PageHeader";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { clockIn, clockOut, getAttendanceEnriched, getAttendanceSummary, getEmployeesEnriched, getShifts } from "../../api/hrApi";
import { sourceLabel, statusColor } from "../../data/hrMasterData";


function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [recordDate, setRecordDate] = useState(todayStr());
  const [clockEmployee, setClockEmployee] = useState("");
  const [action, setAction] = useState("in");
  const [view, setView] = useState("table");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes, empRes, shiftRes] = await Promise.allSettled([
        getAttendanceSummary({ record_date: recordDate }),
        getAttendanceEnriched({ record_date: recordDate }),
        getEmployeesEnriched(),
        getShifts(),
      ]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data) setSummary(sumRes.value.data || {});
      else setSummary({});
      if (listRes.status === "fulfilled" && listRes.value?.data) {
        setRows([...listRes.value.data]);
      } else {
        setRows([]);
      }
      if (empRes.status === "fulfilled") setEmployees([...(empRes.value?.data || [])]);
      else setEmployees([]);
      if (shiftRes.status === "fulfilled") setShifts([...(shiftRes.value?.data || [])]);
      else setShifts([]);
    } catch {
      setSummary({});
      setRows([]);
      setEmployees([]);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [recordDate]);

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    await load();
  };

  usePageRefresh(handleRefresh);

  useEffect(() => { load(); }, [load]);

  const shiftGrouped = useMemo(() => {
    const map = {};

    // 1. Initialize map for all configured shifts
    shifts.forEach((s) => {
      if (s.name) {
        map[s.name] = { present: 0, absent: 0, total: 0 };
      }
    });

    // 2. Map employees to shifts
    employees.forEach((emp) => {
      const shiftName = emp.shift || emp.shift_name || "General";
      if (!map[shiftName]) {
        map[shiftName] = { present: 0, absent: 0, total: 0 };
      }
      map[shiftName].total += 1;
    });

    // 3. Collect active check-ins for recordDate
    const presentEmpIds = new Set();
    const presentEmpNames = new Set();
    rows.forEach((r) => {
      if (r.status !== "absent" && (r.check_in || r.status === "present")) {
        if (r.employee_id) presentEmpIds.add(r.employee_id);
        if (r.employee_name) presentEmpNames.add(r.employee_name);
      }
    });

    // 4. Calculate present and absent per shift dynamically
    employees.forEach((emp) => {
      const shiftName = emp.shift || emp.shift_name || "General";
      const isPresent = presentEmpIds.has(emp.id) || presentEmpNames.has(emp.full_name);
      if (isPresent) {
        map[shiftName].present += 1;
      } else {
        map[shiftName].absent += 1;
      }
    });

    return Object.entries(map).map(([shiftName, counts]) => ({
      label: `Shift: ${shiftName}`,
      present: counts.present,
      absent: counts.absent,
      total: counts.total,
    }));
  }, [employees, rows, shifts]);

  const shiftCardValues = useMemo(() => {
    const matchesShift = (value, names) => names.includes(String(value || "").trim().toLowerCase());
    const presentFor = (names) => rows.filter((row) =>
      matchesShift(row.shift || row.shift_name, names) &&
      row.status !== "absent" && (row.check_in || row.status === "present")
    ).length;
    const totalFor = (names) => employees.filter((employee) =>
      matchesShift(employee.shift || employee.shift_name, names)
    ).length;
    const valueFor = (apiValue, names) => apiValue != null ? apiValue : (presentFor(names) || totalFor(names));

    return {
      day: valueFor(summary.day_shift ?? summary.dayshift, ["day", "day shift", "morning", "morning shift"]),
      afternoon: valueFor(summary.afternoon_shift ?? summary.afternoonshift, ["afternoon", "afternoon shift", "evening", "evening shift"]),
    };
  }, [employees, rows, summary]);

  const handleClock = async (e) => {
    e.preventDefault();
    if (!clockEmployee) return;
    try {
      if (action === "in") await clockIn(null, Number(clockEmployee), recordDate);
      else await clockOut(null, Number(clockEmployee), recordDate);
      addToast(action === "in" ? "Clocked in" : "Clocked out");
      load();
      setClockEmployee("");
    } catch (err) {
      addToast(err.response?.data?.detail || "Clock action failed", "error");
    }
  };

  const columns = [
    { key: "employee_name", label: "Employee" },
    { key: "shift", label: "Shift", render: (r) => typeof r.shift === "object" ? (r.shift?.label || r.shift?.id || "—") : (r.shift || "—") },
    { key: "check_in", label: "Check In" },
    { key: "check_out", label: "Check Out" },
    { key: "break_minutes", label: "Break", render: (r) => `${r.break_minutes || 0}m` },
    { key: "working_hours", label: "Working Hrs", render: (r) => r.working_hours != null ? `${r.working_hours}h` : "—" },
    { key: "overtime", label: "OT", render: (r) => r.overtime != null ? `${r.overtime}h` : "—" },
    { key: "status", label: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColor(r.status)}`}>{r.status}</span> },
    { key: "source", label: "Source", render: (r) => sourceLabel(r.source) },
  ];

  if (loading && rows.length === 0) return <Loader label="Loading attendance..." />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader subtitle="Biometric, RFID, GPS, QR integration with shift-wise tracking." />

      <div className="ui-grid-kpi">
        <KpiCard label="Present" value={summary.present} icon={UserCheck} color="bg-green-600" />
        <KpiCard label="Absent" value={summary.absent} icon={UserMinus} color="bg-red-500" />
        <KpiCard label="Late" value={summary.late} icon={Clock} color="bg-amber-500" />
        <KpiCard label="Half Day" value={summary.half_day} icon={UserX} color="bg-orange-500" />
        <KpiCard label="Overtime (h)" value={summary.overtime} icon={Clock} color="bg-indigo-600" />
        <KpiCard label="Day Shift" value={shiftCardValues.day} icon={Clock} color="bg-[var(--color-primary)]" />
        <KpiCard label="Afternoon Shift" value={shiftCardValues.afternoon} icon={Clock} color="bg-orange-600" />
        <KpiCard label="Night Shift" value={summary.night_shift} icon={Moon} color="bg-purple-600" />
        <KpiCard label="Total Hours" value={summary.total_working_hours} icon={Timer} color="bg-teal-600" suffix="h" />
      </div>

      <div className="ui-card p-4">
          <h3 className="ui-section-title mb-3">Clock In / Out</h3>
        <form onSubmit={handleClock} className="flex flex-wrap items-end gap-3">
          <select value={clockEmployee} onChange={(e) => setClockEmployee(e.target.value)} required className="ui-select">
            <option value="">Select Employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name} ({e.employee_code || e.employee_id || `EMP-${e.id}`})
              </option>
            ))}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="ui-input">
            <option value="in">Clock In</option>
            <option value="out">Clock Out</option>
          </select>
          <button type="submit" className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${action === "in" ? "bg-green-600" : "bg-red-600"}`}>
            {action === "in" ? "Clock In" : "Clock Out"}
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className="ui-input" />
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
          <button type="button" onClick={() => setView("table")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === "table" ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-slate-500"}`}>Table</button>
          <button type="button" onClick={() => setView("calendar")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === "calendar" ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-slate-500"}`}><Calendar className="inline h-3.5 w-3.5" /> Summary</button>
        </div>
      </div>

      {view === "table" ? (
        <div className="ui-card p-4">
          <DataTable columns={columns} data={rows} searchPlaceholder="Search employee..." searchKeys={["employee_name", "shift", "status"]} />
        </div>
      ) : shiftGrouped.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shiftGrouped.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-800">{s.label}</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{s.present}</p>
              <p className="text-xs text-slate-500">Present · {s.absent} absent</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No attendance records found for this date.
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <span className="font-semibold">Integration:</span>
        {["Biometric", "RFID", "Face Recognition", "QR Attendance", "GPS Attendance"].map((s) => (
          <span key={s} className="rounded-lg bg-white px-2 py-1 shadow-sm">{s}</span>
        ))}
      </div>
    </div>
  );
}

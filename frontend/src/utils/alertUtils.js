export const SEVERITY_OPTIONS = [
  { value: "", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved", label: "Resolved" },
];

export const MODULE_OPTIONS = [
  { value: "", label: "All modules" },
  { value: "hr", label: "Human Resources (HR) & Personnel" },
  { value: "safety", label: "Safety & Incident" },
  { value: "low_stock", label: "Inventory / Stock" },
  { value: "machine_failure", label: "Machine / Equipment" },
  { value: "production_delay", label: "Production Delay" },
  { value: "maintenance", label: "Maintenance" },
  { value: "quality", label: "Quality" },
  { value: "general", label: "General" },
];

export const SEVERITY_STYLES = {
  critical: "bg-red-100 text-red-800 ring-red-200",
  high: "bg-orange-100 text-orange-800 ring-orange-200",
  medium: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  low: "bg-blue-100 text-blue-800 ring-blue-200",
};

export const STATUS_STYLES = {
  active: "bg-red-50 text-red-700",
  acknowledged: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-800",
};

export function moduleLabel(alertType) {
  return MODULE_OPTIONS.find((o) => o.value === alertType)?.label || alertType || "—";
}

export function formatAlertDate(value) {
  if (!value) return "—";
  try {
    const raw = String(value).trim();
    if (raw.includes("AM") || raw.includes("PM")) return raw;

    let d;
    if (raw.endsWith("Z") || raw.includes("+") || (raw.includes("-") && raw.lastIndexOf("-") > 10)) {
      d = new Date(raw);
    } else if (raw.includes("T")) {
      const [datePart, timePart] = raw.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute] = (timePart || "00:00").split(":").map(Number);
      d = new Date(Date.UTC(year, month - 1, day, hour, minute));
    } else if (raw.includes(" ")) {
      const [datePart, timePart] = raw.split(" ");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute] = (timePart || "00:00").split(":").map(Number);
      d = new Date(Date.UTC(year, month - 1, day, hour, minute));
    } else {
      d = new Date(raw);
    }

    if (!d || isNaN(d.getTime())) return String(value);

    return d.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

export const DEMO_ALERTS = [
  {
    id: 1001,
    title: "Low Raw Material Stock: Aluminum Ingot 6061",
    message: "Current inventory level (320 kg) is below reorder threshold (500 kg). Purchase request PR-9012 created automatically.",
    alert_type: "low_stock",
    severity: "critical",
    status: "active",
    assigned_to: "Ramesh Sharma (Store Mgr)",
    created_by: "Inventory Service",
    triggered_at: "2026-07-26T09:30:00Z",
    created_at: "2026-07-26T09:30:00Z",
    acknowledged_by: "—",
    acknowledged_at: null,
    link: "/inventory/raw-materials",
  },
  {
    id: 1002,
    title: "Machine Failure: CNC Lathe Unit #02 Spindle Alarm",
    message: "Spindle bearing over-temperature alarm (88°C). Machine feed automatically paused by IoT sensor.",
    alert_type: "machine_failure",
    severity: "high",
    status: "active",
    assigned_to: "Amit Patel (Maintenance Engg)",
    created_by: "IoT Sensor Gateway",
    triggered_at: "2026-07-26T10:15:00Z",
    created_at: "2026-07-26T10:15:00Z",
    acknowledged_by: "—",
    acknowledged_at: null,
    link: "/production/machines",
  },
  {
    id: 1003,
    title: "Production Delay: WO-2026-108 45min Behind Schedule",
    message: "Batch BAT-WO-108 for Mahindra & Mahindra is running 45 minutes behind due to die adjustment delay.",
    alert_type: "production_delay",
    severity: "medium",
    status: "active",
    assigned_to: "Vikram Singh (Prod Lead)",
    created_by: "Production Scheduler",
    triggered_at: "2026-07-26T11:00:00Z",
    created_at: "2026-07-26T11:00:00Z",
    acknowledged_by: "Swati (Prod Manager)",
    acknowledged_at: "2026-07-26T11:10:00Z",
    link: "/production/work-orders",
  },
  {
    id: 1004,
    title: "Maintenance Reminder: Preventive Service Overdue",
    message: "Preventive maintenance PM-150T for Hydraulic Stamping Press #01 is overdue by 2 days.",
    alert_type: "maintenance",
    severity: "high",
    status: "active",
    assigned_to: "Suresh Kumar (Maint Supervisor)",
    created_by: "Maintenance System",
    triggered_at: "2026-07-25T08:00:00Z",
    created_at: "2026-07-25T08:00:00Z",
    acknowledged_by: "Suresh Kumar",
    acknowledged_at: "2026-07-25T09:20:00Z",
    link: "/maintenance/preventive",
  },
  {
    id: 1005,
    title: "Quality Defect: Weld Porosity Non-Conformance NCR-018",
    message: "Ultrasonic NDT inspection failed on Robotic Welding Cell #03. 15 frames quarantined.",
    alert_type: "quality",
    severity: "critical",
    status: "acknowledged",
    assigned_to: "Manoj Kumar (Quality Tech)",
    created_by: "Quality Inspector",
    triggered_at: "2026-07-25T14:20:00Z",
    created_at: "2026-07-25T14:20:00Z",
    acknowledged_by: "Manoj Kumar",
    acknowledged_at: "2026-07-25T15:00:00Z",
    link: "/quality/defects",
  },
  {
    id: 1006,
    title: "HR Shift Shortage: Shift B Operator Count Low",
    message: "3 operators reported absent for Shift B Press Shop operations. Substitute operator allocation required.",
    alert_type: "hr",
    severity: "medium",
    status: "resolved",
    assigned_to: "Pooja Sharma (HR Executive)",
    created_by: "Attendance System",
    triggered_at: "2026-07-24T13:00:00Z",
    created_at: "2026-07-24T13:00:00Z",
    acknowledged_by: "Pooja Sharma",
    acknowledged_at: "2026-07-24T13:30:00Z",
    link: "/hr/attendance",
  },
  {
    id: 1007,
    title: "Safety Incident: E-Stop Tripped on Robotic Cell #03",
    message: "Operator triggered emergency stop due to workpiece misalignment. Area cleared and safety reset performed.",
    alert_type: "safety",
    severity: "high",
    status: "resolved",
    assigned_to: "Safety Officer",
    created_by: "Safety Interlock Gateway",
    triggered_at: "2026-07-24T16:45:00Z",
    created_at: "2026-07-24T16:45:00Z",
    acknowledged_by: "Safety Officer",
    acknowledged_at: "2026-07-24T17:00:00Z",
    link: "/hr/incidents",
  },
  {
    id: 1008,
    title: "General: Monthly Production Audit & System Calibration",
    message: "Scheduled monthly ISO quality audit and sensor calibration planned for coming Saturday.",
    alert_type: "general",
    severity: "low",
    status: "active",
    assigned_to: "All Plant Managers",
    created_by: "System Admin",
    triggered_at: "2026-07-24T09:00:00Z",
    created_at: "2026-07-24T09:00:00Z",
    acknowledged_by: "—",
    acknowledged_at: null,
    link: "/admin/audit-logs",
  },
];

export function computeAlertSummary(alerts = []) {
  const summary = {
    total: alerts.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolved: 0,
  };
  alerts.forEach((a) => {
    const sev = String(a.severity || "").toLowerCase();
    if (sev === "critical") summary.critical += 1;
    if (sev === "high") summary.high += 1;
    if (sev === "medium") summary.medium += 1;
    if (sev === "low") summary.low += 1;
    if (String(a.status || "").toLowerCase() === "resolved") summary.resolved += 1;
  });
  return summary;
}

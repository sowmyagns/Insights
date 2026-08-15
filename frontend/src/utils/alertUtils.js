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

export const DEMO_ALERTS = [];

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

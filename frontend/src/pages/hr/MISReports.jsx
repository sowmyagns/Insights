import { useState } from "react";
import { api } from "../api";

export default function MISReports({ apiMode }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);

  const exportReport = async (type) => {
    if (!apiMode) return;
    setLoading(true);
    try {
      if (type === "attendance") await api.reports.attendanceExcel(month);
      else if (type === "payroll") await api.reports.payrollExcel(month);
      else if (type === "employees") await api.reports.employeesExcel();
    } catch (e) {
      alert(e.message || "Export failed");
    }
    setLoading(false);
  };

  const reportTypes = [
    { key: "attendance", label: "Attendance Report", icon: "📅", desc: "Monthly attendance summary" },
    { key: "payroll", label: "Payroll Report", icon: "💰", desc: "Salary & deductions breakdown" },
    { key: "employees", label: "Employee List", icon: "👥", desc: "All employee master data" },
  ];

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>MIS Reports</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Export management information reports to Excel.</p>
      </div>

      <div className="ui-card" style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <label className="ui-label">Select Month</label>
            <select className="ui-select" style={{ width: 200, fontSize: 13 }} value={month} onChange={(e) => setMonth(e.target.value)}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                <option key={m} value={`${new Date().getFullYear()}-${String(m).padStart(2,"0")}`}>
                  {new Date(2000, m - 1).toLocaleString("default", { month: "long" })} {new Date().getFullYear()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {reportTypes.map(({ key, label, icon, desc }) => (
            <div key={key} className="ui-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 28 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>{label}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{desc}</div>
              </div>
              <button className="ui-btn-primary ui-btn--sm" style={{ alignSelf: "flex-start", marginTop: 4 }} onClick={() => exportReport(key)} disabled={loading || !apiMode}>
                {loading ? "Exporting..." : "📥 Export Excel"}
              </button>
            </div>
          ))}
        </div>

        {!apiMode && (
          <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "var(--color-warning-soft)", border: "1px solid var(--color-warning)", fontSize: 12, color: "#7a5a00" }}>
            ⚠️ Connect to API to export Excel reports.
          </div>
        )}
      </div>
    </div>
  );
}

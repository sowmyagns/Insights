import { useState, useEffect } from "react";
import { api } from "../api";
import { MONTHS } from "../data/mockData";
import { fmtMoney } from "../utils/format";
import Avatar from "../components/Avatar";
import { DEPT_COLORS } from "../data/mockData";

export default function Payroll({ employees, apiMode }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [apiRecords, setApiRecords] = useState([]);
  const [records, setRecords] = useState(() =>
    employees.filter((e) => e.status === "Active").map((e) => {
      const base = e.salary / 12;
      const bonus = 300 + Math.floor(Math.random() * 900);
      const ded = 200 + Math.floor(Math.random() * 300);
      return { id: e.id, employee: e, base: Math.round(base), bonus, ded, net: Math.round(base + bonus - ded), status: "Processed" };
    })
  );

  useEffect(() => {
    if (apiMode) api.payroll.list().then(setApiRecords).catch(() => setApiRecords([]));
  }, [apiMode]);

  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const apiRows = apiRecords.filter((r) => r.month === ym);

  const generate = async () => {
    if (apiMode && employees) {
      for (const emp of employees.filter((e) => e.status === "Active")) {
        await api.payroll.create({ employee_id: emp.id, month: ym, basic_salary: emp.salary || 0, allowances: 0, deductions: 0 });
      }
      setApiRecords(await api.payroll.list());
      return;
    }
    setRecords(employees.filter((e) => e.status === "Active").map((e) => {
      const base = e.salary / 12;
      const bonus = 300 + Math.floor(Math.random() * 900);
      const ded = 200 + Math.floor(Math.random() * 300);
      return { id: e.id, employee: e, base: Math.round(base), bonus, ded, net: Math.round(base + bonus - ded), status: "Processed" };
    }));
  };

  const displayRecords = apiMode
    ? apiRows.map((p) => {
        const emp = employees?.find((e) => e.id === p.employee_id);
        return { id: p.id, employee: emp || { name: `Emp ${p.employee_id}`, dept: "", role: "" }, base: p.basic_salary || 0, bonus: p.allowances || 0, ded: p.deductions || 0, net: p.net_salary || 0 };
      })
    : records;

  const totalBase = displayRecords.reduce((a, p) => a + p.base, 0);
  const totalBonus = displayRecords.reduce((a, p) => a + p.bonus, 0);
  const totalDed = displayRecords.reduce((a, p) => a + p.ded, 0);
  const totalNet = displayRecords.reduce((a, p) => a + p.net, 0);

  const deptPay = {};
  displayRecords.forEach((p) => { const d = p.employee?.dept || "Other"; deptPay[d] = (deptPay[d] || 0) + p.net; });
  const maxDp = Math.max(...Object.values(deptPay), 1);

  const kpiCards = [
    { label: "Base Salaries", value: fmtMoney(totalBase), color: "var(--color-primary)", bg: "var(--color-primary-soft)" },
    { label: "Bonuses", value: fmtMoney(totalBonus), color: "#15803d", bg: "#dcfce7" },
    { label: "Deductions", value: fmtMoney(totalDed), color: "var(--color-danger)", bg: "var(--color-danger-soft)" },
    { label: "Net Payroll", value: fmtMoney(totalNet), color: "var(--color-action-teal)", bg: "#e6f4f4" },
  ];

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Payroll</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Generate and manage employee payroll.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select className="ui-select" style={{ width: 120, minHeight: 36, fontSize: 13 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select className="ui-select" style={{ width: 90, minHeight: 36, fontSize: 13 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2023, 2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
          </select>
          <button className="ui-btn-primary ui-btn--sm" onClick={generate}>⚡ Generate Payroll</button>
          {apiMode && <button className="ui-btn-outline ui-btn--sm" onClick={() => api.reports.payrollExcel(ym)}>📥 Export</button>}
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{apiMode ? apiRows.length : records.length} employees</span>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {kpiCards.map(({ label, value, color, bg }) => (
          <div key={label} className="ui-kpi" style={{ background: bg, border: `1px solid ${color}22` }}>
            <div className="ui-kpi__top">
              <span className="ui-kpi__label" style={{ color }}>{label}</span>
            </div>
            <div className="ui-kpi__value" style={{ color }}>{value}</div>
            <div className="ui-kpi__meta">{MONTHS[month - 1]} {year}</div>
          </div>
        ))}
      </div>

      {/* Table + dept breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
        <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="ui-table-wrap" style={{ border: "none" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ background: "var(--color-surface-thead)" }}>
                  {["Employee","Dept","Base","Bonus","Deduct","Net"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRecords.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar name={p.employee.name} dept={p.employee.dept} size={28} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{p.employee.name.split(" ")[0]}</div>
                          <div style={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>{p.employee.role}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, color: DEPT_COLORS[p.employee.dept] || "var(--color-primary)", fontWeight: 600 }}>{(p.employee.dept || "").slice(0, 4)}</span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12 }}>{fmtMoney(p.base)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#15803d" }}>+{fmtMoney(p.bonus)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--color-danger)" }}>-{fmtMoney(p.ded)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 800, color: "var(--color-primary)" }}>{fmtMoney(p.net)}</td>
                  </tr>
                ))}
                {!displayRecords.length && <tr><td colSpan={6} className="ui-empty">No payroll records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ui-card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>By Department</div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginBottom: 14 }}>Net distribution</div>
          {Object.entries(deptPay).map(([dept, amt]) => (
            <div key={dept} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                <span style={{ color: DEPT_COLORS[dept] || "var(--color-primary)", fontWeight: 600 }}>{dept}</span>
                <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{fmtMoney(amt)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--color-border)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, width: `${(amt / maxDp) * 100}%`, background: DEPT_COLORS[dept] || "var(--color-primary)", transition: "width .4s ease" }} />
              </div>
            </div>
          ))}
          {!Object.keys(deptPay).length && <div style={{ fontSize: 12, color: "var(--color-text-faint)", textAlign: "center", padding: "20px 0" }}>No data</div>}
        </div>
      </div>
    </div>
  );
}

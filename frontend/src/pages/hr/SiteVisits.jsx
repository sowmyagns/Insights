import { useState, useEffect } from "react";
import { api } from "../api";
import Modal from "../components/Modal";

const VISIT_TYPES = ["Sales","Support","Demo","Site Survey","Client Meeting"];

export default function SiteVisits({ employees, apiMode }) {
  const [visits, setVisits] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showFilter, setShowFilter] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);
  const [empQuery, setEmpQuery] = useState("");
  const [empSelected, setEmpSelected] = useState("All Employees");
  const empOptions = ["All Employees", ...((employees || []).map((e) => e.name))];
  const filteredEmpOptions = empOptions.filter((o) => o.toLowerCase().includes(empQuery.toLowerCase()));

  const navMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(y, m - 1 + delta, 1).toISOString().slice(0, 7));
  };

  useEffect(() => {
    if (apiMode) api.siteVisits.list({ month }).then(setVisits).catch(() => setVisits([]));
  }, [apiMode, month]);

  const monthLabel = new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" });

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Site Visits</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Track and manage employee site visits.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(-1)}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", minWidth: 90, textAlign: "center" }}>{monthLabel}</span>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(1)}>›</button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => setEmpOpen((o) => !o)} type="button">
            {empSelected} <span style={{ marginLeft: 4 }}>⌄</span>
          </button>
          {empOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 20, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 200, marginTop: 4 }}>
              <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border-muted)" }}>
                <input className="ui-input" style={{ minHeight: 32, fontSize: 12 }} placeholder="Search Employee" value={empQuery} onChange={(e) => setEmpQuery(e.target.value)} />
              </div>
              {filteredEmpOptions.map((opt) => (
                <div key={opt} onClick={() => { setEmpSelected(opt); setEmpOpen(false); }} style={{ padding: "8px 14px", fontSize: 13, cursor: "pointer", background: opt === empSelected ? "var(--color-surface-muted)" : "transparent", color: "var(--color-text)" }}>{opt}</div>
              ))}
            </div>
          )}
        </div>
        <button className="ui-btn-outline ui-btn--sm" onClick={() => setShowFilter(true)}>⚙ Filter</button>
      </div>

      {/* Table */}
      <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ui-table-wrap" style={{ border: "none" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-thead)" }}>
                {["SR No.","Employee","Branch","Department","Type","Visitee","Company","Date","Check-In","Check-Out","Duration","Check-In Addr","Check-Out Addr","Action"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.length ? visits.map((v, i) => (
                <tr key={v.id} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{i + 1}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{v.employee || "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>—</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>—</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{v.visit_type || "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>—</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>—</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{v.date || "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>—</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>—</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>—</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>—</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>—</td>
                  <td style={{ padding: "10px 12px" }}>
                    <button className="ui-btn-ghost ui-btn--sm">⋮</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={14} className="ui-empty">No visit records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--color-border-muted)", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
            Show <select className="ui-select" style={{ minHeight: 30, width: 70, fontSize: 12, padding: "2px 8px" }} defaultValue="25"><option>25</option><option>50</option><option>100</option></select> Entries
          </div>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Showing 0 to 0 of 0 entries</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["«","‹","›","»"].map((b) => <button key={b} className="ui-page-btn" style={{ fontSize: 13 }}>{b}</button>)}
          </div>
        </div>
      </div>

      {showFilter && (
        <Modal title="Filter" onClose={() => setShowFilter(false)} showClose
          actions={<button className="ui-btn-primary" onClick={() => setShowFilter(false)}>Apply</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label className="ui-label">Type of Visit</label><select className="ui-select"><option>Select Type</option>{VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="ui-label">Branch</label><select className="ui-select"><option>Select Branch</option></select></div>
            <div><label className="ui-label">Department</label><select className="ui-select"><option>Select Department</option></select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

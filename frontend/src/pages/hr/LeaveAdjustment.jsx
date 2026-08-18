import React, { useState } from "react";
import Modal from "../components/Modal";

const LEAVE_COLS = ["Casual Leave","Compensatory Off","Earned Leave","Maternity Leave","Paternity Leave","Sabbatical Leave","Sick Leave","Leave Without Pay"];

export default function LeaveAdjustment() {
  const [showFilter, setShowFilter] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Leave Adjustment</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Adjust employee leave balances.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="ui-select" style={{ width: 180, minHeight: 34, fontSize: 12 }}><option>All Employees</option></select>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => setShowFilter(true)}>⚙ Filter</button>
          <button className="ui-btn-primary ui-btn--sm">Save</button>
        </div>
      </div>

      <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1400 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-thead)" }}>
                <th rowSpan={2} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border-muted)", whiteSpace: "nowrap" }}>Employee</th>
                {LEAVE_COLS.map((col) => (
                  <th key={col} colSpan={3} style={{ padding: "8px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border-muted)", whiteSpace: "nowrap" }}>{col}</th>
                ))}
                <th rowSpan={2} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>Action</th>
              </tr>
              <tr style={{ background: "var(--color-surface-thead)" }}>
                {LEAVE_COLS.map((col) => (
                  <React.Fragment key={col}>
                    {["Consumed","Available","Total"].map((sub) => (
                      <th key={sub} style={{ padding: "6px 10px", textAlign: "center", fontSize: 10.5, fontWeight: 600, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", borderRight: sub === "Total" ? "1px solid var(--color-border-muted)" : "none" }}>{sub}</th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "var(--color-text)", borderRight: "1px solid var(--color-border-muted)", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--color-primary)", fontWeight: 700, flexShrink: 0 }}>G</div>
                    Employee
                  </div>
                </td>
                {Array.from({ length: LEAVE_COLS.length * 3 }).map((_, i) => (
                  <td key={i} style={{ padding: "6px 8px", borderRight: (i + 1) % 3 === 0 ? "1px solid var(--color-border-muted)" : "none" }}>
                    <input style={{ width: 52, textAlign: "center", border: "1px solid var(--color-border)", borderRadius: 6, padding: "4px 6px", fontSize: 12, background: "var(--color-surface-muted)", color: "var(--color-text)" }} defaultValue="0" />
                  </td>
                ))}
                <td style={{ padding: "10px 14px" }}>
                  <button className="ui-btn-outline ui-btn--sm" onClick={() => setShowHistory(true)}>📋 History</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--color-border-muted)", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
            Show <select className="ui-select" style={{ minHeight: 30, width: 70, fontSize: 12, padding: "2px 8px" }} defaultValue="25"><option>25</option><option>50</option><option>100</option></select> Entries
          </div>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Showing 1 to 1 of 1 entries</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["«","‹","1","›","»"].map((b) => <button key={b} className={`ui-page-btn ${b === "1" ? "ui-page-btn--active" : ""}`} style={{ fontSize: 13 }}>{b}</button>)}
          </div>
        </div>
      </div>

      {showFilter && (
        <Modal title="Filter" onClose={() => setShowFilter(false)} showClose
          actions={<button className="ui-btn-primary" onClick={() => setShowFilter(false)}>Apply</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label className="ui-label">Branch</label><select className="ui-select"><option>Select Branch</option></select></div>
            <div><label className="ui-label">Department</label><select className="ui-select"><option>Select Department</option></select></div>
          </div>
        </Modal>
      )}

      {showHistory && (
        <Modal title="Version History" onClose={() => setShowHistory(false)} showClose>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0", gap: 12 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="14" y="10" width="30" height="40" rx="4" fill="#e5e7eb" />
              <path d="M38 10v8h8" fill="#d1d5db" />
              <circle cx="40" cy="38" r="12" fill="#fef2f2" stroke="#ef4444" strokeWidth="2" />
              <line x1="34" y1="32" x2="46" y2="44" stroke="#ef4444" strokeWidth="2" />
            </svg>
            <span style={{ fontSize: 13, color: "var(--color-text-faint)" }}>No Data Found</span>
          </div>
        </Modal>
      )}
    </div>
  );
}

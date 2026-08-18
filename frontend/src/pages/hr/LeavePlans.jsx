import { useState } from "react";
import Modal from "../components/Modal";

export default function LeavePlans() {
  const [tab, setTab] = useState("plans");
  const [showFilter, setShowFilter] = useState(false);

  const TableFooter = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--color-border-muted)", flexWrap: "wrap", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
        Show <select className="ui-select" style={{ minHeight: 30, width: 70, fontSize: 12, padding: "2px 8px" }} defaultValue="25"><option>25</option><option>50</option><option>100</option></select> Entries
      </div>
      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Showing 0 to 0 of 0 entries</span>
      <div style={{ display: "flex", gap: 4 }}>
        {["«","‹","›","»"].map((b) => <button key={b} className="ui-page-btn" style={{ fontSize: 13 }}>{b}</button>)}
      </div>
    </div>
  );

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Leave Plans</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Configure and assign leave plans to employees.</p>
        </div>
        <button className="ui-btn-primary ui-btn--sm">+ Leave Plan</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16, borderBottom: "2px solid var(--color-border)" }}>
        {[{ id: "plans", label: "Leave Plans" }, { id: "assigned", label: "Assigned Leave Plans" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, border: "none", background: "transparent", cursor: "pointer", color: tab === t.id ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t.id ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2, transition: "all .15s" }}>{t.label}</button>
        ))}
        {tab === "assigned" && (
          <button className="ui-btn-outline ui-btn--sm" style={{ marginLeft: "auto", marginBottom: 4 }} onClick={() => setShowFilter(true)}>⚙ Filter</button>
        )}
      </div>

      <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ui-table-wrap" style={{ border: "none" }}>
          {tab === "plans" ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-thead)" }}>
                  {["SR No.","Leave Plan Name","Effective Duration","Leave Type","Created By","Updated By","Action"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody><tr><td colSpan={7} className="ui-empty">No records found</td></tr></tbody>
            </table>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr style={{ background: "var(--color-surface-thead)" }}>
                  {["SR No.","Leave Plan Name","Effective From","Effective To","Branch","Department","Leave Type","Created By","Action"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody><tr><td colSpan={9} className="ui-empty">No records found</td></tr></tbody>
            </table>
          )}
        </div>
        <TableFooter />
      </div>

      {showFilter && (
        <Modal title="Filter" onClose={() => setShowFilter(false)} showClose
          actions={<button className="ui-btn-primary" onClick={() => setShowFilter(false)}>Apply</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label className="ui-label">Leave Plan</label><select className="ui-select"><option>Select Leave Plan</option></select></div>
            <div><label className="ui-label">Branch</label><select className="ui-select"><option>Select Branch</option></select></div>
            <div><label className="ui-label">Department</label><select className="ui-select"><option>Select Department</option></select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

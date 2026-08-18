import { useState } from "react";
import Modal from "../components/Modal";

export default function Holiday() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", from: "", to: "", branch: "" });

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Holiday List</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Manage public and company holidays.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => setYear((y) => y - 1)}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", minWidth: 50, textAlign: "center" }}>{year}</span>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => setYear((y) => y + 1)}>›</button>
          <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowAdd(true)}>+ Add Holiday</button>
        </div>
      </div>

      <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ui-table-wrap" style={{ border: "none" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-thead)" }}>
                {["SR No.","Holiday Name","Date","No. of Days","Branch","Created By","Updated By","Action"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={8} className="ui-empty">No holidays found</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Holiday" onClose={() => setShowAdd(false)} showClose
          actions={<button className="ui-btn-primary" onClick={() => setShowAdd(false)}>Save</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="ui-label">Holiday Name *</label>
              <input className="ui-input" placeholder="Enter holiday name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="ui-label">From *</label>
                <input className="ui-input" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
              </div>
              <div>
                <label className="ui-label">To *</label>
                <input className="ui-input" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="ui-label">Branch *</label>
              <select className="ui-select" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                <option value="" disabled>Select Branch</option>
                <option>Head Office</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useState } from "react";
import Modal from "../components/Modal";

export default function LeaveApprovals() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({ type: "", from: "", to: "", reason: "" });
  const [empOpen, setEmpOpen] = useState(false);
  const [empQuery, setEmpQuery] = useState("");
  const [empSelected, setEmpSelected] = useState("All Employees");
  const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Status");

  const empOptions = ["All Employees"];
  const filteredEmp = empOptions.filter((o) => o.toLowerCase().includes(empQuery.toLowerCase()));
  const leaveTypes = ["Casual Leave","Compensatory Off","Earned Leave","Leave Without Pay","Maternity Leave","Paternity Leave","Sabbatical Leave","Sick Leave"];

  const navMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(y, m - 1 + delta, 1).toISOString().slice(0, 7));
  };

  const Dropdown = ({ open, setOpen, label, children }) => (
    <div style={{ position: "relative" }}>
      <button className="ui-btn-outline ui-btn--sm" onClick={() => setOpen((o) => !o)} type="button">
        {label} <span style={{ marginLeft: 4 }}>⌄</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 20, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 200, marginTop: 4 }}>
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Leave Approvals</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Review and approve employee leave requests.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(-1)}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", minWidth: 90, textAlign: "center" }}>
            {new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" })}
          </span>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(1)}>›</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <Dropdown open={empOpen} setOpen={setEmpOpen} label={empSelected}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border-muted)" }}>
            <input className="ui-input" style={{ minHeight: 32, fontSize: 12 }} placeholder="Search Employee" value={empQuery} onChange={(e) => setEmpQuery(e.target.value)} />
          </div>
          {filteredEmp.map((opt) => (
            <div key={opt} onClick={() => { setEmpSelected(opt); setEmpOpen(false); }} style={{ padding: "8px 14px", fontSize: 13, cursor: "pointer", background: opt === empSelected ? "var(--color-surface-muted)" : "transparent", color: "var(--color-text)" }}>{opt}</div>
          ))}
        </Dropdown>

        <Dropdown open={leaveTypeOpen} setOpen={setLeaveTypeOpen} label="Leave Type">
          {leaveTypes.map((t) => (
            <div key={t} onClick={() => setLeaveTypeOpen(false)} style={{ padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "var(--color-text)" }}>{t}</div>
          ))}
        </Dropdown>

        <select className="ui-select" style={{ width: 130, minHeight: 34, fontSize: 12 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>Status</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
        </select>

        <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowApply(true)}>+ Leave Request</button>
      </div>

      {/* Table */}
      <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ui-table-wrap" style={{ border: "none" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-thead)" }}>
                {["SR No.","Employee","Leave Type","From","To","No Of Days","Reason","Attachment","Created By","Updated By","Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={11} className="ui-empty">No records found</td></tr>
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

      {showApply && (
        <Modal title="Leave Request" onClose={() => setShowApply(false)} showClose
          actions={<button className="ui-btn-primary" onClick={() => setShowApply(false)}>Save</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="ui-label">Leave Type *</label>
              <select className="ui-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="" disabled>Select Leave Type</option>
                {leaveTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
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
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--color-text-muted)", background: "var(--color-surface-muted)", padding: "8px 12px", borderRadius: 8 }}>
              <span>Number of days: <b style={{ color: "var(--color-text)" }}>0</b></span>
              <span>Remaining Leaves: <b style={{ color: "var(--color-text)" }}>0</b></span>
            </div>
            <div>
              <label className="ui-label">Reason *</label>
              <textarea className="ui-textarea" placeholder="Enter reason" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div>
              <label className="ui-label">Attachment</label>
              <button className="ui-btn-outline ui-btn--sm">＋ Upload Document</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

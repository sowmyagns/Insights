import { useState } from "react";
import Modal from "../components/Modal";

export default function Preboarding() {
  const [tab, setTab] = useState("manage");
  const [step, setStep] = useState("offers");
  const [showAdd, setShowAdd] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", gender: "", designation: "", email: "", mobile: "", employmentType: "", branch: "", department: "", doj: "" });

  const manageHeaders = step === "joiners"
    ? ["SR No.","Candidate Name","Designation","Branch","Department","Contact Info","Date of Joining","Status","Actions"]
    : ["SR No.","Candidate Name","Designation","Branch","Department","Contact Info","Date of Joining","Task","Status","Actions"];

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
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Preboarding</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Manage candidates before they officially join.</p>
        </div>
        <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowAdd(true)}>+ Add Candidate</button>
      </div>

      {/* Main tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 0, borderBottom: "2px solid var(--color-border)" }}>
        {[{ id: "manage", label: "Manage Candidates" }, { id: "archived", label: "Archived Candidates" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, border: "none", background: "transparent", cursor: "pointer", color: tab === t.id ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t.id ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2, transition: "all .15s" }}>{t.label}</button>
        ))}
        <button className="ui-btn-outline ui-btn--sm" style={{ marginLeft: "auto", marginBottom: 4 }} onClick={() => setShowFilter(true)}>⚙ Filter</button>
      </div>

      {/* Sub-steps for manage tab */}
      {tab === "manage" && (
        <div style={{ display: "flex", gap: 4, padding: "12px 0", borderBottom: "1px solid var(--color-border-muted)", marginBottom: 14 }}>
          {[{ id: "offers", label: "Manage Offers" }, { id: "docs", label: "Manage Documents" }, { id: "joiners", label: "New Joiners" }].map((s) => (
            <button key={s.id} onClick={() => setStep(s.id)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 20, border: "1.5px solid", borderColor: step === s.id ? "var(--color-primary)" : "var(--color-border)", background: step === s.id ? "var(--color-primary)" : "transparent", color: step === s.id ? "#fff" : "var(--color-text-muted)", cursor: "pointer", transition: "all .15s" }}>{s.label}</button>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14, maxWidth: 280 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", fontSize: 14 }}>🔍</span>
        <input className="ui-input" style={{ paddingLeft: 32, minHeight: 34, fontSize: 12 }} placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ui-table-wrap" style={{ border: "none" }}>
          {tab === "manage" ? (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr style={{ background: "var(--color-surface-thead)" }}>
                  {manageHeaders.map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody><tr><td colSpan={manageHeaders.length} className="ui-empty">No records found</td></tr></tbody>
            </table>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr style={{ background: "var(--color-surface-thead)" }}>
                  {["SR No.","Candidate Name","Designation","Branch","Department","Contact Info","Status","Achieved By","Reason","Actions"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody><tr><td colSpan={10} className="ui-empty">No records found</td></tr></tbody>
            </table>
          )}
        </div>
        <TableFooter />
      </div>

      {showAdd && (
        <Modal title="Add Candidate" onClose={() => setShowAdd(false)} showClose
          actions={<button className="ui-btn-primary" onClick={() => setShowAdd(false)}>Save</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label className="ui-label">First Name *</label><input className="ui-input" placeholder="Enter first name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><label className="ui-label">Last Name *</label><input className="ui-input" placeholder="Enter last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            <div><label className="ui-label">Gender *</label><select className="ui-select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Select Gender</option><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div><label className="ui-label">Designation *</label><select className="ui-select" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })}><option value="">Select Designation</option></select></div>
            <div><label className="ui-label">Email *</label><input className="ui-input" type="email" placeholder="Enter email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="ui-label">Mobile Number *</label><input className="ui-input" placeholder="Enter mobile number" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div><label className="ui-label">Employment Type *</label><select className="ui-select" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}><option value="">Select Type</option><option>Permanent</option><option>Contract</option></select></div>
            <div><label className="ui-label">Branch *</label><select className="ui-select" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}><option value="">Select Branch</option></select></div>
            <div><label className="ui-label">Department *</label><select className="ui-select" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}><option value="">Select Department</option></select></div>
            <div><label className="ui-label">Date of Joining</label><input className="ui-input" type="date" value={form.doj} onChange={(e) => setForm({ ...form, doj: e.target.value })} /></div>
          </div>
        </Modal>
      )}

      {showFilter && (
        <Modal title="Filter" onClose={() => setShowFilter(false)} showClose
          actions={<button className="ui-btn-primary" onClick={() => setShowFilter(false)}>Apply</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label className="ui-label">Branch</label><select className="ui-select"><option>Select Branch</option></select></div>
            <div><label className="ui-label">Department</label><select className="ui-select"><option>Select Department</option></select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

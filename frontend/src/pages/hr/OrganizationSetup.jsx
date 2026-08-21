import { useState } from "react";
import Modal from "../components/Modal";

const TABS = [
  { id: "leave", label: "Leave Types" },
  { id: "designation", label: "Designations" },
  { id: "department", label: "Departments" },
  { id: "employment", label: "Employment Types" },
  { id: "expense", label: "Expense Settings" },
  { id: "branch", label: "Branches" },
  { id: "geo", label: "Geo Fencing" },
];

const LEAVE_TYPES = [
  { name: "Casual Leave", paid: "PAID" }, { name: "Compensatory Off", paid: "PAID" },
  { name: "Earned Leave", paid: "PAID" }, { name: "Leave Without Pay", paid: "UNPAID" },
  { name: "Maternity Leave", paid: "PAID" }, { name: "Paternity Leave", paid: "PAID" },
  { name: "Sabbatical Leave", paid: "PAID" }, { name: "Sick Leave", paid: "PAID" },
];

const Toggle = ({ defaultChecked = true }) => {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button onClick={() => setOn((v) => !v)} style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: on ? "var(--color-primary)" : "var(--color-border)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
};

const TableWrap = ({ headers, children }) => (
  <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
    <div className="ui-table-wrap" style={{ border: "none" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--color-surface-thead)" }}>
            {headers.map((h) => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  </div>
);

export default function OrganizationSetup() {
  const [tab, setTab] = useState("leave");
  const [modal, setModal] = useState(null);

  const ModalForm = ({ title, children }) => (
    <Modal title={title} onClose={() => setModal(null)} showClose
      actions={<><button className="ui-btn-secondary ui-btn--sm" onClick={() => setModal(null)}>Cancel</button><button className="ui-btn-primary ui-btn--sm">Save</button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </Modal>
  );

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Organization Setup</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Configure leave types, designations, departments, and more.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap", borderBottom: "2px solid var(--color-border)", paddingBottom: 0 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, border: "none", background: "transparent", cursor: "pointer", color: tab === t.id ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t.id ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2, transition: "all .15s", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      {/* Add button for table tabs */}
      {["leave","designation","department","employment","branch"].includes(tab) && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button className="ui-btn-primary ui-btn--sm" onClick={() => setModal(`add-${tab}`)}>+ Add</button>
        </div>
      )}

      {tab === "leave" && (
        <TableWrap headers={["Sr. No","Leave Type","Is Paid","Created By","Updated By","Status","Action"]}>
          {LEAVE_TYPES.map((row, i) => (
            <tr key={row.name} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
              <td style={{ padding: "10px 14px", fontSize: 13 }}>{i + 1}.</td>
              <td style={{ padding: "10px 14px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "var(--color-primary-soft)", color: "var(--color-primary)" }}>{row.name}</span>
              </td>
              <td style={{ padding: "10px 14px" }}>
                <span className={`ui-badge ${row.paid === "PAID" ? "ui-badge-success" : "ui-badge-warning"}`}>{row.paid}</span>
              </td>
              <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--color-text-muted)" }}>Admin</td>
              <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--color-text-muted)" }}>—</td>
              <td style={{ padding: "10px 14px" }}><Toggle /></td>
              <td style={{ padding: "10px 14px" }}><button className="ui-btn-ghost ui-btn--sm" onClick={() => setModal("edit-leave")}>✎</button></td>
            </tr>
          ))}
        </TableWrap>
      )}

      {tab === "designation" && (
        <TableWrap headers={["Sr. No","Designation","Created By","Updated By","Action"]}>
          <tr><td colSpan={5} className="ui-empty">No records found</td></tr>
        </TableWrap>
      )}

      {tab === "department" && (
        <TableWrap headers={["Sr. No","Department","Default Weekly Off","Created By","Updated By","Action"]}>
          <tr><td colSpan={6} className="ui-empty">No records found</td></tr>
        </TableWrap>
      )}

      {tab === "employment" && (
        <TableWrap headers={["Sr. No","Employment Type","Created By","Updated By","Action"]}>
          <tr><td colSpan={5} className="ui-empty">No records found</td></tr>
        </TableWrap>
      )}

      {tab === "expense" && (
        <div className="ui-card" style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <button className="ui-btn-primary" onClick={() => setModal("add-expense")}>+ Add Expense Category</button>
          <div style={{ fontSize: 13, color: "var(--color-text-faint)" }}>No expense categories configured</div>
        </div>
      )}

      {tab === "branch" && (
        <TableWrap headers={["Branch","State","District","Address","Default Weekly Off","Created By","Updated By","Action"]}>
          <tr><td colSpan={8} className="ui-empty">No records found</td></tr>
        </TableWrap>
      )}

      {tab === "geo" && (
        <div className="ui-card" style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <button className="ui-btn-primary" onClick={() => setModal("add-geo")}>+ Add Geo Fence</button>
          <div style={{ fontSize: 13, color: "var(--color-text-faint)" }}>No geo fences configured</div>
        </div>
      )}

      {/* ── Modals ── */}
      {(modal === "add-leave" || modal === "edit-leave") && (
        <ModalForm title={modal === "add-leave" ? "Add Leave Type" : "Edit Leave Type"}>
          <div><label className="ui-label">Leave Type</label><input className="ui-input" defaultValue={modal === "edit-leave" ? "Casual Leave" : ""} placeholder="Enter leave name" /></div>
          <div><label className="ui-label">Is Paid</label><select className="ui-select"><option>Paid</option><option>Unpaid</option></select></div>
        </ModalForm>
      )}

      {(modal === "add-designation" || modal === "edit-designation") && (
        <ModalForm title={modal === "add-designation" ? "Add Designation" : "Edit Designation"}>
          <div><label className="ui-label">Designation</label><input className="ui-input" defaultValue={modal === "edit-designation" ? "CEO" : ""} placeholder="Enter designation" /></div>
        </ModalForm>
      )}

      {(modal === "add-department" || modal === "edit-department") && (
        <ModalForm title={modal === "add-department" ? "Add Department" : "Edit Department"}>
          <div><label className="ui-label">Department Name</label><input className="ui-input" defaultValue={modal === "edit-department" ? "IT" : ""} placeholder="Enter department" /></div>
          <div><label className="ui-label">Default Weekly Off</label><select className="ui-select"><option>Organization Default</option><option>Custom</option></select></div>
        </ModalForm>
      )}

      {(modal === "add-employment" || modal === "edit-employment") && (
        <ModalForm title={modal === "add-employment" ? "Add Employment Type" : "Edit Employment Type"}>
          <div><label className="ui-label">Employment Type</label><input className="ui-input" defaultValue={modal === "edit-employment" ? "Permanent" : ""} placeholder="Enter employment type" /></div>
        </ModalForm>
      )}

      {modal === "add-expense" && (
        <ModalForm title="Add Expense Category">
          <div><label className="ui-label">Expense Name *</label><input className="ui-input" placeholder="Enter expense name" /></div>
          <div><label className="ui-label">Expense Limit *</label><input className="ui-input" type="number" placeholder="Enter limit" /></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "var(--color-text)" }}>
            <input type="checkbox" style={{ accentColor: "var(--color-primary)", width: 15, height: 15 }} />
            Configure approval chain
          </label>
        </ModalForm>
      )}

      {(modal === "add-branch" || modal === "edit-branch") && (
        <ModalForm title={modal === "add-branch" ? "Add Branch" : "Edit Branch"}>
          <div><label className="ui-label">Branch Name</label><input className="ui-input" defaultValue={modal === "edit-branch" ? "Head Office" : ""} placeholder="Enter branch name" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label className="ui-label">State</label><select className="ui-select"><option>Telangana</option><option>Andhra Pradesh</option></select></div>
            <div><label className="ui-label">District</label><select className="ui-select"><option>Suryapet</option><option>Hyderabad</option></select></div>
          </div>
          <div><label className="ui-label">Default Weekly Off</label><select className="ui-select"><option>Organization Default</option><option>Custom Weekly Off</option></select></div>
          <div><label className="ui-label">Address</label><textarea className="ui-textarea" placeholder="Enter address" rows={2} /></div>
        </ModalForm>
      )}

      {modal === "add-geo" && (
        <ModalForm title="Add Geo Fencing">
          <div><label className="ui-label">Branch</label><select className="ui-select"><option>Select Branch</option><option>Head Office</option></select></div>
          <div>
            <label className="ui-label">Address</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="ui-input" placeholder="Search address" style={{ flex: 1 }} />
              <button className="ui-btn-outline ui-btn--sm">🔍</button>
            </div>
          </div>
          <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--color-border)", height: 200 }}>
            <iframe title="Geo map" style={{ width: "100%", height: "100%", border: "none" }}
              src="https://www.openstreetmap.org/export/embed.html?bbox=77.292%2C17.278%2C78.786%2C17.625&layer=mapnik&marker=17.3850%2C78.4867" />
          </div>
        </ModalForm>
      )}
    </div>
  );
}

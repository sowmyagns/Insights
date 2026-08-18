import { useState } from "react";

const ROLE_LIST = ["Account","Admin","Employee","Manager","Top Management"];
const PERMISSIONS = [
  { title: "Attendance", items: ["View Attendance","Enable Check In - Check Out","Add / Edit Regularization Request","Allow Check-In Check-Out With Selfie","View Regularization Request"] },
  { title: "Overtime", items: ["Allow Overtime Start-Stop","Add / Edit Overtime Request","View Overtime Request"] },
  { title: "Leave Tracker", items: ["Add / Edit Leave Request","My Leave","View Holidays"] },
  { title: "Employee Management", items: ["View Employee Profile"] },
  { title: "Payroll", items: ["Manage Payroll","View Payslip","Tally Configuration"] },
  { title: "Announcement", items: ["View Announcement"] },
  { title: "Expense", items: ["My Expense","Self Request Approve/Reject","Self Expense Add/Edit","Manage Expense for Team"] },
  { title: "Site Visit", items: ["View Site Visit","Add / Edit Site Visit For Self"] },
  { title: "Asset Management", items: ["View Asset","Manage Asset"] },
];

const Toggle = ({ defaultChecked = true }) => {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button onClick={() => setOn((v) => !v)} style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: on ? "var(--color-primary)" : "var(--color-border)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
};

export default function RolesPermissions() {
  const [role, setRole] = useState("Account");

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Roles & Permissions</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Configure access permissions per role.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "180px 220px 1fr", gap: 14, alignItems: "start" }}>
        {/* Roles list */}
        <div className="ui-card" style={{ padding: "14px 0" }}>
          <div style={{ padding: "0 16px 10px", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Roles</div>
          {ROLE_LIST.map((r) => (
            <button key={r} onClick={() => setRole(r)} style={{ width: "100%", textAlign: "left", padding: "9px 16px", fontSize: 13, fontWeight: role === r ? 700 : 500, border: "none", background: role === r ? "var(--color-primary-soft)" : "transparent", color: role === r ? "var(--color-primary)" : "var(--color-text)", cursor: "pointer", borderLeft: role === r ? "3px solid var(--color-primary)" : "3px solid transparent", transition: "all .15s" }}>{r}</button>
          ))}
        </div>

        {/* Users */}
        <div className="ui-card" style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Users</div>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-muted)" }}>🔍</span>
            <input className="ui-input" style={{ paddingLeft: 30, minHeight: 32, fontSize: 12 }} placeholder="Search user" />
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-faint)", textAlign: "center", padding: "16px 0" }}>No user found</div>
        </div>

        {/* Permissions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PERMISSIONS.map((section) => (
            <div key={section.title} className="ui-card" style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{section.title}</span>
                <Toggle />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {section.items.map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: 8, background: "var(--color-surface-muted)" }}>
                    <span style={{ fontSize: 12.5, color: "var(--color-text-secondary)" }}>{item}</span>
                    <Toggle />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button className="ui-btn-primary ui-btn--sm">Save</button>
            <button className="ui-btn-secondary ui-btn--sm">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

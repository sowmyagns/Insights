import { useState } from "react";
import { api } from "../api";
import { fmtDate } from "../utils/format";
import Badge from "../components/Badge";
import Modal from "../components/Modal";

const LEAVE_TYPES_LIST = [
  "Casual Leave","Compensatory Off","Earned Leave","Leave Without Pay",
  "Maternity Leave","Paternity Leave","Sabbatical Leave","Sick Leave",
];

const LEAVE_CARDS = [
  { label: "Casual Leave", icon: "🍃" }, { label: "Compensatory Off", icon: "🧿" },
  { label: "Earned Leave", icon: "🧾" }, { label: "Maternity Leave", icon: "🤱" },
  { label: "Paternity Leave", icon: "🤝" }, { label: "Sabbatical Leave", icon: "🧳" },
  { label: "Sick Leave", icon: "🩺" }, { label: "Leave Without Pay", icon: "⭕" },
];

export default function Leave({ employees, leaves, setLeaves, apiMode, refreshFromApi }) {
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({ employeeId: "", type: "", from: "", to: "", reason: "" });
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const computeDays = (f, t) => !f || !t ? 0 : Math.max(1, Math.ceil((new Date(t) - new Date(f)) / 86400000) + 1);

  const navMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(y, m - 1 + delta, 1).toISOString().slice(0, 7));
  };

  const handleApply = async () => {
    if (!form.from || !form.to) return;
    const emp = employees.find((e) => String(e.id) === String(form.employeeId)) || employees[0];
    if (apiMode && refreshFromApi) {
      await api.leave.apply({ employee_id: emp.id, leave_type: form.type, start_date: form.from, end_date: form.to, reason: form.reason || null, status: "pending" });
      await refreshFromApi();
      setShowApply(false);
      return;
    }
    setLeaves([{ id: Date.now(), employeeId: emp.id, employee: emp.name, type: form.type, from: form.from, to: form.to, days: computeDays(form.from, form.to), status: "Pending", reason: form.reason }, ...leaves]);
    setShowApply(false);
  };

  const updateStatus = async (id, status) => {
    if (apiMode && refreshFromApi) { await api.leave.approve(id, status.toLowerCase()); await refreshFromApi(); return; }
    setLeaves(leaves.map((l) => l.id === id ? { ...l, status } : l));
  };

  const del = async (id) => {
    if (apiMode && refreshFromApi) { await api.leave.delete(id); await refreshFromApi(); return; }
    setLeaves(leaves.filter((l) => l.id !== id));
  };

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>My Leaves</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Manage and track your leave requests.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(-1)}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", minWidth: 90, textAlign: "center" }}>
            {new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" })}
          </span>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(1)}>›</button>
          <button className="ui-btn-primary ui-btn--sm" onClick={() => { setForm({ employeeId: String(employees[0]?.id || ""), type: "", from: "", to: "", reason: "" }); setShowApply(true); }}>
            + Leave Request
          </button>
        </div>
      </div>

      {/* Leave balance cards */}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
        {LEAVE_CARDS.map((c) => (
          <div key={c.label} className="ui-card" style={{ minWidth: 130, padding: "12px 14px", flexShrink: 0, textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-text)", marginBottom: 8, lineHeight: 1.3 }}>{c.label}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600 }}>Balance</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-primary)" }}>0</div>
              </div>
              <div style={{ width: 1, background: "var(--color-border)" }} />
              <div>
                <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600 }}>Used</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-muted)" }}>0</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ui-table-wrap" style={{ border: "none" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-thead)" }}>
                {["SR No.","Leave Type","From","To","Days","Reason","Attachment","Created By","Updated By","Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaves.length ? leaves.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{i + 1}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{l.type}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{fmtDate(l.from)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{fmtDate(l.to)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{l.days}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{l.reason || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>—</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{l.employee || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>—</td>
                  <td style={{ padding: "10px 14px" }}><Badge status={l.status} /></td>
                </tr>
              )) : (
                <tr><td colSpan={10} className="ui-empty">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--color-border-muted)", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
            Show
            <select className="ui-select" style={{ minHeight: 30, width: 70, fontSize: 12, padding: "2px 8px" }} defaultValue="25">
              <option>25</option><option>50</option><option>100</option>
            </select>
            Entries
          </div>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Showing 0 to 0 of 0 entries</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["«","‹","›","»"].map((b) => <button key={b} className="ui-page-btn" style={{ fontSize: 13 }}>{b}</button>)}
          </div>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApply && (
        <Modal title="Leave Request" onClose={() => setShowApply(false)} showClose
          actions={<button className="ui-btn-primary" onClick={handleApply}>Save</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="ui-label">Leave Type *</label>
              <select className="ui-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="" disabled>Select Leave Type</option>
                {LEAVE_TYPES_LIST.map((t) => <option key={t}>{t}</option>)}
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
              <span>Days: <b style={{ color: "var(--color-text)" }}>{form.from && form.to ? computeDays(form.from, form.to) : 0}</b></span>
              <span>Remaining: <b style={{ color: "var(--color-text)" }}>0</b></span>
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

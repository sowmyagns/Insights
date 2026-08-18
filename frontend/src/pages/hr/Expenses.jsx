import { useState, useEffect } from "react";
import { api } from "../api";
import { fmtDate } from "../utils/format";
import Badge from "../components/Badge";
import Modal from "../components/Modal";

const CATEGORIES = ["Travel","Meals","Office Supplies","Client Entertainment","Software","Other"];

export default function Expenses({ employees, apiMode, refreshFromApi, view }) {
  const [expenses, setExpenses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ employee_id: "", amount: "", category: "Travel", date: new Date().toISOString().slice(0, 10), description: "" });
  const [empSelected, setEmpSelected] = useState("All Employees");
  const [empOpen, setEmpOpen] = useState(false);
  const [empQuery, setEmpQuery] = useState("");
  const empOptions = ["All Employees", ...((employees || []).map((e) => e.name))];
  const filteredEmpOptions = empOptions.filter((o) => o.toLowerCase().includes(empQuery.toLowerCase()));

  const navMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(y, m - 1 + delta, 1).toISOString().slice(0, 7));
  };

  useEffect(() => {
    if (apiMode) api.expenses.list({ month }).then(setExpenses).catch(() => setExpenses([]));
  }, [apiMode, month]);

  const handleAdd = async () => {
    if (!form.employee_id || !form.amount || !form.date) return;
    if (apiMode) {
      await api.expenses.create({ employee_id: Number(form.employee_id), amount: Number(form.amount), category: form.category, date: form.date, description: form.description || null });
      await refreshFromApi?.();
      api.expenses.list({ month }).then(setExpenses);
      setShowAdd(false);
      setForm({ employee_id: "", amount: "", category: "Travel", date: new Date().toISOString().slice(0, 10), description: "" });
    }
  };

  const approve = async (id, status) => {
    if (apiMode) { await api.expenses.approve(id, status); api.expenses.list({ month }).then(setExpenses); }
  };

  const fmtMoney = (n) => `₹${Number(n).toLocaleString()}`;
  const empMap = Object.fromEntries((employees || []).map((e) => [e.id, e.name]));

  const monthLabel = new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" });

  const PageHeader = ({ title, subtitle }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>{title}</h1>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>{subtitle}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(-1)}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", minWidth: 90, textAlign: "center" }}>{monthLabel}</span>
        <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(1)}>›</button>
      </div>
    </div>
  );

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

  const AddExpenseModal = () => (
    <Modal title="Add Expense" onClose={() => setShowAdd(false)} showClose
      actions={<button className="ui-btn-primary" onClick={handleAdd}>Save</button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="ui-label">Expense Category *</label>
          <select className="ui-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Select Category</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="ui-label">Expense Name *</label>
          <input className="ui-input" placeholder="Enter expense name" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="ui-label">Expense Date *</label>
            <input className="ui-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="ui-label">Amount *</label>
            <input className="ui-input" type="number" placeholder="Enter amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="ui-label">Details</label>
          <textarea className="ui-textarea" placeholder="Enter details" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="ui-label">Attachment</label>
          <button className="ui-btn-outline ui-btn--sm">＋ Upload Document</button>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>Maximum file size: 10MB</div>
        </div>
      </div>
    </Modal>
  );

  if (view === "expenses-overview") {
    return (
      <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <PageHeader title="Overview" subtitle="Expense overview for the selected month." />
        <div className="ui-card" style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <svg width="86" height="86" viewBox="0 0 86 86" fill="none">
            <circle cx="43" cy="43" r="34" fill="#E9F2FF" />
            <rect x="28" y="22" width="30" height="42" rx="6" fill="#5B84FF" />
            <rect x="33" y="30" width="20" height="4" rx="2" fill="#DDE7FF" />
            <rect x="33" y="38" width="20" height="4" rx="2" fill="#DDE7FF" />
            <rect x="33" y="46" width="20" height="4" rx="2" fill="#DDE7FF" />
            <circle cx="60" cy="28" r="14" fill="#F59E0B" />
            <path d="M57 24h6M60 21v14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 14, color: "var(--color-text-faint)" }}>No Expenses Found</div>
        </div>
      </div>
    );
  }

  if (view === "expenses-my") {
    return (
      <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <PageHeader title="My Expenses" subtitle="Track and submit your personal expenses." />
        <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--color-border-muted)", flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>All Expenses</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <select className="ui-select" style={{ width: 150, minHeight: 34, fontSize: 12 }}><option>Expenses Type</option></select>
              <select className="ui-select" style={{ width: 120, minHeight: 34, fontSize: 12 }}><option>Status</option></select>
              <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowAdd(true)}>+ Add Expense</button>
            </div>
          </div>
          <div className="ui-table-wrap" style={{ border: "none" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "var(--color-surface-thead)" }}>
                  {["SR No.","Category","Expense Name","Date","Details","Amount","Created By","Updated By","Status","Waiting On","Action"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={11} className="ui-empty">No records found</td></tr>
              </tbody>
            </table>
          </div>
          <TableFooter />
        </div>
        {showAdd && <AddExpenseModal />}
      </div>
    );
  }

  if (view === "expenses-approvals") {
    return (
      <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Expense Approvals</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Review and approve employee expense requests.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(-1)}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", minWidth: 90, textAlign: "center" }}>{monthLabel}</span>
            <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(1)}>›</button>
          </div>
        </div>

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
          <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowAdd(true)}>+ Add Expense</button>
        </div>

        <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="ui-table-wrap" style={{ border: "none" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
              <thead>
                <tr style={{ background: "var(--color-surface-thead)" }}>
                  {["Employee","Branch","Department","Category","Expense Name","Date","Amount","Created By","Updated By","Status","Waiting On","Action"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={12} className="ui-empty">No records found</td></tr>
              </tbody>
            </table>
          </div>
          <TableFooter />
        </div>

        {showFilter && (
          <Modal title="Filter" onClose={() => setShowFilter(false)} showClose
            actions={<button className="ui-btn-primary" onClick={() => setShowFilter(false)}>Apply</button>}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label className="ui-label">Expense Category</label><select className="ui-select"><option>Select Category</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label className="ui-label">Status</label><select className="ui-select"><option>Select Status</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></div>
              <div><label className="ui-label">Branch</label><select className="ui-select"><option>Select Branch</option></select></div>
              <div><label className="ui-label">Department</label><select className="ui-select"><option>Select Department</option></select></div>
            </div>
          </Modal>
        )}
        {showAdd && <AddExpenseModal />}
      </div>
    );
  }

  // Default view
  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Expenses</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Manage employee expense records.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select className="ui-select" style={{ width: 150, minHeight: 36, fontSize: 13 }} value={month} onChange={(e) => setMonth(e.target.value)}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
              <option key={m} value={`${new Date().getFullYear()}-${String(m).padStart(2,"0")}`}>
                {new Date(2000, m - 1).toLocaleString("default", { month: "short" })} {new Date().getFullYear()}
              </option>
            ))}
          </select>
          <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowAdd(true)}>+ Add Expense</button>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{expenses.length} records</span>
        </div>
      </div>

      <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ui-table-wrap" style={{ border: "none" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-thead)" }}>
                {["Employee","Date","Category","Amount","Description","Status","Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{empMap[e.employee_id] || e.employee_id}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{fmtDate(e.date)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--color-text-muted)" }}>{e.category}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "var(--color-primary)" }}>{fmtMoney(e.amount)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description || "—"}</td>
                  <td style={{ padding: "10px 14px" }}><Badge status={e.status} /></td>
                  <td style={{ padding: "10px 14px" }}>
                    {e.status === "pending" && apiMode && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="ui-btn-success ui-btn--sm" onClick={() => approve(e.id, "approved")}>✓</button>
                        <button className="ui-btn-danger ui-btn--sm" onClick={() => approve(e.id, "rejected")}>✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!expenses.length && <tr><td colSpan={7} className="ui-empty">No expense records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Expense" onClose={() => setShowAdd(false)}
          actions={<><button className="ui-btn-secondary ui-btn--sm" onClick={() => setShowAdd(false)}>Cancel</button><button className="ui-btn-primary ui-btn--sm" onClick={handleAdd}>Submit</button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="ui-label">Employee</label>
              <select className="ui-select" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                <option value="">Select...</option>
                {(employees || []).map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div>
              <label className="ui-label">Category</label>
              <select className="ui-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label className="ui-label">Amount (₹)</label><input className="ui-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><label className="ui-label">Date</label><input className="ui-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div><label className="ui-label">Description</label><textarea className="ui-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

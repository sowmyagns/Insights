import { useState } from "react";

export default function SalaryOnHold() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [empOpen, setEmpOpen] = useState(false);
  const [empQuery, setEmpQuery] = useState("");
  const [empSelected, setEmpSelected] = useState("Employee Name");
  const empOptions = ["Guguloth Sateesh"];
  const filteredEmp = empOptions.filter((o) =>
    o.toLowerCase().includes(empQuery.toLowerCase())
  );

  const navMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    setMonth(next.toISOString().slice(0, 7));
  };

  return (
    <div className="salary-hold">
      <div className="salary-hold-header">
        <h1 className="salary-hold-title">Salary On Hold</h1>
        <div className="salary-hold-month">
          <button className="leave-nav-btn" onClick={() => navMonth(-1)}>‹</button>
          <span>{new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" })}</span>
          <button className="leave-nav-btn" onClick={() => navMonth(1)}>›</button>
        </div>
      </div>

      <div className="salary-hold-toolbar">
        <div className="leave-approvals-dropdown">
          <button
            className="leave-approvals-select leave-approvals-select-btn"
            onClick={() => setEmpOpen((o) => !o)}
            type="button"
          >
            {empSelected}
            <span className="leave-approvals-caret">⌄</span>
          </button>
          {empOpen && (
            <div className="leave-approvals-dropdown-panel leave-approvals-dropdown-left">
              <div className="leave-approvals-search">
                <span className="leave-approvals-search-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="20" y1="20" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search Employee"
                  value={empQuery}
                  onChange={(e) => setEmpQuery(e.target.value)}
                />
              </div>
              {filteredEmp.map((opt) => (
                <div
                  key={opt}
                  className={`leave-approvals-option ${opt === empSelected ? "active" : ""}`}
                  onClick={() => { setEmpSelected(opt); setEmpOpen(false); }}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="salary-reset-btn">Reset</button>
      </div>

      <div className="leave-table-wrap">
        <table className="leave-table">
          <thead>
            <tr>
              <th>SR No.</th>
              <th>Employee name</th>
              <th>Paid Days</th>
              <th>Deductions</th>
              <th>Gross Pay</th>
              <th>Net Pay</th>
              <th>Reason</th>
              <th>Updated By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={9} className="leave-empty">No records found</td>
            </tr>
          </tbody>
        </table>
        <div className="leave-table-footer">
          <div className="leave-entries">
            Show
            <select defaultValue="25">
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
            Entries
          </div>
          <div className="leave-pagination">Showing 0 to 0 of 0 entries</div>
          <div className="leave-pager">
            <button>‹</button>
            <button>›</button>
          </div>
        </div>
      </div>

      <div className="att-footer">©2024 otuindia.com</div>
    </div>
  );
}

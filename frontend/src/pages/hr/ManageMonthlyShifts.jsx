import { useState } from "react";
import Modal from "../components/Modal";

export default function ManageMonthlyShifts() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showFilter, setShowFilter] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);
  const [empQuery, setEmpQuery] = useState("");
  const [empSelected, setEmpSelected] = useState("All Employees");
  const empOptions = ["All Employees", "Guguloth Sateesh"];
  const filteredEmp = empOptions.filter((o) =>
    o.toLowerCase().includes(empQuery.toLowerCase())
  );

  const navMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    setMonth(next.toISOString().slice(0, 7));
  };

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="monthly-shifts">
      <div className="monthly-shifts-header">
        <h1 className="monthly-shifts-title">Manage Monthly Shifts</h1>
        <button className="monthly-shifts-history" onClick={() => setShowHistory(true)}>
          Version History
        </button>
      </div>

      <div className="monthly-shifts-filters">
        <div className="leave-approvals-dropdown">
          <button
            className="leave-approvals-select leave-approvals-select-btn"
            type="button"
            onClick={() => setEmpOpen((o) => !o)}
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
        <div className="monthly-shifts-month">
          <button className="leave-nav-btn" onClick={() => navMonth(-1)}>‹</button>
          <span>{new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" })}</span>
          <button className="leave-nav-btn" onClick={() => navMonth(1)}>›</button>
        </div>
        <button className="leave-adjustment-filter" onClick={() => setShowFilter(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h18M6 12h12M10 19h4" />
          </svg>
          Filter
        </button>
      </div>

      <div className="leave-adjustment-table-wrap">
        <div className="leave-adjustment-scroll">
          <table className="leave-adjustment-table">
            <thead>
              <tr>
                <th>SR No.</th>
                <th>Employee</th>
                <th>Branch</th>
                <th>Department</th>
                {days.map((d) => {
                  const dow = new Date(y, m - 1, d).getDay();
                  return (
                    <th key={d} className="monthly-shifts-day">
                      <div>{d}</div>
                      <div className="monthly-shifts-dow">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dow]}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td className="leave-adjustment-emp">
                  <span className="leave-adjustment-avatar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                    </svg>
                  </span>
                  Guguloth Sateesh
                </td>
                <td>developer</td>
                <td>IT</td>
                {days.map((d) => (
                  <td key={`d-${d}`}>
                    <span className="monthly-shifts-pill">W</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

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
        <div className="leave-pagination">Showing 1 to 1 of 1 entries</div>
        <div className="leave-pager">
          <button>«</button>
          <button>‹</button>
          <button className="active">1</button>
          <button>›</button>
          <button>»</button>
        </div>
      </div>

      <div className="att-footer">©2024 otuindia.com</div>

      {showFilter && (
        <Modal
          title="Filter"
          onClose={() => setShowFilter(false)}
          className="leave-modal leave-filter-modal"
          showClose
          actions={
            <button className="leave-send-btn" onClick={() => setShowFilter(false)}>
              Apply
            </button>
          }
        >
          <div className="leave-modal-body">
            <label className="leave-label">Branch</label>
            <select className="leave-input">
              <option>Select Branch</option>
            </select>
            <label className="leave-label">Department</label>
            <select className="leave-input">
              <option>Select Department</option>
            </select>
          </div>
        </Modal>
      )}

      {showHistory && (
        <Modal
          title="Version History"
          onClose={() => setShowHistory(false)}
          className="leave-history-modal"
          showClose
        >
          <div className="leave-history-body">
            <div className="leave-history-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect x="14" y="10" width="30" height="40" rx="4" fill="#e5e7eb" />
                <path d="M38 10v8h8" fill="#d1d5db" />
                <circle cx="40" cy="38" r="12" fill="#fef2f2" stroke="#ef4444" strokeWidth="2" />
                <line x1="34" y1="32" x2="46" y2="44" stroke="#ef4444" strokeWidth="2" />
              </svg>
            </div>
            <div className="leave-history-text">No Data Found</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

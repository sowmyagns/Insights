import { useState } from "react";
import Modal from "../components/Modal";

const COLORS = [
  "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6",
  "#a7f3d0", "#86efac", "#fde68a", "#fecaca", "#fca5a5",
];

export default function ManageShifts() {
  const [tab, setTab] = useState("add");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [empOpen, setEmpOpen] = useState(false);
  const [empQuery, setEmpQuery] = useState("");
  const [empSelected, setEmpSelected] = useState("All Employees");
  const [shiftOpen, setShiftOpen] = useState(false);
  const empOptions = ["All Employees", "Guguloth Sateesh"];
  const filteredEmp = empOptions.filter((o) =>
    o.toLowerCase().includes(empQuery.toLowerCase())
  );

  return (
    <div className="manage-shifts">
      <div className="manage-shifts-header">
        <h1 className="manage-shifts-title">Manage Shifts</h1>
        <button className="leave-request-btn" onClick={() => setShowAdd(true)}>
          + Add Shift
        </button>
      </div>

      <div className="manage-shifts-tabs">
        <button
          className={`leave-plans-tab ${tab === "add" ? "active" : ""}`}
          onClick={() => setTab("add")}
        >
          Add Shift
        </button>
        <button
          className={`leave-plans-tab ${tab === "assigned" ? "active" : ""}`}
          onClick={() => setTab("assigned")}
        >
          Assigned Shifts
        </button>
      </div>

      {tab === "add" ? (
        <div className="leave-table-wrap">
          <table className="leave-table">
            <thead>
              <tr>
                <th>SR No.</th>
                <th>Shift Name</th>
                <th>Shift Timing</th>
                <th>Created Date</th>
                <th>Created By</th>
                <th>Updated By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td className="shift-name">
                  <span className="shift-avatar">G</span> General
                </td>
                <td>10:00 AM - 07:00 PM</td>
                <td>25-02-2026</td>
                <td>--</td>
                <td>--</td>
                <td>
                  <button className="shift-edit" onClick={() => setShowEdit(true)}>✎</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="manage-shifts-filters">
            <div className="leave-approvals-dropdown">
              <button
                className="leave-approvals-select leave-approvals-select-btn"
                type="button"
                onClick={() => { setShiftOpen(false); setEmpOpen((o) => !o); }}
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
            <div className="leave-approvals-dropdown">
              <button
                className="leave-approvals-select leave-approvals-select-btn"
                type="button"
                onClick={() => { setEmpOpen(false); setShiftOpen((o) => !o); }}
              >
                Select Shift
                <span className="leave-approvals-caret">⌄</span>
              </button>
              {shiftOpen && (
                <div className="leave-approvals-dropdown-panel leave-approvals-dropdown-right">
                  <div className="leave-approvals-option active">Select Shift</div>
                  <div className="leave-approvals-option">General</div>
                </div>
              )}
            </div>
            <div className="leave-approvals-month">
              <button className="leave-nav-btn">‹</button>
              <span>Feb 2026</span>
              <button className="leave-nav-btn">›</button>
            </div>
            <button className="leave-adjustment-filter" onClick={() => setShowFilter(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5h18M6 12h12M10 19h4" />
              </svg>
              Filter
            </button>
            <button className="leave-request-btn" onClick={() => setShowAssign(true)}>
              + Assign Shift
            </button>
          </div>

          <div className="leave-table-wrap">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>SR No.</th>
                  <th>Employee</th>
                  <th>Branch</th>
                  <th>Department</th>
                  <th>Shift Name</th>
                  <th>Shift Timing</th>
                  <th>Shift From</th>
                  <th>Shift To</th>
                  <th>Created By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={10} className="leave-empty">No records found</td>
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
                <button>«</button>
                <button>‹</button>
                <button>›</button>
                <button>»</button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="att-footer">©2024 otuindia.com</div>

      {showAdd && (
        <Modal
          title="Add Shift"
          onClose={() => setShowAdd(false)}
          className="leave-modal"
          showClose
          actions={<button className="leave-send-btn" onClick={() => setShowAdd(false)}>Save</button>}
        >
          <div className="leave-modal-header-wave" />
          <div className="leave-modal-body">
            <label className="leave-label">Shift Name*</label>
            <input className="leave-input" placeholder="Enter Shift Name" />

            <div className="leave-row">
              <div className="leave-col">
                <label className="leave-label">Shift Letter*</label>
                <input className="leave-input" placeholder="Enter a letter" />
                <div className="leave-hint">For e.g.: “M” for Morning Shift</div>
              </div>
              <div className="leave-col">
                <label className="leave-label">Colour</label>
                <div className="shift-color-row">
                  <div className="shift-color-chip" style={{ background: color }} />
                  <div className="shift-color-grid">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        className={`shift-color ${color === c ? "active" : ""}`}
                        style={{ background: c }}
                        onClick={() => setColor(c)}
                        type="button"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="leave-row">
              <div className="leave-col">
                <label className="leave-label">Shift Starts at*</label>
                <div className="shift-time">
                  <input className="leave-input" placeholder="HH" />
                  <span>:</span>
                  <input className="leave-input" placeholder="MM" />
                  <button className="shift-meridian active">AM</button>
                </div>
              </div>
              <div className="leave-col">
                <label className="leave-label">Shift Ends at*</label>
                <div className="shift-time">
                  <input className="leave-input" placeholder="HH" />
                  <span>:</span>
                  <input className="leave-input" placeholder="MM" />
                  <button className="shift-meridian active">AM</button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showEdit && (
        <Modal
          title="Edit Shift"
          onClose={() => setShowEdit(false)}
          className="leave-modal"
          showClose
          actions={<button className="leave-send-btn" onClick={() => setShowEdit(false)}>Update</button>}
        >
          <div className="leave-modal-header-wave" />
          <div className="leave-modal-body">
            <label className="leave-label">Shift Name*</label>
            <input className="leave-input" value="General" readOnly />

            <div className="leave-row">
              <div className="leave-col">
                <label className="leave-label">Shift Letter*</label>
                <input className="leave-input" value="G" readOnly />
                <div className="leave-hint">For e.g.: “M” for Morning Shift</div>
              </div>
              <div className="leave-col">
                <label className="leave-label">Colour</label>
                <div className="shift-color-row">
                  <div className="shift-color-chip" style={{ background: "#dbeafe" }}>G</div>
                  <div className="shift-color-grid">
                    {COLORS.map((c) => (
                      <button key={c} className="shift-color" style={{ background: c }} type="button" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="leave-row">
              <div className="leave-col">
                <label className="leave-label">Shift Starts at*</label>
                <div className="shift-time">
                  <input className="leave-input" value="10" readOnly />
                  <span>:</span>
                  <input className="leave-input" value="00" readOnly />
                  <button className="shift-meridian">AM</button>
                </div>
              </div>
              <div className="leave-col">
                <label className="leave-label">Shift Ends at*</label>
                <div className="shift-time">
                  <input className="leave-input" value="07" readOnly />
                  <span>:</span>
                  <input className="leave-input" value="00" readOnly />
                  <button className="shift-meridian active">PM</button>
                </div>
              </div>
            </div>

            <div className="shift-note">
              Check-in/check-out entries only within 10:00 AM – 7:00 PM will be considered as payable hours
            </div>
          </div>
        </Modal>
      )}

      {showAssign && (
        <Modal
          title="Assign Shift"
          onClose={() => setShowAssign(false)}
          className="leave-modal"
          showClose
          actions={<button className="leave-send-btn" onClick={() => setShowAssign(false)}>Save</button>}
        >
          <div className="leave-modal-header-wave" />
          <div className="leave-modal-body">
            <label className="leave-label">Shift Name*</label>
            <select className="leave-input">
              <option>Select Shift</option>
            </select>

            <div className="leave-row">
              <div className="leave-col">
                <label className="leave-label">Shift Starts Date*</label>
                <div className="leave-input with-icon">
                  <input type="date" />
                  <span className="leave-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="leave-col">
                <label className="leave-label">Shift End Date*</label>
                <div className="leave-input with-icon">
                  <input type="date" />
                  <span className="leave-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            <div className="leave-row">
              <div className="leave-col">
                <label className="leave-label">Shift Starts at</label>
                <div className="leave-input with-icon">
                  <input value="09:00 AM" readOnly />
                  <span className="leave-input-icon">🕘</span>
                </div>
              </div>
              <div className="leave-col">
                <label className="leave-label">Shift End at</label>
                <div className="leave-input with-icon">
                  <input value="06:00 PM" readOnly />
                  <span className="leave-input-icon">🕘</span>
                </div>
              </div>
            </div>

            <label className="leave-label">Branch</label>
            <select className="leave-input">
              <option>Select Branch</option>
            </select>

            <label className="leave-label">Department</label>
            <select className="leave-input">
              <option>Select Department</option>
            </select>

            <label className="leave-label">Select Employees</label>
            <div className="leave-input select-emp">
              ✨ Click to Select Employees
            </div>
          </div>
        </Modal>
      )}

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
    </div>
  );
}

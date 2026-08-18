import { useState } from "react";
import Modal from "../components/Modal";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SetWeeklyOff() {
  const [tab, setTab] = useState("weekly");
  const [assignedTab, setAssignedTab] = useState("standard");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showSet, setShowSet] = useState(false);

  const navMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    setMonth(next.toISOString().slice(0, 7));
  };

  return (
    <div className="weekly-off">
      <div className="weekly-off-header">
        <h1 className="weekly-off-title">Weekly Offs</h1>
        <button className="leave-request-btn" onClick={() => setShowSet(true)}>
          + Set Weekly Off
        </button>
      </div>

      <div className="manage-shifts-tabs">
        <button
          className={`leave-plans-tab ${tab === "weekly" ? "active" : ""}`}
          onClick={() => setTab("weekly")}
        >
          Weekly Off
        </button>
        <button
          className={`leave-plans-tab ${tab === "assigned" ? "active" : ""}`}
          onClick={() => setTab("assigned")}
        >
          Assigned Weekly off
        </button>
      </div>

      {tab === "weekly" ? (
        <div className="leave-table-wrap">
          <table className="leave-table">
            <thead>
              <tr>
                <th>SR No.</th>
                <th>Weekly off name</th>
                <th>Work week</th>
                <th>Week Off</th>
                <th>Created By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Organization Default</td>
                <td>--</td>
                <td>All Thu, All Tue, All Sat, All Wed, All Fri, All Sun, All Mon</td>
                <td>
                  Guguloth Sateesh
                  <div className="weekly-off-sub">25 Feb 2026</div>
                </td>
                <td>
                  <button className="shift-edit">🗑</button>
                </td>
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
            <div className="leave-pagination">Showing 1 to 1 of 1 entries</div>
            <div className="leave-pager">
              <button>‹</button>
              <button className="active">1</button>
              <button>›</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="weekly-off-assign-header">
            <h2>Assign Weekly Off</h2>
            <div className="leave-approvals-month">
              <button className="leave-nav-btn" onClick={() => navMonth(-1)}>‹</button>
              <span>{new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" })}</span>
              <button className="leave-nav-btn" onClick={() => navMonth(1)}>›</button>
            </div>
            <button className="leave-request-btn">+ Assign Weekly Off</button>
          </div>

          <div className="weekly-off-assign-filters">
            <button className="leave-adjustment-filter">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5h18M6 12h12M10 19h4" />
              </svg>
            </button>
            <select className="leave-approvals-select">
              <option>All Employees</option>
            </select>
            <select className="leave-approvals-select">
              <option>Branch</option>
              <option>developer</option>
            </select>
            <select className="leave-approvals-select">
              <option>Department</option>
              <option>IT</option>
            </select>
            <div className="weekly-off-pill-tabs">
              <button className={`weekly-off-pill ${assignedTab === "standard" ? "active" : ""}`} onClick={() => setAssignedTab("standard")}>
                Standard Weekly Off
              </button>
              <button className={`weekly-off-pill ${assignedTab === "employee" ? "active" : ""}`} onClick={() => setAssignedTab("employee")}>
                Employee-Specific Weekly Off
              </button>
            </div>
          </div>

          <div className="leave-table-wrap">
            <table className="leave-table">
              <thead>
                {assignedTab === "standard" ? (
                  <tr>
                    <th>SR No.</th>
                    <th>Weekly Off Name</th>
                    <th>Effective From</th>
                    <th>Branch</th>
                    <th>Department</th>
                    <th>Work Week</th>
                    <th>Week Off</th>
                    <th>Created By</th>
                    <th>Action</th>
                  </tr>
                ) : (
                  <tr>
                    <th>SR No.</th>
                    <th>Employee Name</th>
                    <th>Weekly Off Name</th>
                    <th>Effective From</th>
                    <th>Branch</th>
                    <th>Department</th>
                    <th>Work Week</th>
                    <th>Week Off</th>
                    <th>Created By</th>
                    <th>Action</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {assignedTab === "standard" ? (
                  <tr>
                    <td>1</td>
                    <td>Organization Default</td>
                    <td>01-02-2026</td>
                    <td>--</td>
                    <td>--</td>
                    <td>--</td>
                    <td>All Thu, All Tue, All Sat, All Wed, All Fri, All Sun, All Mon</td>
                    <td>
                      Guguloth Sateesh
                      <div className="weekly-off-sub">25 Feb 2026</div>
                    </td>
                    <td><button className="shift-edit">🗑</button></td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={10} className="leave-empty">No records found</td>
                  </tr>
                )}
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
              <div className="leave-pagination">Showing 1 to 1 of 1 entries</div>
              <div className="leave-pager">
                <button>‹</button>
                <button className="active">1</button>
                <button>›</button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="att-footer">©2024 otuindia.com</div>

      {showSet && (
        <Modal
          title="Weekly Offs"
          onClose={() => setShowSet(false)}
          className="weeklyoff-modal"
          showClose
          actions={
            <>
              <button className="weeklyoff-cancel" onClick={() => setShowSet(false)}>Cancel</button>
              <button className="leave-send-btn" onClick={() => setShowSet(false)}>Save</button>
            </>
          }
        >
          <div className="weeklyoff-body">
            <label className="leave-label">Weekly Off Name*</label>
            <input className="leave-input" placeholder="Enter Weekoff name" />

            <div className="weeklyoff-grid">
              <div className="weeklyoff-row weeklyoff-head">
                <span>Days</span>
                <span>All</span>
                <span>1st</span>
                <span>2nd</span>
                <span>3rd</span>
                <span>4th</span>
                <span>5th</span>
              </div>
              {DAYS.map((day) => (
                <div key={day} className="weeklyoff-row">
                  <span>{day}</span>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className="weeklyoff-check" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

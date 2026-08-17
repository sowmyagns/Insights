import { useState } from "react";

export default function AttendanceApproval() {
  const [viewMode, setViewMode] = useState("week");

  return (
    <div className="att-approval">
      <div className="att-approval-header">
        <div>
          <h1 className="att-approval-title">Approvals</h1>
        </div>
        <button className="att-approval-action">Click Here To Approve</button>
      </div>

      <div className="att-approval-filters">
        <div className="att-approval-filter">
          <select>
            <option>All Employees</option>
          </select>
        </div>
        <div className="att-approval-filter small">
          <select defaultValue="Status" className="att-approval-status">
            <option disabled>Status</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
        <div className="att-approval-range">
          <button className="att-approval-nav">‹</button>
          <span>22 Feb 2026 - 28 Feb 2026</span>
          <button className="att-approval-nav">›</button>
        </div>
        <div className="att-approval-view">
          <button
            className={`att-approval-view-btn ${viewMode === "week" ? "active" : ""}`}
            onClick={() => setViewMode("week")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Week View
          </button>
          <button
            className={`att-approval-view-btn ${viewMode === "month" ? "active" : ""}`}
            onClick={() => setViewMode("month")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Month View
          </button>
        </div>
      </div>

      <div className="att-approval-table">
        <table>
          <thead>
            <tr className="att-approval-group">
              <th rowSpan="2" className="check-col">
                <input type="checkbox" />
              </th>
              <th rowSpan="2">SR No.</th>
              <th rowSpan="2">Employee</th>
              <th rowSpan="2">Attendance day</th>
              <th colSpan="2">Check-in</th>
              <th colSpan="2">Check-out</th>
              <th colSpan="2">Hour(s)</th>
              <th colSpan="2">Status</th>
              <th rowSpan="2">Reason</th>
              <th rowSpan="2">Created By</th>
              <th rowSpan="2">Approval Status</th>
            </tr>
            <tr className="att-approval-subhead">
              <th>Old</th>
              <th>New</th>
              <th>Old</th>
              <th>New</th>
              <th>Old</th>
              <th>New</th>
              <th>Old</th>
              <th>New</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="15" className="att-approval-empty">No records found</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="att-footer">©2024 otuindia.com</div>
    </div>
  );
}

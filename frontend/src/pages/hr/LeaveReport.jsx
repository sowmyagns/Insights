import { useState } from "react";
import Modal from "../components/Modal";

export default function LeaveReport() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showModal, setShowModal] = useState(false);

  const navMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    setMonth(next.toISOString().slice(0, 7));
  };

  return (
    <div className="attendance-report">
      <div className="attendance-report-header">
        <h1 className="attendance-report-title">Leave Report</h1>
        <div className="attendance-report-month">
          <button className="leave-nav-btn" onClick={() => navMonth(-1)}>‹</button>
          <span>{new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" })}</span>
          <button className="leave-nav-btn" onClick={() => navMonth(1)}>›</button>
        </div>
        <button className="attendance-report-btn" onClick={() => setShowModal(true)}>+ Generate Report</button>
      </div>

      <div className="leave-table-wrap">
        <table className="leave-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Duration</th>
              <th>Branch</th>
              <th>Department</th>
              <th>Employment Type</th>
              <th>Generated On</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="leave-empty">Showing 0 to 0 of 0 entries</td>
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

      <div className="att-footer">©2024 otuindia.com</div>

      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          className="attendance-report-modal"
          showClose
          title="Generate Leave Report"
        >
          <div className="employee-modal-wave" />
          <div className="attendance-report-body">
            <div className="attendance-report-row">
              <div>
                <label className="leave-label">From Date*</label>
                <div className="leave-input with-icon">
                  <input type="date" placeholder="Select Date" />
                  <span className="leave-input-icon">📅</span>
                </div>
              </div>
              <div>
                <label className="leave-label">To Date*</label>
                <div className="leave-input with-icon">
                  <input type="date" placeholder="Select Date" />
                  <span className="leave-input-icon">📅</span>
                </div>
              </div>
            </div>
            <label className="leave-label">Branch</label>
            <select className="leave-input">
              <option>All Branch</option>
            </select>
            <label className="leave-label">Department</label>
            <select className="leave-input">
              <option>All Department</option>
            </select>
            <label className="leave-label">Employment Type</label>
            <select className="leave-input">
              <option>All Employment Type</option>
            </select>
            <label className="leave-label">Employee List</label>
            <select className="leave-input">
              <option>Select Employees</option>
            </select>
            <div className="attendance-report-actions">
              <button className="employee-save-btn" onClick={() => setShowModal(false)}>Generate Report</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

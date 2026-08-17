import { useState } from "react";
import Modal from "../components/Modal";

export default function EmployeeOnboarding() {
  const [showFilter, setShowFilter] = useState(false);
  const [view, setView] = useState("list");
  const [employee, setEmployee] = useState("");

  if (view === "bulk") {
    return (
      <div className="onboarding-page">
        <div className="onboarding-bulk-header">
          <button className="onboarding-back" onClick={() => setView("list")}>
            ‹ Bulk Upload
          </button>
          <button className="onboarding-template-btn">Excel Template</button>
        </div>

        <div className="onboarding-stepper">
          <div className="onboarding-step active">
            <span className="onboarding-step-dot" />
            <span className="onboarding-step-label">Step 1</span>
          </div>
          <div className="onboarding-step-line" />
          <div className="onboarding-step">
            <span className="onboarding-step-dot" />
            <span className="onboarding-step-label">Step 2</span>
          </div>
          <div className="onboarding-step-line" />
          <div className="onboarding-step">
            <span className="onboarding-step-dot" />
            <span className="onboarding-step-label">Step 3</span>
          </div>
        </div>

        <div className="onboarding-upload-card">
          <div className="onboarding-upload-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8M8 17h8M8 9h2" />
            </svg>
          </div>
          <div className="onboarding-upload-text">Upload excel with users data here</div>
          <button className="onboarding-upload-btn">Upload</button>
        </div>

        <div className="att-footer">©2024 otuindia.com</div>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-header">
        <h1 className="onboarding-title">Employee Onboarding</h1>
        <p className="onboarding-subtitle">
          This screen is used to onboard employees in bulk or individually. Once a weekly off is set, the employee will be successfully onboarded and moved to the &quot;All Employees&quot; screen.
        </p>
      </div>

      <div className="onboarding-toolbar">
        <select
          className="onboarding-select"
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
        >
          <option value="">Select employee</option>
        </select>

        <div className="onboarding-actions">
          <button className="onboarding-filter-btn" onClick={() => setShowFilter(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5h18M6 12h12M10 19h4" />
            </svg>
            Filter
          </button>
          <button className="onboarding-ghost-btn" disabled>
            Assign Weekly Off
          </button>
          <button className="onboarding-primary-btn" onClick={() => setView("bulk")}>
            Bulk Upload
          </button>
        </div>
      </div>

      <div className="leave-table-wrap">
        <table className="leave-table">
          <thead>
            <tr>
              <th>SR No.</th>
              <th>Employee name</th>
              <th>Designation</th>
              <th>Reporting To</th>
              <th>Branch</th>
              <th>Department</th>
              <th>Date of Joining</th>
              <th>Created By</th>
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
            <button>«</button>
            <button>‹</button>
            <button>›</button>
            <button>»</button>
          </div>
        </div>
      </div>

      <div className="att-footer">©2024 otuindia.com</div>

      {showFilter && (
        <Modal
          title="Filter"
          onClose={() => setShowFilter(false)}
          className="leave-modal leave-filter-modal"
          showClose
          actions={<button className="leave-send-btn" onClick={() => setShowFilter(false)}>Apply</button>}
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

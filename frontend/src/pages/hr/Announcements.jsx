import { useState } from "react";
import Modal from "../components/Modal";

export default function Announcements() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showAdd, setShowAdd] = useState(false);

  const navMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    setMonth(next.toISOString().slice(0, 7));
  };

  return (
    <div className="announcements-page">
      <div className="announcements-header">
        <h1 className="announcements-title">Announcements</h1>
        <div className="announcements-month">
          <button className="leave-nav-btn" onClick={() => navMonth(-1)}>‹</button>
          <span>{new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" })}</span>
          <button className="leave-nav-btn" onClick={() => navMonth(1)}>›</button>
        </div>
        <button className="announcements-add" onClick={() => setShowAdd(true)}>+ Add Announcement</button>
      </div>

      <div className="leave-table-wrap">
        <table className="leave-table">
          <thead>
            <tr>
              <th>SR No.</th>
              <th>Announcement Title</th>
              <th>Date</th>
              <th>Created By</th>
              <th>Updated By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="leave-empty">No records found</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="att-footer">©2024 otuindia.com</div>

      {showAdd && (
        <Modal
          onClose={() => setShowAdd(false)}
          className="announcements-modal"
          showClose
          title="Add Announcement"
        >
          <div className="employee-modal-wave" />
          <div className="announcements-body">
            <label className="leave-label">Title*</label>
            <input className="leave-input" placeholder="Enter Title" />

            <label className="leave-label">Details*</label>
            <div className="announcements-editor">
              <div className="announcements-toolbar">
                <button>B</button>
                <button>I</button>
                <button>U</button>
                <button>S</button>
                <button>1.</button>
                <button>•</button>
              </div>
              <textarea className="announcements-textarea" placeholder="Insert text here ..." />
            </div>

            <div className="announcements-attach">
              <div className="announcements-attach-title">Attachment</div>
              <button className="announcements-attach-btn">
                <span className="announcements-attach-plus">+</span>
                Upload Document
              </button>
            </div>

            <label className="leave-label">Publish Date*</label>
            <div className="leave-input with-icon">
              <input type="date" />
              <span className="leave-input-icon">📅</span>
            </div>

            <div className="announcements-actions">
              <button className="announcements-preview">Preview</button>
              <button className="employee-save-btn">Publish Now</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

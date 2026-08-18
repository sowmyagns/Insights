import { useState } from "react";
import Modal from "../components/Modal";

export default function Announcements() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", details: "", publishDate: "" });

  const navMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(y, m - 1 + delta, 1).toISOString().slice(0, 7));
  };

  const monthLabel = new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" });

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Announcements</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Publish and manage company announcements.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(-1)}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", minWidth: 90, textAlign: "center" }}>{monthLabel}</span>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(1)}>›</button>
          <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowAdd(true)}>+ Add Announcement</button>
        </div>
      </div>

      <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ui-table-wrap" style={{ border: "none" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-thead)" }}>
                {["SR No.", "Announcement Title", "Date", "Created By", "Updated By", "Action"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={6} className="ui-empty">No records found</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Announcement" onClose={() => setShowAdd(false)} showClose
          actions={<button className="ui-btn-primary" onClick={() => setShowAdd(false)}>Publish Now</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="ui-label">Title *</label>
              <input className="ui-input" placeholder="Enter title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="ui-label">Details *</label>
              <div style={{ border: "1px solid var(--color-border-soft)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 4, padding: "6px 10px", background: "var(--color-surface-muted)", borderBottom: "1px solid var(--color-border-muted)" }}>
                  {["B", "I", "U", "S", "1.", "•"].map((b) => (
                    <button key={b} style={{ width: 28, height: 28, border: "1px solid var(--color-border)", borderRadius: 6, background: "var(--color-surface)", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--color-text-secondary)" }}>{b}</button>
                  ))}
                </div>
                <textarea className="ui-textarea" placeholder="Insert text here..." rows={4} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} style={{ border: "none", borderRadius: 0 }} />
              </div>
            </div>
            <div>
              <label className="ui-label">Publish Date *</label>
              <input className="ui-input" type="date" value={form.publishDate} onChange={(e) => setForm({ ...form, publishDate: e.target.value })} />
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

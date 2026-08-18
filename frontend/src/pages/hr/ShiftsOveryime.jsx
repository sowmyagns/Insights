import { useState, useEffect } from "react";
import { api } from "../api";
import { fmtDate } from "../utils/format";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Field from "../components/Field";

export default function ShiftsOvertime({ employees, apiMode, initialTab = "Shifts" }) {
  const [shifts, setShifts] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [tab, setTab] = useState(initialTab);
  const [showShift, setShowShift] = useState(false);
  const [showOT, setShowOT] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [shiftForm, setShiftForm] = useState({ name: "General", start_time: "09:00", end_time: "18:00", is_night_shift: 0 });
  const [otForm, setOtForm] = useState({ employee_id: "", date: new Date().toISOString().slice(0, 10), hours: "", notes: "" });

  useEffect(() => {
    if (apiMode) api.shifts.list().then(setShifts).catch(() => setShifts([]));
  }, [apiMode]);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  useEffect(() => {
    if (apiMode) api.overtime.list({ month }).then(setOvertime).catch(() => setOvertime([]));
  }, [apiMode, month]);

  const addShift = async () => {
    if (!shiftForm.name) return;
    if (apiMode) {
      await api.shifts.create({ name: shiftForm.name, start_time: shiftForm.start_time, end_time: shiftForm.end_time, is_night_shift: Number(shiftForm.is_night_shift) });
      api.shifts.list().then(setShifts);
      setShowShift(false);
      setShiftForm({ name: "General", start_time: "09:00", end_time: "18:00", is_night_shift: 0 });
    }
  };

  const addOvertime = async () => {
    if (!otForm.employee_id || !otForm.hours || !otForm.date) return;
    if (apiMode) {
      await api.overtime.create({ employee_id: Number(otForm.employee_id), date: otForm.date, hours: Number(otForm.hours), notes: otForm.notes || null });
      api.overtime.list({ month }).then(setOvertime);
      setShowOT(false);
      setOtForm({ employee_id: "", date: new Date().toISOString().slice(0, 10), hours: "", notes: "" });
    }
  };

  const approveOT = async (id, status) => {
    await api.overtime.approve(id, status);
    api.overtime.list({ month }).then(setOvertime);
  };

  const empMap = Object.fromEntries((employees || []).map((e) => [e.id, e.name]));

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Shifts & Overtime</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Manage work shifts and overtime records.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid var(--color-border)", paddingBottom: 0 }}>
        {["Shifts", "Overtime"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, border: "none", background: "transparent", cursor: "pointer", color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2, transition: "all .15s" }}>{t}</button>
        ))}
      </div>

      {tab === "Shifts" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>24-hour cycle support</span>
            <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowShift(true)}>+ Add Shift</button>
          </div>
          <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="ui-table-wrap" style={{ border: "none" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--color-surface-thead)" }}>
                    {["Shift Name","Start Time","End Time","Night Shift"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                      <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{s.name}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13 }}>{s.start_time}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13 }}>{s.end_time}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span className={`ui-badge ${s.is_night_shift ? "ui-badge-warning" : "ui-badge-neutral"}`}>{s.is_night_shift ? "Yes" : "No"}</span>
                      </td>
                    </tr>
                  ))}
                  {!shifts.length && <tr><td colSpan={4} className="ui-empty">No shifts configured</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "Overtime" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select className="ui-select" style={{ width: 160, minHeight: 36, fontSize: 13 }}>
                <option>All Employees</option>
              </select>
              <select className="ui-select" style={{ width: 130, minHeight: 36, fontSize: 13 }}>
                <option>All Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
              <input className="ui-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 150, minHeight: 36, fontSize: 13 }} />
            </div>
            <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowOT(true)}>+ Overtime Request</button>
          </div>

          <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="ui-table-wrap" style={{ border: "none" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "var(--color-surface-thead)" }}>
                    {["Employee","Date","Total Hours","Status","Action"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overtime.map((o) => (
                    <tr key={o.id} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{empMap[o.employee_id] || o.employee_id}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{fmtDate(o.date)}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{o.hours} Hr</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span className={`ui-badge ui-badge-${(o.status || "pending").toLowerCase() === "approved" ? "success" : (o.status || "").toLowerCase() === "rejected" ? "danger" : "warning"}`}>{o.status || "Pending"}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="ui-btn-success ui-btn--sm" onClick={() => approveOT(o.id, "approved")}>✓</button>
                          <button className="ui-btn-danger ui-btn--sm" onClick={() => approveOT(o.id, "rejected")}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!overtime.length && <tr><td colSpan={5} className="ui-empty">No overtime records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showShift && (
        <Modal title="Add Shift" onClose={() => setShowShift(false)}
          actions={<><button className="ui-btn-secondary ui-btn--sm" onClick={() => setShowShift(false)}>Cancel</button><button className="ui-btn-primary ui-btn--sm" onClick={addShift}>Add</button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label className="ui-label">Name</label><input className="ui-input" value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label className="ui-label">Start (24h)</label><input className="ui-input" type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })} /></div>
              <div><label className="ui-label">End (24h)</label><input className="ui-input" type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })} /></div>
            </div>
            <div>
              <label className="ui-label">Night Shift</label>
              <select className="ui-select" value={shiftForm.is_night_shift} onChange={(e) => setShiftForm({ ...shiftForm, is_night_shift: e.target.value })}>
                <option value={0}>No</option><option value={1}>Yes</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {showOT && (
        <Modal title="Log Overtime" onClose={() => setShowOT(false)}
          actions={<><button className="ui-btn-secondary ui-btn--sm" onClick={() => setShowOT(false)}>Cancel</button><button className="ui-btn-primary ui-btn--sm" onClick={addOvertime}>Submit</button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="ui-label">Employee</label>
              <select className="ui-select" value={otForm.employee_id} onChange={(e) => setOtForm({ ...otForm, employee_id: e.target.value })}>
                <option value="">Select...</option>
                {(employees || []).map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label className="ui-label">Date</label><input className="ui-input" type="date" value={otForm.date} onChange={(e) => setOtForm({ ...otForm, date: e.target.value })} /></div>
              <div><label className="ui-label">Hours</label><input className="ui-input" type="number" step="0.5" value={otForm.hours} onChange={(e) => setOtForm({ ...otForm, hours: e.target.value })} /></div>
            </div>
            <div><label className="ui-label">Notes</label><textarea className="ui-textarea" value={otForm.notes} onChange={(e) => setOtForm({ ...otForm, notes: e.target.value })} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, Trash2, X } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { BRANCHES } from "../../data/departmentsMasterData";

const COLORS = ["#dbeafe","#bfdbfe","#93c5fd","#60a5fa","#3b82f6","#a7f3d0","#86efac","#fde68a","#fecaca","#fca5a5"];

function SoftField({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-[#6b6b76]">
        {label}{required ? <span className="text-[#e11d48]"> *</span> : null}
      </span>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#9a9aa5]">{hint}</p>}
    </label>
  );
}

function Modal({ title, onClose, children, footer }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[520px] rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececf0] px-6 py-4">
          <h3 className="text-[17px] font-bold text-[#1a1a1f]">{title}</h3>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[#6b6b76] hover:bg-[#f5f5f7] transition-colors" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 flex-1">{children}</div>
        {footer && <div className="shrink-0 border-t border-[#ececf0] px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

const PAGE_SIZES = [20, 50, 100];

export default function ManageShifts() {
  const [tab, setTab] = useState("add");
  const [showAdd, setShowAdd] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentPageSize, setAssignmentPageSize] = useState(25);
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", letter: "", startH: "", startM: "", startMer: "AM", endH: "", endM: "", endMer: "PM" });
  const [assignForm, setAssignForm] = useState({ employee_id: "", shift_id: "", branch: "", department: "", shift_from: "", shift_to: "" });

  const branchOptions = [...new Set([...BRANCHES, ...employees.map((e) => e.branch).filter(Boolean)])].sort();
  const departmentOptions = [...new Set([...departments.map((d) => d.name).filter(Boolean), ...employees.map((e) => e.department).filter(Boolean)])].sort();

  const filteredAssignments = assignments.filter((a) => {
    const emp = employees.find((e) => String(e.id) === String(a.employee_id));
    const shift = shifts.find((s) => String(s.id) === String(a.shift_id));
    const q = assignmentQuery.trim().toLowerCase();
    if (!q) return true;
    return [emp?.full_name, emp?.name, a.branch, a.department, a.shift_name, shift?.name, a.shift_from, a.shift_to]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  const assignmentPageCount = Math.max(1, Math.ceil(filteredAssignments.length / assignmentPageSize));
  const assignmentRows = filteredAssignments.slice((assignmentPage - 1) * assignmentPageSize, assignmentPage * assignmentPageSize);
  const assignmentFrom = filteredAssignments.length === 0 ? 0 : (assignmentPage - 1) * assignmentPageSize + 1;
  const assignmentTo = Math.min(assignmentPage * assignmentPageSize, filteredAssignments.length);

  const load = useCallback(async () => {
    try {
      const [shiftRes, empRes, assignRes] = await Promise.all([
        axiosInstance.get("/hr/shifts", { skipGlobalError: true }),
        axiosInstance.get("/hr/employees", { skipGlobalError: true }),
        axiosInstance.get("/hr/shifts/assignments", { skipGlobalError: true }),
      ]);
      let deptData = [];
      try { const deptRes = await axiosInstance.get("/hr/departments", { skipGlobalError: true }); deptData = deptRes.data; } catch { /* ignore */ }
      setShifts(Array.isArray(shiftRes.data) ? shiftRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setAssignments(Array.isArray(assignRes.data) ? assignRes.data : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setError("");
    } catch (err) { setError(err?.response?.data?.detail || "Unable to load shift data."); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setAssignmentPage(1); }, [assignmentQuery, assignmentPageSize]);
  useEffect(() => { setAssignmentPage((p) => Math.min(p, assignmentPageCount)); }, [assignmentPageCount]);

  const saveShift = async () => {
    if (!form.name.trim() || !form.letter.trim() || !form.startH || !form.startM || !form.endH || !form.endM) {
      setError("Complete all required shift fields before saving."); return;
    }
    setSaving(true);
    try {
      await axiosInstance.post("/hr/shifts", {
        name: form.name.trim(), description: form.letter.trim(),
        start_time: `${form.startH}:${form.startM} ${form.startMer}`,
        end_time: `${form.endH}:${form.endM} ${form.endMer}`,
      }, { skipGlobalError: true });
      setShowAdd(false);
      setForm({ name: "", letter: "", startH: "", startM: "", startMer: "AM", endH: "", endM: "", endMer: "PM" });
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || `Unable to save shift (HTTP ${err?.response?.status || "?"}).`);
    } finally { setSaving(false); }
  };

  const saveAssignment = async () => {
    if (!assignForm.employee_id || !assignForm.shift_id || !assignForm.shift_from || !assignForm.shift_to) {
      setError("Select an employee, shift, and date range."); return;
    }
    const shift = shifts.find((s) => String(s.id) === String(assignForm.shift_id));
    setSaving(true);
    try {
      await axiosInstance.post("/hr/shifts/assignments", { ...assignForm, employee_id: Number(assignForm.employee_id), shift_id: Number(assignForm.shift_id), shift_name: shift?.name });
      setShowAssign(false);
      setAssignForm({ employee_id: "", shift_id: "", branch: "", department: "", shift_from: "", shift_to: "" });
      await load();
    } catch (err) { setError(err?.response?.data?.detail || "Unable to assign shift."); }
    finally { setSaving(false); }
  };

  const deleteShift = async (shift) => {
    if (!window.confirm(`Delete shift "${shift.name}"?`)) return;
    try { await axiosInstance.delete(`/hr/shifts/${shift.id}`, { skipGlobalError: true }); await load(); }
    catch (err) { setError(err?.response?.data?.detail || "Unable to delete shift."); }
  };

  const TimeInput = ({ label, hKey, mKey, merKey }) => (
    <SoftField label={label} required>
      <div className="flex items-center gap-2">
        <input className="ui-input w-14 text-center" placeholder="HH" maxLength={2} value={form[hKey]} onChange={(e) => setForm((f) => ({ ...f, [hKey]: e.target.value.replace(/\D/g, "") }))} />
        <span className="text-[16px] font-bold text-[#6b6b76]">:</span>
        <input className="ui-input w-14 text-center" placeholder="MM" maxLength={2} value={form[mKey]} onChange={(e) => setForm((f) => ({ ...f, [mKey]: e.target.value.replace(/\D/g, "") }))} />
        <div className="flex items-center gap-1">
          {["AM","PM"].map((mer) => (
            <button key={mer} type="button" onClick={() => setForm((f) => ({ ...f, [merKey]: mer }))}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all ${form[merKey] === mer ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[#e2e2e8] bg-white text-[#6b6b76] hover:border-[var(--color-primary)]"}`}>
              {mer}
            </button>
          ))}
        </div>
      </div>
    </SoftField>
  );

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">Manage Shifts</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Create and assign employee work shifts.</p>
          </div>
          <button onClick={() => { setError(""); setShowAdd(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Add Shift
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl bg-[var(--color-danger-soft)] px-4 py-3 text-[13px] text-[var(--color-danger)]">{error}</div>}

        <div className="rounded-xl border border-[#e4e4ea] bg-white shadow-sm">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-[#ececf0] px-5">
            {[{ id: "add", label: "Shifts" }, { id: "assigned", label: "Assigned Shifts" }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`border-b-2 px-4 py-3 text-[13px] font-semibold transition-all ${tab === t.id ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[#6b6b76] hover:text-[#1a1a1f]"}`}
                style={{ marginBottom: -1 }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "add" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                    {["SR No.", "Shift Name", "Shift Starts", "Shift Ends", "Created Date", "Action"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shifts.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No shifts found. Add your first shift.</td></tr>
                  ) : shifts.map((s, i) => (
                    <tr key={s.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                      <td className="px-4 py-3.5 text-[#9a9aa5]">{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-[#1d4ed8]" style={{ background: COLORS[i % COLORS.length] }}>
                            {s.name.slice(0, 1)}
                          </div>
                          <span className="font-semibold text-[#1a1a1f]">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{s.start_time || "—"}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{s.end_time || "—"}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{s.created_at ? String(s.created_at).slice(0, 10) : "—"}</td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => deleteShift(s)} className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada] transition-colors" title="Delete shift">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "assigned" && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 border-b border-[#f0f0f4] p-5">
                {[
                  { label: "Total Assignments", value: assignments.length, color: "#0e7490" },
                  { label: "Employees Assigned", value: new Set(assignments.map((a) => a.employee_id)).size, color: "#1d4ed8" },
                  { label: "Active Shifts", value: new Set(assignments.map((a) => a.shift_id)).size, color: "#854d0e" },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-[#e4e4ea] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b76]">{c.label}</p>
                    <p className="mt-1 text-[20px] font-bold tabular-nums" style={{ color: c.color }}>{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-3 border-b border-[#f0f0f4] px-5 py-4">
                <div className="relative min-w-[10rem] flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
                  <input value={assignmentQuery} onChange={(e) => setAssignmentQuery(e.target.value)} placeholder="Search assignments…"
                    className="w-full rounded-lg border border-[#e8e8ee] bg-[#f8f8fb] py-2 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[var(--color-primary)] focus:bg-white transition-colors" />
                </div>
                <button onClick={() => setShowAssign(true)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity">
                  <Plus className="h-4 w-4" /> Assign Shift
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[13px]" style={{ minWidth: 900 }}>
                  <thead>
                    <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                      {["SR No.", "Employee", "Branch", "Department", "Shift Name", "Shift Timing", "Shift From", "Shift To", "Created By", "Action"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentRows.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No assignments found.</td></tr>
                    ) : assignmentRows.map((r, i) => {
                      const assignedShift = shifts.find((s) => String(s.id) === String(r.shift_id));
                      const emp = employees.find((e) => String(e.id) === String(r.employee_id));
                      return (
                        <tr key={r.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                          <td className="px-4 py-3.5 text-[#9a9aa5]">{(assignmentPage - 1) * assignmentPageSize + i + 1}</td>
                          <td className="px-4 py-3.5 font-semibold text-[#1a1a1f]">{emp?.full_name || emp?.name || `Employee ${r.employee_id}`}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.branch || "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.department || "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.shift_name || assignedShift?.name || "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{assignedShift ? `${assignedShift.start_time || "—"} – ${assignedShift.end_time || "—"}` : "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{r.shift_from || "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{r.shift_to || "—"}</td>
                          <td className="px-4 py-3.5 text-[#4a4a55]">{r.created_by || "—"}</td>
                          <td className="px-4 py-3.5">
                            <button onClick={async () => { await axiosInstance.delete(`/hr/shifts/assignments/${r.id}`); load(); }}
                              className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada] transition-colors" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f4] px-5 py-3.5 text-[12px] text-[#6b6b76]">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select value={assignmentPageSize} onChange={(e) => setAssignmentPageSize(Number(e.target.value))} className="rounded-lg border border-[#e2e2e8] bg-white px-2 py-1 outline-none">
                    {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="text-[#9a9aa5]">{filteredAssignments.length === 0 ? "0–0 of 0" : `${assignmentFrom}–${assignmentTo} of ${filteredAssignments.length}`}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button disabled={assignmentPage <= 1} onClick={() => setAssignmentPage((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors">‹</button>
                  <button className="grid h-8 min-w-[32px] place-items-center rounded-lg border px-2 text-[13px] font-semibold text-white" style={{ background: "var(--color-primary)", borderColor: "var(--color-primary)" }}>{assignmentPage}</button>
                  <button disabled={assignmentPage >= assignmentPageCount} onClick={() => setAssignmentPage((p) => Math.min(assignmentPageCount, p + 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors">›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Shift Modal */}
      {showAdd && (
        <Modal
          title="Add Shift"
          onClose={() => setShowAdd(false)}
          footer={
            <div className="flex justify-end gap-3">
              <button className="ui-btn-secondary px-5 py-2.5 text-[14px]" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="ui-btn-primary px-5 py-2.5 text-[14px] disabled:opacity-60" disabled={saving} onClick={saveShift}>{saving ? "Saving…" : "Save Shift"}</button>
            </div>
          }
        >
          <div className="space-y-4">
            {error && <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</div>}
            <SoftField label="Shift Name" required>
              <input className="ui-input w-full" placeholder="e.g. Morning Shift" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </SoftField>
            <SoftField label="Shift Letter" required hint="Single letter identifier (e.g. M for Morning)">
              <input className="ui-input w-full" placeholder='e.g. "M"' maxLength={2} value={form.letter} onChange={(e) => setForm((f) => ({ ...f, letter: e.target.value }))} />
            </SoftField>
            <div className="grid grid-cols-2 gap-4">
              <TimeInput label="Shift Starts at" hKey="startH" mKey="startM" merKey="startMer" />
              <TimeInput label="Shift Ends at" hKey="endH" mKey="endM" merKey="endMer" />
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Shift Modal */}
      {showAssign && (
        <Modal
          title="Assign Shift"
          onClose={() => setShowAssign(false)}
          footer={
            <div className="flex justify-end gap-3">
              <button className="ui-btn-secondary px-5 py-2.5 text-[14px]" onClick={() => setShowAssign(false)}>Cancel</button>
              <button className="ui-btn-primary px-5 py-2.5 text-[14px] disabled:opacity-60" disabled={saving} onClick={saveAssignment}>{saving ? "Saving…" : "Assign"}</button>
            </div>
          }
        >
          <div className="space-y-4">
            {error && <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</div>}
            <SoftField label="Employee" required>
              <select className="ui-input w-full" value={assignForm.employee_id} onChange={(e) => setAssignForm((f) => ({ ...f, employee_id: e.target.value }))}>
                <option value="">Select Employee</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name || e.name}</option>)}
              </select>
            </SoftField>
            <SoftField label="Shift" required>
              <select className="ui-input w-full" value={assignForm.shift_id} onChange={(e) => setAssignForm((f) => ({ ...f, shift_id: e.target.value }))}>
                <option value="">Select Shift</option>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </SoftField>
            <div className="grid grid-cols-2 gap-4">
              <SoftField label="Start Date" required>
                <input className="ui-input w-full" type="date" value={assignForm.shift_from} onChange={(e) => setAssignForm((f) => ({ ...f, shift_from: e.target.value }))} />
              </SoftField>
              <SoftField label="End Date" required>
                <input className="ui-input w-full" type="date" value={assignForm.shift_to} onChange={(e) => setAssignForm((f) => ({ ...f, shift_to: e.target.value }))} />
              </SoftField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SoftField label="Branch">
                <select className="ui-input w-full" value={assignForm.branch} onChange={(e) => setAssignForm((f) => ({ ...f, branch: e.target.value }))}>
                  <option value="">Select Branch</option>
                  {branchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </SoftField>
              <SoftField label="Department">
                <select className="ui-input w-full" value={assignForm.department} onChange={(e) => setAssignForm((f) => ({ ...f, department: e.target.value }))}>
                  <option value="">Select Department</option>
                  {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </SoftField>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

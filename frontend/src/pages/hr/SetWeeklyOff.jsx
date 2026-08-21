import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PAGE_SIZES = [20, 50, 100];

function SoftField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-[#6b6b76]">
        {label}{required ? <span className="text-[#e11d48]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function ModalShell({ title, onClose, children, footer }) {
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[560px] rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]" onMouseDown={(e) => e.stopPropagation()}>
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

function Pagination({ total, page, pageSize, setPage, setPageSize, from, to }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f4] px-5 py-3.5 text-[12px] text-[#6b6b76]">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-lg border border-[#e2e2e8] bg-white px-2 py-1 outline-none">
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-[#9a9aa5]">{total === 0 ? "0–0 of 0" : `${from}–${to} of ${total}`}</span>
      </div>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors">‹</button>
        <button className="grid h-8 min-w-[32px] place-items-center rounded-lg border px-2 text-[13px] font-semibold text-white" style={{ background: "var(--color-primary)", borderColor: "var(--color-primary)" }}>{page}</button>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors">›</button>
      </div>
    </div>
  );
}

export default function SetWeeklyOff() {
  const [tab, setTab] = useState("weekly");
  const [assignedTab, setAssignedTab] = useState("standard");
  const [showSet, setShowSet] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [weekOffName, setWeekOffName] = useState("");
  const [assignForm, setAssignForm] = useState({ employee: "", weeklyOff: "", effectiveFrom: "", branch: "", department: "", workWeek: "Monday - Friday", weekOff: "" });
  const [selected, setSelected] = useState({});
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignedRecords, setAssignedRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedPageSize, setAssignedPageSize] = useState(20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [woRes, empRes] = await Promise.all([
        axiosInstance.get("/hr/weekly-offs", { skipGlobalError: true }),
        axiosInstance.get("/hr/employees", { skipGlobalError: true }),
      ]);
      setRecords(Array.isArray(woRes.data) ? woRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      const assignmentsRes = await axiosInstance.get("/hr/weekly-off-assignments", { skipGlobalError: true });
      setAssignedRecords(Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []);
    } catch (err) { setError(err?.response?.data?.detail || "Unable to load weekly offs."); }
  };

  useEffect(() => { load(); }, []);

  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const rows = records.slice((page - 1) * pageSize, page * pageSize);
  const from = records.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, records.length);

  const assignedTotalPages = Math.max(1, Math.ceil(assignedRecords.length / assignedPageSize));
  const assignedRows = assignedRecords.slice((assignedPage - 1) * assignedPageSize, assignedPage * assignedPageSize);
  const assignedFrom = assignedRecords.length === 0 ? 0 : (assignedPage - 1) * assignedPageSize + 1;
  const assignedTo = Math.min(assignedPage * assignedPageSize, assignedRecords.length);

  const saveWeeklyOff = async () => {
    if (!weekOffName.trim()) { setError("Weekly off name is required."); return; }
    setSaving(true);
    try {
      await axiosInstance.post("/hr/weekly-offs", { name: weekOffName.trim(), config: selected });
      setShowSet(false); setWeekOffName(""); setSelected({}); setError(""); await load();
    } catch (err) { setError(err?.response?.data?.detail || "Unable to save weekly off."); }
    finally { setSaving(false); }
  };

  const saveAssignment = async () => {
    if (!assignForm.employee || !assignForm.weeklyOff || !assignForm.effectiveFrom || !assignForm.weekOff) {
      setError("Complete Employee, Weekly Off, Effective From, and Week Off."); return;
    }
    setSaving(true);
    try {
      await axiosInstance.post("/hr/weekly-off-assignments", {
        employee_id: Number(assignForm.employee),
        weekly_off_id: Number(records.find((r) => r.name === assignForm.weeklyOff)?.id),
        effective_from: assignForm.effectiveFrom,
        branch: assignForm.branch,
        department: assignForm.department,
        work_week: assignForm.workWeek,
        week_off: assignForm.weekOff,
      });
      setAssignForm({ employee: "", weeklyOff: "", effectiveFrom: "", branch: "", department: "", workWeek: "Monday - Friday", weekOff: "" });
      setShowAssign(false); setError(""); await load();
    } catch (err) { setError(err?.response?.data?.detail || "Unable to save weekly off assignment."); }
    finally { setSaving(false); }
  };

  const toggleCell = (day, col) => setSelected((prev) => ({ ...prev, [`${day}-${col}`]: !prev[`${day}-${col}`] }));

  const ASSIGNED_COLS_STD = ["SR No.", "Weekly Off Name", "Effective From", "Branch", "Department", "Work Week", "Week Off", "Created By", "Action"];
  const ASSIGNED_COLS_EMP = ["SR No.", "Employee Name", "Weekly Off Name", "Effective From", "Branch", "Department", "Work Week", "Week Off", "Created By", "Action"];

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">Weekly Offs</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Configure and assign weekly off schedules.</p>
          </div>
          <button onClick={() => { setError(""); setShowSet(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Set Weekly Off
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl bg-[var(--color-danger-soft)] px-4 py-3 text-[13px] text-[var(--color-danger)]">{error}</div>}

        <div className="rounded-xl border border-[#e4e4ea] bg-white shadow-sm">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-[#ececf0] px-5">
            {[{ id: "weekly", label: "Weekly Off" }, { id: "assigned", label: "Assigned Weekly Off" }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`border-b-2 px-4 py-3 text-[13px] font-semibold transition-all ${tab === t.id ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[#6b6b76] hover:text-[#1a1a1f]"}`}
                style={{ marginBottom: -1 }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "weekly" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                      {["SR No.", "Weekly Off Name", "Work Week", "Week Off", "Created By", "Action"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No weekly offs found. Create your first one.</td></tr>
                    ) : rows.map((r, i) => (
                      <tr key={r.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                        <td className="px-4 py-3.5 text-[#9a9aa5]">{(page - 1) * pageSize + i + 1}</td>
                        <td className="px-4 py-3.5 font-semibold text-[#1a1a1f]">{r.name}</td>
                        <td className="px-4 py-3.5 text-[#4a4a55]">Configured</td>
                        <td className="max-w-[220px] truncate px-4 py-3.5 text-[#4a4a55]" title={typeof r.config === "string" ? r.config : JSON.stringify(r.config || {})}>
                          {typeof r.config === "string" ? r.config : JSON.stringify(r.config || {})}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-[13px] text-[#4a4a55]">{r.created_by || "—"}</div>
                          <div className="text-[11px] text-[#9a9aa5]">{r.created_at ? String(r.created_at).slice(0, 10) : ""}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={async () => { await axiosInstance.delete(`/hr/weekly-offs/${r.id}`); load(); }}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada] transition-colors" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={records.length} page={page} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} from={from} to={to} />
            </>
          )}

          {tab === "assigned" && (
            <>
              {/* Sub-toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f0f4] px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <select className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]">
                    <option>All Employees</option>
                    {employees.map((e) => <option key={e.id}>{e.full_name || e.name}</option>)}
                  </select>
                  <select className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]">
                    <option>Branch</option>
                    {[...new Set(employees.map((e) => e.branch).filter(Boolean))].map((b) => <option key={b}>{b}</option>)}
                  </select>
                  <select className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]">
                    <option>Department</option>
                    {[...new Set(employees.map((e) => e.department).filter(Boolean))].map((d) => <option key={d}>{d}</option>)}
                  </select>
                  <div className="flex items-center gap-1 rounded-lg border border-[#e2e2e8] bg-[#f5f5f7] p-1">
                    {[{ id: "standard", label: "Standard" }, { id: "employee", label: "Employee-Specific" }].map((p) => (
                      <button key={p.id} onClick={() => setAssignedTab(p.id)}
                        className={`rounded-md px-3 py-1 text-[12px] font-semibold transition-all ${assignedTab === p.id ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-[#6b6b76] hover:text-[#1a1a1f]"}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setError(""); setShowAssign(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity">
                  <Plus className="h-4 w-4" /> Assign Weekly Off
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[13px]" style={{ minWidth: assignedTab === "employee" ? 1000 : 900 }}>
                  <thead>
                    <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                      {(assignedTab === "standard" ? ASSIGNED_COLS_STD : ASSIGNED_COLS_EMP).map((h) => (
                        <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignedTab === "standard" ? (
                      <tr><td colSpan={ASSIGNED_COLS_STD.length} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No standard weekly offs assigned.</td></tr>
                    ) : assignedRows.length === 0 ? (
                      <tr><td colSpan={ASSIGNED_COLS_EMP.length} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No employee-specific weekly offs assigned.</td></tr>
                    ) : assignedRows.map((r, i) => (
                      <tr key={r.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                        <td className="px-4 py-3.5 text-[#9a9aa5]">{(assignedPage - 1) * assignedPageSize + i + 1}</td>
                        <td className="px-4 py-3.5 font-semibold text-[#1a1a1f]">{r.employee_name || "—"}</td>
                        <td className="px-4 py-3.5 text-[#4a4a55]">{r.weekly_off || "—"}</td>
                        <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{r.effective_from}</td>
                        <td className="px-4 py-3.5 text-[#4a4a55]">{r.branch || "—"}</td>
                        <td className="px-4 py-3.5 text-[#4a4a55]">{r.department || "—"}</td>
                        <td className="px-4 py-3.5 text-[#4a4a55]">{r.work_week}</td>
                        <td className="px-4 py-3.5 text-[#4a4a55]">{r.week_off}</td>
                        <td className="px-4 py-3.5">
                          <div className="text-[13px] text-[#4a4a55]">{r.created_by || "—"}</div>
                          <div className="text-[11px] text-[#9a9aa5]">{r.created_at ? String(r.created_at).slice(0, 10) : ""}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={async () => { await axiosInstance.delete(`/hr/weekly-off-assignments/${r.id}`); load(); }}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada] transition-colors" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={assignedRecords.length} page={assignedPage} pageSize={assignedPageSize} setPage={setAssignedPage} setPageSize={setAssignedPageSize} from={assignedFrom} to={assignedTo} />
            </>
          )}
        </div>
      </div>

      {/* Set Weekly Off Modal */}
      {showSet && (
        <ModalShell
          title="Set Weekly Off"
          onClose={() => setShowSet(false)}
          footer={
            <div className="flex justify-end gap-3">
              <button className="ui-btn-secondary px-5 py-2.5 text-[14px]" onClick={() => setShowSet(false)}>Cancel</button>
              <button className="ui-btn-primary px-5 py-2.5 text-[14px] disabled:opacity-60" disabled={saving} onClick={saveWeeklyOff}>{saving ? "Saving…" : "Save"}</button>
            </div>
          }
        >
          <div className="space-y-4">
            {error && <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</div>}
            <SoftField label="Weekly Off Name" required>
              <input className="ui-input w-full" placeholder="Enter weekly off name" value={weekOffName} onChange={(e) => setWeekOffName(e.target.value)} />
            </SoftField>
            <div className="overflow-x-auto rounded-xl border border-[#ececf0]">
              <table className="w-full border-collapse text-[13px]" style={{ minWidth: 420 }}>
                <thead>
                  <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                    {["Days", "All", "1st", "2nd", "3rd", "4th", "5th"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-[#6b6b76]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day} className="border-b border-[#f0f0f4] last:border-b-0">
                      <td className="px-3 py-2.5 font-semibold text-[#1a1a1f]">{day}</td>
                      {["all", "1st", "2nd", "3rd", "4th", "5th"].map((col) => (
                        <td key={col} className="px-3 py-2.5 text-center">
                          <input type="checkbox" checked={!!selected[`${day}-${col}`]} onChange={() => toggleCell(day, col)}
                            className="h-4 w-4 cursor-pointer rounded" style={{ accentColor: "var(--color-primary)" }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Assign Weekly Off Modal */}
      {showAssign && (
        <ModalShell
          title="Assign Weekly Off"
          onClose={() => setShowAssign(false)}
          footer={
            <div className="flex justify-end gap-3">
              <button className="ui-btn-secondary px-5 py-2.5 text-[14px]" onClick={() => setShowAssign(false)}>Cancel</button>
              <button className="ui-btn-primary px-5 py-2.5 text-[14px] disabled:opacity-60" disabled={saving} onClick={saveAssignment}>{saving ? "Saving…" : "Save Assignment"}</button>
            </div>
          }
        >
          <div className="space-y-4">
            {error && <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <SoftField label="Employee Name" required>
                <select className="ui-input w-full" value={assignForm.employee} onChange={(e) => setAssignForm((f) => ({ ...f, employee: e.target.value }))}>
                  <option value="">Select employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name || e.name}</option>)}
                </select>
              </SoftField>
              <SoftField label="Weekly Off Name" required>
                <select className="ui-input w-full" value={assignForm.weeklyOff} onChange={(e) => setAssignForm((f) => ({ ...f, weeklyOff: e.target.value }))}>
                  <option value="">Select weekly off</option>
                  {records.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </SoftField>
              <SoftField label="Effective From" required>
                <input className="ui-input w-full" type="date" value={assignForm.effectiveFrom} onChange={(e) => setAssignForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
              </SoftField>
              <SoftField label="Branch">
                <input className="ui-input w-full" value={assignForm.branch} onChange={(e) => setAssignForm((f) => ({ ...f, branch: e.target.value }))} placeholder="Select branch" />
              </SoftField>
              <SoftField label="Department">
                <input className="ui-input w-full" value={assignForm.department} onChange={(e) => setAssignForm((f) => ({ ...f, department: e.target.value }))} placeholder="Select department" />
              </SoftField>
              <SoftField label="Work Week">
                <select className="ui-input w-full" value={assignForm.workWeek} onChange={(e) => setAssignForm((f) => ({ ...f, workWeek: e.target.value }))}>
                  <option>Monday - Friday</option>
                  <option>Monday - Saturday</option>
                  <option>Sunday - Thursday</option>
                </select>
              </SoftField>
            </div>
            <SoftField label="Week Off" required>
              <input className="ui-input w-full" value={assignForm.weekOff} onChange={(e) => setAssignForm((f) => ({ ...f, weekOff: e.target.value }))} placeholder="e.g. Sunday, 2nd Saturday" />
            </SoftField>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

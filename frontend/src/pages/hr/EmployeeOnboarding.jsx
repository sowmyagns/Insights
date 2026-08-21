import { useState, useEffect, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { AuthContext } from "../../context/AuthContext";
import { inputClass } from "../../design-system/classes";

const PAGE_SIZES = [20, 50, 100];
const PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[440px] flex-col overflow-hidden rounded-l-xl bg-white shadow-2xl animate-[slideInRight_0.28s_ease-out]";

const EMPTY_FORM = {
  first_name: "", last_name: "", gender: "", dob: "",
  designation: "", email: "", mobile: "", employment_type: "",
  branch: "", department: "", date_of_joining: "", reporting_to: "",
};

const EMPTY_PERSONAL = { gender: "", dob: "" };
const EMPTY_EMPLOYMENT = { employment_type: "", branch: "", department: "", reporting_to: "", date_of_joining: "" };

function SoftField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[#8a8a95]">
        {label}{required ? <span className="text-[#e11d48]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function PersonalDetailsModal({ open, onClose, initial, onSave }) {
  const [form, setForm] = useState(EMPTY_PERSONAL);
  useEffect(() => {
    if (!open) return;
    setForm({ gender: initial?.gender || "", dob: initial?.dob || "" });
  }, [open, initial]);
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onSave?.(form); onClose?.(); }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ececf0] bg-white px-5 py-4">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">Personal Details</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#9a9aa5] hover:bg-[#f5f5f7]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 bg-[#f3f3f6] px-5 py-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#8a8a95]">Gender</label>
            <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className={inputClass}>
              <option value="">Select Gender</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#8a8a95]">Date of Birth</label>
            <input type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-[#ececf0] bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full py-2.5 text-[14px]">Cancel</button>
          <button type="submit" className="ui-btn-primary w-full py-2.5 text-[14px]">Save</button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function EmploymentDetailsModal({ open, onClose, initial, onSave }) {
  const [form, setForm] = useState(EMPTY_EMPLOYMENT);
  useEffect(() => {
    if (!open) return;
    setForm({
      employment_type: initial?.employment_type || "",
      branch: initial?.branch || "",
      department: initial?.department || "",
      reporting_to: initial?.reporting_to || "",
      date_of_joining: initial?.date_of_joining || "",
    });
  }, [open, initial]);
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onSave?.(form); onClose?.(); }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ececf0] bg-white px-5 py-4">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">Employment Details</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#9a9aa5] hover:bg-[#f5f5f7]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 bg-[#f3f3f6] px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#8a8a95]">Employment Type</label>
              <select value={form.employment_type} onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))} className={inputClass}>
                <option value="">Select Type</option>
                <option>Permanent</option><option>Contract</option><option>Intern</option><option>Part-time</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#8a8a95]">Branch</label>
              <select value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))} className={inputClass}>
                <option value="">Select Branch</option>
                <option>Head Office</option><option>Branch 1</option><option>Branch 2</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#8a8a95]">Department</label>
              <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className={inputClass}>
                <option value="">Select Department</option>
                <option>Sales</option><option>Accountant</option><option>Production</option>
                <option>Operator</option><option>Storage</option><option>HR</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#8a8a95]">Reporting To</label>
              <input value={form.reporting_to} onChange={(e) => setForm((f) => ({ ...f, reporting_to: e.target.value }))} placeholder="Manager name" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#8a8a95]">Date of Joining</label>
            <input type="date" value={form.date_of_joining} onChange={(e) => setForm((f) => ({ ...f, date_of_joining: e.target.value }))} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-[#ececf0] bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full py-2.5 text-[14px]">Cancel</button>
          <button type="submit" className="ui-btn-primary w-full py-2.5 text-[14px]">Save</button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function EmployeeFormModal({ open, employee, onClose, onSaved }) {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState(EMPTY_FORM);
  const [personalDetails, setPersonalDetails] = useState(null);
  const [personalOpen, setPersonalOpen] = useState(false);
  const [employmentDetails, setEmploymentDetails] = useState(null);
  const [employmentOpen, setEmploymentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (employee) {
      const fullName = employee.full_name || employee.name || "";
      const parts = fullName.trim().split(/\s+/);
      setForm({
        first_name: parts[0] || "",
        last_name: parts.slice(1).join(" ") || "",
        email: employee.email || "",
        mobile: employee.phone || employee.mobile || "",
        designation: employee.designation || "",
      });
      setPersonalDetails({ gender: employee.gender || "", dob: employee.dob || "" });
      setEmploymentDetails({
        employment_type: employee.employment_type || "",
        branch: employee.branch || "",
        department: employee.department || "",
        reporting_to: employee.reporting_manager || employee.reporting_to || "",
        date_of_joining: employee.hire_date || employee.date_of_joining || "",
      });
    } else {
      setForm(EMPTY_FORM);
      setPersonalDetails(null);
      setEmploymentDetails(null);
    }
    setError("");
  }, [open, employee]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim()) { setError("First name is required."); return; }
    if (!form.designation.trim()) { setError("Designation is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError("Enter a valid email address."); return; }
    setSaving(true); setError("");
    try {
      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      const payload = {
        full_name: fullName,
        email: form.email.trim(),
        phone: form.mobile.trim(),
        designation: form.designation,
        gender: personalDetails?.gender || "",
        dob: personalDetails?.dob || null,
        department: employmentDetails?.department || "",
        reporting_manager: employmentDetails?.reporting_to || "",
        hire_date: employmentDetails?.date_of_joining || null,
        employment_type: employmentDetails?.employment_type || "",
        branch: employmentDetails?.branch || "",
        is_active: true,
      };
      if (employee?.id) {
        await axiosInstance.put(`/hr/employees/${employee.id}`, payload);
      } else {
        const code = "EMP-" + Date.now().toString().slice(-6);
        await axiosInstance.post("/hr/employees", { ...payload, employee_code: code, tenant_id: user?.tenant_id ?? 1 });
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const personalText = personalDetails
    ? [personalDetails.gender, personalDetails.dob].filter(Boolean).join(" · ")
    : null;

  const employmentText = employmentDetails
    ? [employmentDetails.employment_type, employmentDetails.department, employmentDetails.branch].filter(Boolean).join(" · ")
    : null;

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-end bg-black/40"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form onSubmit={handleSave} className={PANEL_CLASS} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececf0] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">
            {employee ? "Edit Employee" : "Add Employee"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#1a1a1f] hover:bg-[#f5f5f7]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <SoftField label="First Name" required>
                <input value={form.first_name} onChange={set("first_name")} placeholder="Enter first name" className={inputClass} />
              </SoftField>
              <SoftField label="Last Name">
                <input value={form.last_name} onChange={set("last_name")} placeholder="Enter last name" className={inputClass} />
              </SoftField>
            </div>

            {/* Email + Mobile */}
            <div className="grid grid-cols-2 gap-3">
              <SoftField label="Email" required>
                <input type="email" value={form.email} onChange={set("email")} placeholder="Enter email" className={inputClass} />
              </SoftField>
              <SoftField label="Mobile Number">
                <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="Enter mobile" className={inputClass} />
              </SoftField>
            </div>

            {/* Designation */}
            <SoftField label="Designation" required>
              <input value={form.designation} onChange={set("designation")} placeholder="e.g. Software Engineer" className={inputClass} />
            </SoftField>
          </div>

          {/* Personal Details subsection */}
          <div className="mt-3 border-t border-[#ececf0] pt-3">
            {personalText ? (
              <div className="rounded-lg border border-[#ececf0] bg-white px-3 py-2.5">
                <div className="mb-0.5 text-[12px] font-semibold text-[#1a1a1f]">Personal Details</div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] text-[#4a4a55]">{personalText}</p>
                  <button type="button" onClick={() => setPersonalOpen(true)}>
                    <Pencil className="h-4 w-4 text-[var(--color-action-teal)]" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1a1a1f]">Personal Details</p>
                  <p className="truncate text-[11px] text-[#6b6b76]">Gender, Date of Birth</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPersonalOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            )}
          </div>

          {/* Employment Details subsection */}
          <div className="mt-2 border-t border-[#ececf0] pt-3">
            {employmentText ? (
              <div className="rounded-lg border border-[#ececf0] bg-white px-3 py-2.5">
                <div className="mb-0.5 text-[12px] font-semibold text-[#1a1a1f]">Employment Details</div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] text-[#4a4a55]">{employmentText}</p>
                  <button type="button" onClick={() => setEmploymentOpen(true)}>
                    <Pencil className="h-4 w-4 text-[var(--color-action-teal)]" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1a1a1f]">Employment Details</p>
                  <p className="truncate text-[11px] text-[#6b6b76]">Type, Branch, Department, Reporting To, Joining Date</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmploymentOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#ececf0] px-5 py-3.5">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full py-3 text-[14px]">Cancel</button>
          <button type="submit" disabled={saving} className="ui-btn-primary py-3 text-[14px] disabled:opacity-60">
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </form>

      <PersonalDetailsModal
        open={personalOpen}
        onClose={() => setPersonalOpen(false)}
        initial={personalDetails || EMPTY_PERSONAL}
        onSave={setPersonalDetails}
      />
      <EmploymentDetailsModal
        open={employmentOpen}
        onClose={() => setEmploymentOpen(false)}
        initial={employmentDetails || EMPTY_EMPLOYMENT}
        onSave={setEmploymentDetails}
      />
    </div>,
    document.body
  );
}

function DeleteModal({ open, busy, onClose, onConfirm }) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white px-8 py-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 grid h-[72px] w-[72px] place-items-center rounded-full bg-[#fee2e2]">
          <Trash2 className="h-9 w-9 text-[#ef4444]" strokeWidth={1.75} />
        </div>
        <h3 className="text-[28px] font-bold leading-tight text-[#1a1a1f]">Delete Employee?</h3>
        <p className="mt-3 text-[14px] leading-relaxed text-[#5a5a66]">
          Are you sure you want to delete this employee?<br />This action is not reversible.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-4">
          <button type="button" disabled={busy} onClick={onClose} className="ui-btn-secondary w-full py-3 text-[14px]">No</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="ui-btn-danger w-full py-3 text-[14px]">
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function EmployeeOnboarding() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/hr/employees");
      const data = res.data?.results ?? res.data ?? [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch { setEmployees([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();
  const branches    = [...new Set(employees.map((e) => e.branch).filter(Boolean))].sort();
  const empTypes    = [...new Set(employees.map((e) => e.employment_type).filter(Boolean))].sort();

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    if (q && ![e.full_name, e.name, e.email, e.phone, e.designation, e.department, e.branch, e.employee_code, e.reporting_manager].filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
    if (filterDept   && (e.department     || "").trim().toLowerCase() !== filterDept.trim().toLowerCase()) return false;
    if (filterBranch && (e.branch         || "").trim().toLowerCase() !== filterBranch.trim().toLowerCase()) return false;
    if (filterType   && (e.employment_type || "").trim().toLowerCase() !== filterType.trim().toLowerCase()) return false;
    if (filterStatus === "active"   && !e.is_active) return false;
    if (filterStatus === "inactive" && e.is_active)  return false;
    return true;
  });

  const hasFilters = filterDept || filterBranch || filterStatus || filterType;
  const clearFilters = () => { setSearch(""); setFilterDept(""); setFilterBranch(""); setFilterStatus(""); setFilterType(""); setPage(1); };

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await axiosInstance.delete(`/hr/employees/${deleting.id}`);
      setDeleting(null);
      load();
    } catch { /* ignore */ }
    finally { setDeletingBusy(false); }
  };

  const withActive = employees.filter((e) => e.is_active !== false).length;

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        {/* KPI strip */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: "Total Employees", value: employees.length, color: "#0f6d84" },
            { label: "Active", value: withActive, color: "#16a34a" },
            { label: "Inactive", value: employees.length - withActive, color: "#dc2626" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3">
              <p className="text-[11px] font-medium text-[#6b6b76]">{k.label}</p>
              <p className="mt-0.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="ui-card p-4 sm:p-5">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search employees…"
                className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[#d0d0d8] focus:bg-white"
              />
            </div>
            <select className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-2 text-[12px] outline-none" value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}>
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-2 text-[12px] outline-none" value={filterBranch} onChange={(e) => { setFilterBranch(e.target.value); setPage(1); }}>
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-2 text-[12px] outline-none" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-2 text-[12px] outline-none" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="Permanent">Permanent</option>
              <option value="Contractual">Contractual</option>
              <option value="Contract">Contract</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Intern">Intern</option>
            </select>
            {hasFilters && (
              <button onClick={clearFilters} className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] text-[#6b6b76] hover:bg-[#f5f5f7]">✕ Clear</button>
            )}
            <button
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Add Employee
            </button>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-[#ececf0]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#e8e8ee] bg-[#f5f5f5] text-[12px] font-medium text-[#6b6b76]">
                    {["SR No.", "Employee Name", "Phone Number", "Designation", "Reporting To", "Branch", "Department", "Date of Joining", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">Loading…</td></tr>
                  ) : rows.length ? rows.map((emp, i) => (
                    <tr key={emp.id} className="border-b border-[#f0f0f4] text-[#1a1a1f] last:border-b-0">
                      <td className="px-4 py-3.5 text-[#6b6b76]">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[13px] font-bold text-[var(--color-primary)]">
                            {(emp.full_name || emp.name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-[#1a1a1f]">{emp.full_name || emp.name || "—"}</div>
                            <div className="text-[11px] text-[#6b6b76]">{emp.email || ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{emp.phone || emp.mobile || "—"}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{emp.designation || "—"}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{emp.reporting_manager || emp.reporting_to || "—"}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{emp.branch || "—"}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{emp.department || "—"}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{emp.hire_date || emp.date_of_joining || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${emp.is_active !== false ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>
                          {emp.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setEditing(emp); setFormOpen(true); }}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[#e4e6fc]"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(emp)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada]"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={10} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No employees found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#6b6b76]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded border border-[#e2e2e8] bg-white px-2 py-1 outline-none">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{total === 0 ? "0-0 of 0" : `${from}-${to} of ${total}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40" aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" className="grid h-8 min-w-8 place-items-center rounded border border-[var(--color-action-teal)] px-2 text-[13px] font-semibold text-white" style={{ background: "var(--color-action-teal)" }}>
                {page}
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40" aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <EmployeeFormModal
        open={formOpen}
        employee={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
      />
      <DeleteModal
        open={Boolean(deleting)}
        busy={deletingBusy}
        onClose={() => !deletingBusy && setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

import { useState, useEffect, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import axiosInstance from "../../api/axiosConfig";
import { AuthContext } from "../../context/AuthContext";

const EMPTY_FORM = {
  first_name: "", last_name: "", gender: "", designation: "",
  email: "", mobile: "", employment_type: "", branch: "",
  department: "", date_of_joining: "", reporting_to: "",
};

function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>
        {label}{required && <span style={{ color: "var(--color-danger)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function EmployeeFormModal({ open, employee, onClose, onSaved }) {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState(EMPTY_FORM);
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
        gender: employee.gender || "",
        designation: employee.designation || "",
        email: employee.email || "",
        mobile: employee.phone || employee.mobile || "",
        employment_type: employee.employment_type || "",
        branch: employee.branch || "",
        department: employee.department || "",
        date_of_joining: employee.hire_date || employee.date_of_joining || "",
        reporting_to: employee.reporting_manager || employee.reporting_to || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError("");
  }, [open, employee]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.first_name.trim()) { setError("First name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    setSaving(true);
    setError("");
    try {
      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      const payload = {
        full_name: fullName,
        email: form.email.trim(),
        phone: form.mobile.trim(),
        department: form.department,
        designation: form.designation,
        reporting_manager: form.reporting_to,
        hire_date: form.date_of_joining || null,
        employment_type: form.employment_type,
        branch: form.branch,
        gender: form.gender,
        is_active: true,
      };
      if (employee?.id) {
        await axiosInstance.put(`/hr/employees/${employee.id}`, payload);
      } else {
        // Generate employee_code from name + timestamp (required by schema)
        const code = "EMP-" + Date.now().toString().slice(-6);
        await axiosInstance.post("/hr/employees", {
          ...payload,
          employee_code: code,
          tenant_id: user?.tenant_id ?? 1,
        });
      }
      onSaved();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputStyle = {
    width: "100%", padding: "8px 12px", fontSize: 13,
    border: "1px solid var(--color-border)", borderRadius: 8,
    background: "var(--color-surface)", color: "var(--color-text)",
    outline: "none", boxSizing: "border-box",
  };

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,17,23,0.5)", backdropFilter: "blur(3px)", padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div style={{ background: "var(--color-surface)", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--color-border-muted)" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--color-text)" }}>
              {employee ? "Edit Employee" : "Add Employee"}
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
              {employee ? "Update employee details." : "Fill in the details to onboard a new employee."}
            </p>
          </div>
          <button
            onClick={onClose} disabled={saving}
            style={{ background: "var(--color-surface-muted)", border: "none", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 14, color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="First Name" required>
              <input style={inputStyle} placeholder="Enter first name" value={form.first_name} onChange={set("first_name")} />
            </Field>
            <Field label="Last Name">
              <input style={inputStyle} placeholder="Enter last name" value={form.last_name} onChange={set("last_name")} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Gender">
              <select style={inputStyle} value={form.gender} onChange={set("gender")}>
                <option value="">Select Gender</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>
            <Field label="Designation">
              <input style={inputStyle} placeholder="e.g. Software Engineer" value={form.designation} onChange={set("designation")} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Email" required>
              <input style={inputStyle} type="email" placeholder="Enter email" value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Mobile Number">
              <input style={inputStyle} placeholder="Enter mobile number" value={form.mobile} onChange={set("mobile")} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Employment Type">
              <select style={inputStyle} value={form.employment_type} onChange={set("employment_type")}>
                <option value="">Select Type</option>
                <option>Permanent</option><option>Contract</option><option>Intern</option><option>Part-time</option>
              </select>
            </Field>
            <Field label="Branch">
              <input style={inputStyle} placeholder="Enter branch" value={form.branch} onChange={set("branch")} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Department">
              <input style={inputStyle} placeholder="Enter department" value={form.department} onChange={set("department")} />
            </Field>
            <Field label="Reporting To">
              <input style={inputStyle} placeholder="Manager name" value={form.reporting_to} onChange={set("reporting_to")} />
            </Field>
          </div>
          <Field label="Date of Joining">
            <input style={{ ...inputStyle, maxWidth: 220 }} type="date" value={form.date_of_joining} onChange={set("date_of_joining")} />
          </Field>
          {error && (
            <div style={{ padding: "10px 14px", background: "var(--color-danger-soft)", color: "var(--color-danger)", borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--color-border-muted)" }}>
          <button className="ui-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ui-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : employee ? "Update Employee" : "Add Employee"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DeleteModal({ open, busy, onClose, onConfirm }) {
  if (!open) return null;
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,17,23,0.45)", backdropFilter: "blur(2px)", padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: "32px 28px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--color-danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>🗑️</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>Delete Employee?</h3>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.6 }}>This action cannot be undone.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button className="ui-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="ui-btn-danger" onClick={onConfirm} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
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
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/hr/employees");
      setEmployees(res.data?.results ?? res.data ?? []);
    } catch { setEmployees([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];
  const branches = [...new Set(employees.map((e) => e.branch).filter(Boolean))];

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    if (q && ![e.full_name, e.name, e.email, e.designation, e.department, e.branch].filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
    if (filterDept && e.department !== filterDept) return false;
    if (filterBranch && e.branch !== filterBranch) return false;
    if (filterStatus === "active" && e.is_active === false) return false;
    if (filterStatus === "inactive" && e.is_active !== false) return false;
    if (filterType && e.employment_type !== filterType) return false;
    return true;
  });

  const hasFilters = filterDept || filterBranch || filterStatus || filterType;
  const clearFilters = () => { setFilterDept(""); setFilterBranch(""); setFilterStatus(""); setFilterType(""); setPage(1); };

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

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

  const TableFooter = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--color-border-muted)", flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
        {total === 0 ? "No entries" : `${from}–${to} of ${total} entries`}
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        <button className="ui-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
        <button className="ui-page-btn ui-page-btn--active">{page}</button>
        <button className="ui-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
      </div>
    </div>
  );

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Employee Onboarding</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Onboard employees individually or in bulk.</p>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total Employees", value: employees.length, color: "var(--color-primary)" },
          { label: "Active", value: employees.filter((e) => e.is_active !== false).length, color: "#15803d" },
          { label: "Filtered", value: filtered.length, color: "#6b4eff" },
        ].map((k) => (
          <div key={k.label} className="ui-card" style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar + Table */}
      <div className="ui-card" style={{ padding: "14px 16px" }}>
        {/* Toolbar: search + filters + action */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input className="ui-input" style={{ flex: 1, minWidth: 180, height: 32, fontSize: 12 }} placeholder="Search employees…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="ui-select" style={{ height: 32, fontSize: 12, width: 130 }} value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="ui-select" style={{ height: 32, fontSize: 12, width: 110 }} value={filterBranch} onChange={(e) => { setFilterBranch(e.target.value); setPage(1); }}>
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="ui-select" style={{ height: 32, fontSize: 12, width: 100 }} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select className="ui-select" style={{ height: 32, fontSize: 12, width: 130 }} value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            <option value="Permanent">Permanent</option>
            <option value="Contract">Contract</option>
            <option value="Intern">Intern</option>
            <option value="Part-time">Part-time</option>
          </select>
          {hasFilters && (
            <button className="ui-btn-outline ui-btn--sm" onClick={clearFilters} style={{ height: 32, fontSize: 12, padding: "0 10px" }}>✕ Clear</button>
          )}
          <button className="ui-btn-primary ui-btn--sm" style={{ height: 32, marginLeft: "auto" }} onClick={() => { setEditing(null); setFormOpen(true); }}>+ Add Employee</button>
        </div>

        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--color-border-muted)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-thead)" }}>
                {["SR No.", "Employee Name", "Designation", "Reporting To", "Branch", "Department", "Date of Joining", "Status", "Action"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-muted)" }}>Loading…</td></tr>
              ) : rows.length ? rows.map((emp, i) => (
                <tr key={emp.id} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-primary-soft)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {(emp.full_name || emp.name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{emp.full_name || emp.name || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{emp.email || ""}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>{emp.designation || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>{emp.reporting_manager || emp.reporting_to || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>{emp.branch || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>{emp.department || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>{emp.hire_date || emp.date_of_joining || "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span className={`ui-badge ${emp.is_active !== false ? "ui-badge-success" : "ui-badge-neutral"}`}>
                      {emp.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        title="Edit"
                        onClick={() => { setEditing(emp); setFormOpen(true); }}
                        style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "var(--color-primary-soft)", color: "var(--color-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
                      >✎</button>
                      <button
                        title="Delete"
                        onClick={() => setDeleting(emp)}
                        style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "var(--color-danger-soft)", color: "var(--color-danger)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
                      >🗑</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="ui-empty">No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <TableFooter />
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

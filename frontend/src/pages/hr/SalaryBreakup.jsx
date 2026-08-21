import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Filter, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { api } from "../api";
import "./SalaryBreakup.css";

const INITIAL_ROWS = [
  { name: "Basic", category: "earning", calcType: "percent", calcValue: 50, basis: "ctc" },
  { name: "DA", category: "earning", calcType: "flat", calcValue: 0, basis: "monthly" },
  { name: "HRA", category: "earning", calcType: "percent", calcValue: 40, basis: "basic" },
  { name: "Other Allowance", category: "earning", calcType: "flat", calcValue: 0, basis: "monthly" },
  { name: "PF", category: "deduction", calcType: "percent", calcValue: 12, basis: "basic" },
  { name: "Professional Tax", category: "deduction", calcType: "flat", calcValue: 0, basis: "monthly" },
];

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const emptyForm = () => ({ employee_id: "", ctc_annual: "", effective_from: new Date().toISOString().slice(0, 10), rows: INITIAL_ROWS.map((row) => ({ ...row })) });

function calculateRows(rows, ctc) {
  const monthlyCtc = (Number(ctc) || 0) / 12;
  const basicPercent = Number(rows.find((row) => row.name === "Basic")?.calcValue || 0);
  return rows.map((row) => {
    const basis = row.basis === "ctc" ? monthlyCtc : row.basis === "basic" ? monthlyCtc * basicPercent / 100 : 0;
    const monthly = row.calcType === "percent" ? basis * Number(row.calcValue || 0) / 100 : Number(row.calcValue || 0);
    return { ...row, monthly: Math.round(monthly * 100) / 100, annual: Math.round(monthly * 1200) / 100 };
  });
}

function employeeName(employeeMap, employeeId) {
  const employee = employeeMap.get(String(employeeId));
  return employee?.full_name || employee?.name || `Employee #${employeeId}`;
}

export default function SalaryBreakup() {
  const { addToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [breakups, setBreakups] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [employeeRows, breakupRows] = await Promise.all([api.employees.enriched(), api.salaryBreakups.list()]);
      setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
      setBreakups(Array.isArray(breakupRows) ? breakupRows : []);
    } catch (loadError) {
      setEmployees([]);
      setBreakups([]);
      setError(loadError.response?.data?.detail || "Unable to load salary breakups. Check that the HR API is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const employeeMap = useMemo(() => new Map(employees.map((employee) => [String(employee.id), employee])), [employees]);
  const departments = useMemo(() => [...new Set(employees.map((employee) => employee.department).filter(Boolean))].sort(), [employees]);
  const filteredEmployees = useMemo(() => {
    const value = employeeSearch.trim().toLowerCase();
    return employees.filter((employee) => (!department || employee.department === department) && `${employee.full_name || employee.name || ""} ${employee.employee_code || ""}`.toLowerCase().includes(value));
  }, [employees, department, employeeSearch]);
  const filteredBreakups = useMemo(() => {
    const value = query.trim().toLowerCase();
    return breakups.filter((breakup) => {
      const employee = employeeMap.get(String(breakup.employee_id));
      return (!department || employee?.department === department) && (!value || `${employeeName(employeeMap, breakup.employee_id)} ${employee?.employee_code || ""}`.toLowerCase().includes(value));
    });
  }, [breakups, department, employeeMap, query]);
  const calculatedRows = useMemo(() => calculateRows(form.rows, form.ctc_annual), [form.rows, form.ctc_annual]);
  const gross = calculatedRows.filter((row) => row.category === "earning").reduce((total, row) => total + row.monthly, 0);
  const deductions = calculatedRows.filter((row) => row.category === "deduction").reduce((total, row) => total + row.monthly, 0);
  const net = gross - deductions;

  const reset = () => { setForm(emptyForm()); setEmployeeSearch(""); setEditing(null); setError(""); };
  const closeEditor = () => { reset(); setShowCreate(false); };
  const chooseEmployee = (employee) => {
    setForm((current) => ({ ...current, employee_id: employee.id, ctc_annual: current.ctc_annual || employee.salary || "" }));
    setEmployeeSearch(employee.full_name || employee.name || "");
  };
  const updateRow = (index, field, value) => setForm((current) => ({ ...current, rows: current.rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: field === "calcValue" ? value.replace(/[^0-9.]/g, "") : value } : row) }));

  const editBreakup = (breakup) => {
    const savedRows = Array.isArray(breakup.data?.rows) ? breakup.data.rows : INITIAL_ROWS;
    setEditing(breakup);
    setForm({ employee_id: breakup.employee_id, ctc_annual: String(breakup.ctc_annual || ""), effective_from: breakup.effective_from || new Date().toISOString().slice(0, 10), rows: savedRows.map((row) => ({ ...row })) });
    setEmployeeSearch(employeeName(employeeMap, breakup.employee_id));
    setShowCreate(true);
  };

  const save = async () => {
    if (!form.employee_id || !form.ctc_annual || Number(form.ctc_annual) <= 0) { setError("Select an employee and enter a valid annual CTC."); return; }
    setBusy(true);
    setError("");
    const payload = { employee_id: Number(form.employee_id), ctc_annual: Number(form.ctc_annual), effective_from: form.effective_from, data: { rows: calculatedRows, gross_monthly: gross, deductions_monthly: deductions, net_monthly: net } };
    try {
      if (editing) await api.salaryBreakups.update(editing.id, payload);
      else await api.salaryBreakups.create(payload);
      await load();
      addToast(editing ? "Salary breakup updated." : "Salary breakup created.", "success");
      closeEditor();
    } catch (saveError) {
      setError(saveError.response?.data?.detail || "Unable to save salary breakup.");
    } finally {
      setBusy(false);
    }
  };

  const removeBreakup = async (breakup) => {
    if (!window.confirm(`Delete the salary breakup for ${employeeName(employeeMap, breakup.employee_id)}?`)) return;
    try {
      await api.salaryBreakups.delete(breakup.id);
      setBreakups((current) => current.filter((row) => row.id !== breakup.id));
      addToast("Salary breakup deleted.", "success");
    } catch (deleteError) {
      addToast(deleteError.response?.data?.detail || "Unable to delete salary breakup.", "error");
    }
  };

  if (showCreate) return <SalaryEditor form={form} error={error} busy={busy} editing={editing} employeeSearch={employeeSearch} filteredEmployees={filteredEmployees} selectedEmployee={employeeMap.get(String(form.employee_id))} calculatedRows={calculatedRows} gross={gross} deductions={deductions} net={net} onSearch={setEmployeeSearch} onChooseEmployee={chooseEmployee} onChange={setForm} onUpdateRow={updateRow} onReset={reset} onCancel={closeEditor} onSave={save} />;

  return <div className="ui-page salary-breakup-page">
    <header className="salary-page-header"><div><p className="salary-eyebrow">HR / Compensation</p><h1 className="ui-page-title">Salary Breakups</h1><p className="ui-subtitle">Maintain employee CTC structures and monthly pay components.</p></div><Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { reset(); setShowCreate(true); }}>Create breakup</Button></header>
    <div className="salary-summary-grid"><Summary label="Active structures" value={breakups.length} tone="teal" /><Summary label="Employees covered" value={new Set(breakups.map((row) => row.employee_id)).size} tone="blue" /><Summary label="Departments" value={departments.length} tone="gold" /></div>
    {error ? <ErrorBanner message={error} onRetry={load} /> : null}
    <section className="ui-card salary-list-card">
      <div className="salary-toolbar"><div className="salary-search relative w-full sm:w-56 sm:flex-none"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" /><input className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[#d0d0d8] focus:bg-white" aria-label="Search salary breakups" placeholder="Search salary breakups" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="salary-toolbar-actions"><Button variant={filterOpen || department ? "primary" : "outline"} size="sm" leftIcon={<Filter className="h-3.5 w-3.5" />} onClick={() => setFilterOpen((value) => !value)}>Filter{department ? " (1)" : ""}</Button></div></div>
      {filterOpen ? <div className="salary-filter-panel"><label htmlFor="salary-department-filter">Department</label><select id="salary-department-filter" className="ui-select" aria-label="Filter by department" value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">All departments</option>{departments.map((value) => <option key={value}>{value}</option>)}</select>{department ? <button type="button" onClick={() => setDepartment("")}>Clear filter</button> : null}</div> : null}
      {loading ? <Loader label="Loading salary breakups..." /> : <div className="salary-table-wrap"><table className="salary-table"><thead><tr>{["SR No.", "Employee", "Department", "Annual CTC", "Gross / month", "Net / month", "Effective from", "Actions"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{filteredBreakups.map((breakup, index) => { const employee = employeeMap.get(String(breakup.employee_id)); return <tr key={breakup.id}><td className="muted-cell">{index + 1}</td><td><strong>{employeeName(employeeMap, breakup.employee_id)}</strong><span className="secondary-cell">{employee?.employee_code || "No employee code"}</span></td><td>{employee?.department || "-"}</td><td className="amount-cell">{money(breakup.ctc_annual)}</td><td className="amount-cell">{money(breakup.data?.gross_monthly)}</td><td className="amount-cell net-cell">{money(breakup.data?.net_monthly)}</td><td><span className="date-cell"><CalendarDays className="h-3.5 w-3.5" />{breakup.effective_from || "-"}</span></td><td><div className="salary-actions"><button type="button" className="salary-icon-button" aria-label={`Edit ${employeeName(employeeMap, breakup.employee_id)}`} title="Edit" onClick={() => editBreakup(breakup)}><Pencil className="h-3.5 w-3.5" /></button><button type="button" className="salary-icon-button salary-icon-danger" aria-label={`Delete ${employeeName(employeeMap, breakup.employee_id)}`} title="Delete" onClick={() => removeBreakup(breakup)}><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>; })}</tbody></table>{!filteredBreakups.length ? <div className="salary-empty"><strong>{breakups.length ? "No matching salary breakups" : "No salary breakups yet"}</strong><span>{breakups.length ? "Try a different employee or department filter." : "Create the first structure from the page action above."}</span>{breakups.length ? <Button variant="outline" size="sm" onClick={() => { setQuery(""); setDepartment(""); }}>Clear filters</Button> : null}</div> : null}</div>}
    </section>
  </div>;
}

function Summary({ label, value, tone }) { return <div className={`salary-summary salary-summary-${tone}`}><span>{label}</span><strong>{value}</strong></div>; }
function ErrorBanner({ message, onRetry }) { return <div className="salary-error"><span>{message}</span>{onRetry ? <button type="button" onClick={onRetry}>Retry</button> : null}</div>; }
function Preview({ label, value, tone }) { return <div className={`salary-preview salary-preview-${tone}`}><span>{label}</span><strong>{value}</strong></div>; }

function SalaryEditor({ form, error, busy, editing, employeeSearch, filteredEmployees, selectedEmployee, calculatedRows, gross, deductions, net, onSearch, onChooseEmployee, onChange, onUpdateRow, onReset, onCancel, onSave }) {
  return <div className="ui-page salary-breakup-page"><header className="salary-page-header"><div><p className="salary-eyebrow">HR / Compensation</p><h1 className="ui-page-title">{editing ? "Edit salary breakup" : "Create salary breakup"}</h1><p className="ui-subtitle">Set the employee's annual CTC and define how each component is calculated.</p></div><Button variant="ghost" leftIcon={<X className="h-4 w-4" />} onClick={onCancel}>Close</Button></header>
    <section className="ui-card salary-editor-card">{error ? <ErrorBanner message={error} /> : null}<div className="salary-form-grid"><label className="salary-field salary-employee-field"><span>Employee <b>*</b></span><input className="ui-input" aria-label="Search employee" placeholder="Search by name or code" value={employeeSearch} onChange={(event) => onSearch(event.target.value)} />{employeeSearch && !selectedEmployee ? <div className="employee-results">{filteredEmployees.slice(0, 8).map((employee) => <button type="button" key={employee.id} onClick={() => onChooseEmployee(employee)}>{employee.full_name || employee.name}<small>{employee.employee_code || employee.department || ""}</small></button>)}</div> : null}<em>{selectedEmployee ? `${selectedEmployee.full_name || selectedEmployee.name} selected` : "Choose an employee to continue"}</em></label><label className="salary-field"><span>Annual CTC <b>*</b></span><div className="currency-input"><span>₹</span><input className="ui-input" type="number" min="0" step="0.01" value={form.ctc_annual} onChange={(event) => onChange((current) => ({ ...current, ctc_annual: event.target.value }))} placeholder="0.00" /></div></label><label className="salary-field"><span>Effective from <b>*</b></span><input className="ui-input" type="date" value={form.effective_from} onChange={(event) => onChange((current) => ({ ...current, effective_from: event.target.value }))} /></label></div>
  <div className="salary-preview-grid"><Preview label="Gross monthly" value={money(gross)} tone="positive" /><Preview label="Deductions" value={money(deductions)} tone="negative" /><Preview label="Net monthly" value={money(net)} tone="accent" /></div><div className="salary-section-heading"><div><h2>Pay components</h2><p>Use a flat amount or a percentage of the selected basis.</p></div><span>{calculatedRows.length} components</span></div><div className="salary-component-wrap"><table className="salary-table salary-component-table"><thead><tr><th>Component</th><th>Category</th><th>Calculation</th><th>Monthly</th><th>Annual</th></tr></thead><tbody>{calculatedRows.map((row, index) => <tr key={row.name}><td><strong>{row.name}</strong></td><td><span className={`salary-category salary-category-${row.category}`}>{row.category === "earning" ? "Earning" : "Deduction"}</span></td><td><div className="calculation-fields"><select className="ui-select" value={row.calcType} onChange={(event) => onUpdateRow(index, "calcType", event.target.value)}><option value="flat">Flat</option><option value="percent">Percent</option></select><div className="value-input"><input className="ui-input" type="number" min="0" step="0.01" value={row.calcValue} onChange={(event) => onUpdateRow(index, "calcValue", event.target.value)} /><span>{row.calcType === "percent" ? "%" : "₹"}</span></div></div></td><td className="amount-cell">{money(row.monthly)}</td><td className="amount-cell">{money(row.annual)}</td></tr>)}</tbody></table></div><div className="salary-editor-footer"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button variant="primary" loading={busy} onClick={onSave}>{editing ? "Save changes" : "Create breakup"}</Button></div></section><button type="button" className="salary-reset-link" onClick={onReset}>Reset form</button></div>;
}

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Search, X } from "lucide-react";
import { createPortal } from "react-dom";

import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { getCompanySettings } from "../../api/settingsApi";
import { useToast } from "../../context/ToastContext";
import { api } from "../api";
import "./PaySlips.css";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateText = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";
const monthText = (value) => value ? new Date(`${value}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "-";

function Detail({ label, value }) { return <div className="payslip-detail"><span>{label}</span><strong>{value || "-"}</strong></div>; }
function Row({ label, value, tone = "" }) { return <div className="payslip-line"><span>{label}</span><strong className={tone}>{money(value)}</strong></div>; }

function PayslipDocument({ record, detail, company, onClose }) {
  const breakdown = detail || record;
  const employee = record.employee || {};
  const components = Array.isArray(breakdown.components) ? breakdown.components : [];
  const gross = Number(breakdown.gross_pay || 0);
  const overtime = Number(breakdown.ot_pay || 0);
  const deductions = Number(breakdown.total_deductions ?? breakdown.deductions ?? 0);
  const net = Number(breakdown.net_pay || 0);
  const hasDeductionComponents = components.some((item) => item.category === "deduction");
  const print = () => window.print();
  return createPortal(<div className="payslip-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="payslip-modal"><div className="payslip-modal-toolbar"><span>Generated from attendance, leave, overtime, and payroll rules</span><div><Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={print}>Print / PDF</Button><button type="button" className="payslip-close" onClick={onClose} aria-label="Close payslip"><X className="h-4 w-4" /></button></div></div><article className="payslip-paper" id="payslip-print-area"><header className="payslip-company"><img src={company.logo_url || "/logo.png"} alt="Insights logo" /><div><h1>{company.name || "Insights"}</h1><p>{company.address || company.city || ""}</p><p>{company.email || ""}{company.phone ? ` · ${company.phone}` : ""}</p></div></header><div className="payslip-title"><strong>PAYSLIP</strong><span>For the month of {monthText(record.month)}</span></div><section className="payslip-identity"><Detail label="Employee ID" value={employee.employee_code || employee.employee_id || record.employee_id} /><Detail label="Employee Name" value={employee.full_name || record.emp} /><Detail label="Department" value={employee.department || record.dept} /><Detail label="Designation" value={employee.designation} /><Detail label="Pay period" value={`${dateText(record.period_start)} - ${dateText(record.period_end)}`} /><Detail label="Date of joining" value={dateText(employee.hire_date || employee.joining_date)} /><Detail label="Working days" value={breakdown.working_days} /><Detail label="Payable days" value={breakdown.payable_days} /></section><section className="payslip-attendance"><span>Present <b>{breakdown.present_days ?? 0}</b></span><span>Half days <b>{breakdown.half_days ?? 0}</b></span><span>Paid leave <b>{breakdown.paid_leave_days ?? 0}</b></span><span>LOP days <b>{breakdown.lop_days ?? 0}</b></span><span>Overtime <b>{breakdown.ot_hours ?? 0} hrs</b></span></section><div className="payslip-columns"><section className="payslip-panel"><h2>Earnings</h2>{components.filter((item) => item.category === "earning").map((item) => <Row key={item.name} label={item.name} value={item.monthly} />)}{!components.some((item) => item.category === "earning") ? <Row label="Gross pay" value={gross} /> : null}{overtime ? <Row label="Overtime" value={overtime} /> : null}<div className="payslip-total"><span>Total earnings</span><strong>{money(gross + overtime)}</strong></div></section><section className="payslip-panel"><h2>Deductions</h2>{components.filter((item) => item.category === "deduction").map((item) => <Row key={item.name} label={item.name} value={item.monthly} />)}{!hasDeductionComponents && breakdown.pf_deduction != null ? <Row label="Provident Fund" value={breakdown.pf_deduction} /> : null}{!hasDeductionComponents && breakdown.pt_deduction != null ? <Row label="Professional Tax" value={breakdown.pt_deduction} /> : null}{!hasDeductionComponents && breakdown.pf_deduction == null ? <Row label="Total deductions" value={deductions} /> : null}<div className="payslip-total"><span>Total deductions</span><strong>{money(deductions)}</strong></div></section></div><section className="payslip-net"><span>Net Pay</span><strong>{money(net)}</strong><small>Amount payable after attendance, leave, overtime, and statutory deductions</small></section><footer className="payslip-footer"><span>This is a system-generated payslip. No signature is required.</span><span>For {company.name || "Insights"}</span></footer></article></div></div>, document.body);
}

export default function PaySlips() {
  const { addToast } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState([]);
  const [company, setCompany] = useState({ name: "Insights", logo_url: "/logo.png" });
  const [viewRecord, setViewRecord] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.payslips.list(), api.employees.list(), getCompanySettings().catch(() => ({ data: {} }))]).then(([payslips, employees, settings]) => {
      const employeeMap = new Map(employees.map((employee) => [String(employee.id), employee]));
      setCompany({ name: "Insights", logo_url: settings.data?.logo_url || "/logo.png", address: settings.data?.address_line1, city: settings.data?.city, email: settings.data?.email, phone: settings.data?.phone });
      setRecords(payslips.map((payslip) => ({ ...payslip, employee: employeeMap.get(String(payslip.employee_id)) || {}, emp: employeeMap.get(String(payslip.employee_id))?.full_name || `Employee #${payslip.employee_id}`, month: payslip.period_start?.slice(0, 7) || "" })));
    }).catch(() => addToast("Could not load payslips. Run payroll for a month first.", "error")).finally(() => setLoading(false));
  }, [addToast]);

  const filtered = useMemo(() => records.filter((record) => new Date(`${record.month}-01`).getFullYear() === year && (!query.trim() || `${record.emp} ${record.employee.employee_code || ""}`.toLowerCase().includes(query.trim().toLowerCase()))), [records, query, year]);
  const openPayslip = async (record) => { setViewRecord(record); setDetail(null); setDetailLoading(true); try { setDetail(await api.payslips.breakdown(record.id)); } catch { addToast("Could not calculate the payslip breakdown.", "error"); } finally { setDetailLoading(false); } };
  if (loading) return <Loader label="Loading payslips..." />;
  return <div className="ui-page payslips-page"><header className="payslips-header"><div><p className="payslips-eyebrow">HR / Payroll</p><h1 className="ui-page-title">Payslips</h1><p className="ui-subtitle">Generate attendance-based payslips with live payroll calculations.</p></div><div className="payslips-year"><button type="button" onClick={() => setYear((value) => value - 1)} aria-label="Previous year">‹</button><strong>{year}</strong><button type="button" onClick={() => setYear((value) => value + 1)} aria-label="Next year">›</button></div></header><div className="payslips-search"><Search className="h-4 w-4" /><input aria-label="Search payslips" placeholder="Search employee" value={query} onChange={(event) => setQuery(event.target.value)} /></div>{!filtered.length ? <div className="ui-card payslips-empty">No calculated payslips found for {year}. Run payroll after attendance and leave are updated.</div> : <section className="ui-card payslips-list"><div className="payslips-table-wrap"><table><thead><tr>{["SR No.", "Employee", "Department", "Month", "Gross pay", "Deductions", "Net pay", "Status", "Action"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{filtered.map((record, index) => <tr key={record.id}><td>{index + 1}</td><td><strong>{record.emp}</strong><small>{record.employee.employee_code || ""}</small></td><td>{record.employee.department || "-"}</td><td>{monthText(record.month)}</td><td className="earnings-text">{money(record.gross_pay)}</td><td className="deductions-text">{money(record.deductions)}</td><td className="net-text">{money(record.net_pay)}</td><td><span className="payslip-status">{record.status}</span></td><td><Button variant="outline" size="sm" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => openPayslip(record)}>View</Button></td></tr>)}</tbody></table></div></section>}{viewRecord ? (detailLoading ? <Loader label="Calculating payslip..." /> : <PayslipDocument record={viewRecord} detail={detail} company={company} onClose={() => setViewRecord(null)} />) : null}</div>;
}

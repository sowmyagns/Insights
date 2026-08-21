import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Save, Search, X } from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { api } from "../api";
import "./StatutoryComponents.css";

const STATES = ["Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
const TABS = [{ id: "pf", label: "Provident Fund", code: "PF" }, { id: "pt", label: "Professional Tax", code: "PT" }, { id: "esic", label: "ESIC", code: "ESIC" }];
const DEFAULTS = {
  pf: { epfNumber: "", deductionCycle: "Monthly", employeeRate: "12", employerRate: "12", minimumLimit: false, includeCtc: false, components: ["Basic"], active: false },
  pt: { ptNumber: "", state: "", deductionCycle: "Monthly", slabs: [{ start: "", end: "", amount: "" }], dynamic: true, active: false },
  esic: { esicNumber: "", employeeRate: "0.75", employerRate: "3.25", includeCtc: false, allEmployees: false, active: false },
};

const LOCAL_KEY = "gns_statutory_settings";

function readLocalSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
    return saved ? { pf: { ...DEFAULTS.pf, ...saved.pf }, pt: { ...DEFAULTS.pt, ...saved.pt }, esic: { ...DEFAULTS.esic, ...saved.esic } } : null;
  } catch {
    return null;
  }
}

function Field({ label, children }) { return <label className="statutory-field"><span>{label}</span>{children}</label>; }
function Toggle({ checked, onChange }) { return <label className="statutory-toggle"><input type="checkbox" checked={checked} onChange={onChange} /><i /><b>{checked ? "Active" : "Inactive"}</b></label>; }
function CheckRow({ children, checked, onChange, radio = false }) { return <label className="statutory-check"><input type={radio ? "radio" : "checkbox"} checked={checked} onChange={onChange} /><span>{children}</span></label>; }

export default function StatutoryComponents() {
  const { addToast } = useToast();
  const [tab, setTab] = useState("pf");
  const [settings, setSettings] = useState(DEFAULTS);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const rows = await api.statutory.list();
      const next = { pf: { ...DEFAULTS.pf }, pt: { ...DEFAULTS.pt }, esic: { ...DEFAULTS.esic } };
      rows.forEach((row) => { if (next[row.setting_type]) next[row.setting_type] = { ...next[row.setting_type], ...(row.data || {}), active: Boolean(row.is_active) }; });
      setSettings(next);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    } catch (err) {
      const localSettings = readLocalSettings();
      if (localSettings) {
        setSettings(localSettings);
        setError("");
      } else {
        setSettings({ pf: { ...DEFAULTS.pf }, pt: { ...DEFAULTS.pt }, esic: { ...DEFAULTS.esic } });
        setError("");
      }
    }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const current = settings[tab];
  const update = (patch) => setSettings((all) => ({ ...all, [tab]: { ...all[tab], ...patch } }));
  const field = (key) => (event) => update({ [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value });
  const save = async () => {
    setSaving(true); setError("");
    try {
      await api.statutory.save(tab, { setting_type: tab, data: current, is_active: current.active ? 1 : 0 });
      addToast("Statutory settings saved.", "success");
    } catch {
      const saved = readLocalSettings() || { pf: { ...DEFAULTS.pf }, pt: { ...DEFAULTS.pt }, esic: { ...DEFAULTS.esic } };
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...saved, [tab]: current }));
      addToast("Saved on this device. Backend sync is unavailable.", "success");
    } finally {
      setSaving(false);
    }
    setEditing(false);
    await load();
  };
  const activeCount = useMemo(() => Object.values(settings).filter((item) => item.active).length, [settings]);
  if (loading) return <Loader label="Loading statutory settings..." />;
  return <div className="ui-page statutory-page">
    <header className="statutory-header"><div><p className="statutory-eyebrow">HR / Compliance</p><h1 className="ui-page-title">Statutory Components</h1><p className="ui-subtitle">Configure payroll deductions and employer contributions for your organisation.</p></div><span className="statutory-header-status">{activeCount} active</span></header>
    {error ? <div className="statutory-error"><span>{error}</span><button type="button" onClick={load}>Retry</button></div> : null}
    <section className="statutory-shell"><nav className="statutory-tabs">{TABS.map((item) => <button type="button" key={item.id} className={tab === item.id ? "is-active" : ""} onClick={() => { setTab(item.id); setEditing(false); }}><b>{item.code}</b><span><strong>{item.label}</strong><small>{settings[item.id].active ? "Active" : "Not configured"}</small></span></button>)}</nav><div className="statutory-content">{editing ? <Editor tab={tab} value={current} update={update} field={field} onSave={save} onCancel={() => setEditing(false)} saving={saving} /> : <Summary tab={tab} value={current} onEdit={() => setEditing(true)} />}</div></section>
  </div>;
}

function Summary({ tab, value, onEdit }) {
  const title = TABS.find((item) => item.id === tab).label;
  const rows = tab === "pf" ? [["EPF Number", value.epfNumber || "Not provided"], ["Deduction cycle", value.deductionCycle], ["Employee rate", `${value.employeeRate}% of actual PF wage`], ["Employer rate", `${value.employerRate}% of actual PF wage`], ["Minimum limit", value.minimumLimit ? "₹1,800" : "Not applied"], ["CTC inclusion", value.includeCtc ? "Included" : "Not included"], ["PF components", value.components?.join(", ") || "Not selected"]] : tab === "pt" ? [["PT Number", value.ptNumber || "Not provided"], ["Work location", value.state || "Not selected"], ["Deduction cycle", value.deductionCycle], ["Tax slabs", `${value.slabs?.length || 0} configured`], ["Calculation", value.dynamic ? "Dynamic by monthly gross" : "Fixed salary structure"]] : [["ESIC Number", value.esicNumber || "Not provided"], ["Employee rate", `${value.employeeRate}% of gross pay`], ["Employer rate", `${value.employerRate}% of gross pay`], ["Eligibility", value.allEmployees ? "All employees" : "Salary up to ₹21,000"], ["CTC inclusion", value.includeCtc ? "Included" : "Not included"]];
  return <div className="statutory-summary"><SectionHeading title={title} text="Review the current configuration before making changes."><Button variant="outline" size="sm" onClick={onEdit}>Edit settings</Button></SectionHeading><div className="statutory-summary-grid">{rows.map(([label, item]) => <div className="statutory-summary-row" key={label}><span>{label}</span><strong>{item}</strong></div>)}</div><div className={`statutory-active-note ${value.active ? "is-active" : ""}`}>{value.active ? `${title} is active and will be used in payroll calculations.` : `${title} is inactive. Edit settings to enable it.`}</div></div>;
}
function SectionHeading({ title, text, children }) { return <div className="statutory-section-heading"><div><h2>{title}</h2><p>{text}</p></div>{children}</div>; }
function Editor({ tab, value, update, field, onSave, onCancel, saving }) { return <div className="statutory-editor"><SectionHeading title={TABS.find((item) => item.id === tab).label} text="Complete the fields below and save your organisation's statutory rules."><Toggle checked={value.active} onChange={field("active")} /></SectionHeading>{tab === "pf" ? <PfForm value={value} update={update} field={field} /> : tab === "pt" ? <PtForm value={value} update={update} field={field} /> : <EsicForm value={value} field={field} />}<div className="statutory-form-footer"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button variant="primary" loading={saving} leftIcon={<Save className="h-4 w-4" />} onClick={onSave}>Save settings</Button></div></div>; }
function PfForm({ value, update, field }) { const [open, setOpen] = useState(false); const [search, setSearch] = useState(""); const choices = ["Basic", "DA", "HRA", "Other Allowance"].filter((item) => item.toLowerCase().includes(search.toLowerCase())); const toggle = (item) => update({ components: value.components.includes(item) ? value.components.filter((entry) => entry !== item) : [...value.components, item] }); return <div className="statutory-form-stack"><div className="statutory-grid statutory-grid-two"><Field label="EPF Number"><input className="ui-input" value={value.epfNumber} onChange={field("epfNumber")} placeholder="Enter EPF number" /></Field><Field label="Deduction cycle"><select className="ui-select" value={value.deductionCycle} onChange={field("deductionCycle")}><option>Monthly</option><option>Quarterly</option></select></Field></div><div className="statutory-grid statutory-grid-two"><Field label="Employee contribution"><div className="input-suffix"><input className="ui-input" type="number" value={value.employeeRate} onChange={field("employeeRate")} /><span>% of actual PF wage</span></div></Field><Field label="Employer contribution"><div className="input-suffix"><input className="ui-input" type="number" value={value.employerRate} onChange={field("employerRate")} /><span>% of actual PF wage</span></div></Field></div><div className="statutory-component-picker"><span className="statutory-field-label">Components for PF calculation</span><button type="button" className="ui-select statutory-picker-button" onClick={() => setOpen(!open)}><span>{value.components.join(", ") || "Select components"}</span><ChevronDown className="h-4 w-4" /></button>{open ? <div className="statutory-picker-menu"><div className="statutory-picker-search"><Search className="h-3.5 w-3.5" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search components" /></div>{choices.map((item) => <label key={item}><input type="checkbox" checked={value.components.includes(item)} onChange={() => toggle(item)} />{item}</label>)}</div> : null}</div><div className="statutory-options"><CheckRow checked={value.minimumLimit} onChange={field("minimumLimit")}>Set the minimum deduction limit to ₹1,800</CheckRow><CheckRow checked={value.includeCtc} onChange={field("includeCtc")}>Include employer contribution in CTC</CheckRow></div><InfoBox title="PF contribution adjustment">Contributions use the configured PF wage and are calculated proportionately for lower wages.</InfoBox></div>; }
function PtForm({ value, update, field }) { const [open, setOpen] = useState(false); const [search, setSearch] = useState(""); const states = STATES.filter((item) => item.toLowerCase().includes(search.toLowerCase())); const updateSlab = (index, key, next) => update({ slabs: value.slabs.map((slab, i) => i === index ? { ...slab, [key]: next } : slab) }); return <div className="statutory-form-stack"><div className="statutory-grid statutory-grid-three"><Field label="PT Number"><input className="ui-input" value={value.ptNumber} onChange={field("ptNumber")} placeholder="Enter PT number" /></Field><div className="statutory-field"><span>Work location (state)</span><button type="button" className="ui-select statutory-picker-button" onClick={() => setOpen(!open)}><span>{value.state || "Select state"}</span><ChevronDown className="h-4 w-4" /></button>{open ? <div className="statutory-picker-menu"><div className="statutory-picker-search"><Search className="h-3.5 w-3.5" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search state" /></div>{states.map((state) => <button type="button" key={state} onClick={() => { update({ state }); setOpen(false); }}>{state}</button>)}</div> : null}</div><Field label="Deduction cycle"><select className="ui-select" value={value.deductionCycle} onChange={field("deductionCycle")}><option>Monthly</option><option>Quarterly</option></select></Field></div><div className="statutory-slab-section"><div className="statutory-subheading"><div><h3>Tax slabs</h3><p>Set monthly tax amounts by gross salary range.</p></div><Button variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => update({ slabs: [...value.slabs, { start: "", end: "", amount: "" }] })}>Add slab</Button></div><div className="statutory-slab-head"><span>Start range</span><span>End range</span><span>Monthly tax</span><span /></div>{value.slabs.map((slab, index) => <div className="statutory-slab-row" key={index}><input className="ui-input" type="number" value={slab.start} onChange={(event) => updateSlab(index, "start", event.target.value)} placeholder="0" /><input className="ui-input" type="number" value={slab.end} onChange={(event) => updateSlab(index, "end", event.target.value)} placeholder="0" /><input className="ui-input" type="number" value={slab.amount} onChange={(event) => updateSlab(index, "amount", event.target.value)} placeholder="0" /><button type="button" className="statutory-remove" disabled={value.slabs.length === 1} onClick={() => update({ slabs: value.slabs.filter((_, i) => i !== index) })}><X className="h-4 w-4" /></button></div>)}</div><div className="statutory-options"><CheckRow radio checked={value.dynamic} onChange={() => update({ dynamic: true })}>Apply PT dynamically based on monthly gross salary</CheckRow><CheckRow radio checked={!value.dynamic} onChange={() => update({ dynamic: false })}>Use the fixed PT slab in the salary structure</CheckRow></div></div>; }
function EsicForm({ value, field }) { return <div className="statutory-form-stack"><Field label="ESIC Number"><input className="ui-input" value={value.esicNumber} onChange={field("esicNumber")} placeholder="Enter ESIC number" /></Field><div className="statutory-grid statutory-grid-two"><Field label="Employee contribution"><div className="input-suffix"><input className="ui-input" type="number" value={value.employeeRate} onChange={field("employeeRate")} /><span>% of gross pay</span></div></Field><Field label="Employer contribution"><div className="input-suffix"><input className="ui-input" type="number" value={value.employerRate} onChange={field("employerRate")} /><span>% of gross pay</span></div></Field></div><div className="statutory-options"><CheckRow checked={value.includeCtc} onChange={field("includeCtc")}>Include employer contribution in CTC</CheckRow><CheckRow radio checked={!value.allEmployees} onChange={() => field("allEmployees")({ target: { type: "checkbox", checked: false } })}>Apply ESIC up to ₹21,000 monthly salary</CheckRow><CheckRow radio checked={value.allEmployees} onChange={() => field("allEmployees")({ target: { type: "checkbox", checked: true } })}>Include ESIC for all employees</CheckRow></div><InfoBox title="ESIC eligibility">The standard employee rate is 0.75% and employer rate is 3.25% of gross pay.</InfoBox></div>; }
function InfoBox({ title, children }) { return <div className="statutory-info"><strong>{title}</strong><span>{children}</span></div>; }

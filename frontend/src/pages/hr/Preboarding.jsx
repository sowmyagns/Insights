import { useState } from "react";
import { createPortal } from "react-dom";

const MOCK = [
  { id:1, name:"Ananya Krishnan",  designation:"Software Engineer", branch:"Head Office", dept:"Engineering",  email:"ananya@example.com", phone:"9876543210", doj:"2025-08-01", status:"Offer Sent",    task:"Document Collection" },
  { id:2, name:"Rohit Verma",      designation:"Sales Executive",   branch:"Branch 1",    dept:"Sales",        email:"rohit@example.com",  phone:"9876543211", doj:"2025-08-05", status:"Docs Pending",  task:"ID Verification" },
  { id:3, name:"Sneha Iyer",       designation:"HR Executive",      branch:"Head Office", dept:"HR",           email:"sneha@example.com",  phone:"9876543212", doj:"2025-08-10", status:"Ready to Join", task:"System Access" },
  { id:4, name:"Kiran Babu",       designation:"Accountant",        branch:"Branch 2",    dept:"Finance",      email:"kiran@example.com",  phone:"9876543213", doj:"2025-08-15", status:"Offer Sent",    task:"Document Collection" },
];

const EMPTY_FORM = { firstName:"", lastName:"", gender:"", designation:"", email:"", mobile:"", employmentType:"", branch:"", department:"", doj:"" };
const STATUS_STYLE = { "Offer Sent":["#eff6ff","#1d4ed8"], "Docs Pending":["#fef9c3","#854d0e"], "Ready to Join":["#dcfce7","#15803d"] };

function AddModal({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return createPortal(
    <div style={{ position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,17,23,0.45)",backdropFilter:"blur(2px)",padding:16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--color-surface)",borderRadius:16,width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px 14px",borderBottom:"1px solid var(--color-border-soft)" }}>
          <h3 style={{ margin:0,fontSize:16,fontWeight:700,color:"var(--color-text)" }}>Add Candidate</h3>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:"50%",border:"none",background:"var(--color-surface-muted)",cursor:"pointer",fontSize:15,color:"var(--color-text-muted)" }}>✕</button>
        </div>
        <div style={{ padding:"18px 22px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          <div><label className="ui-label">First Name *</label><input className="ui-input" placeholder="First name" value={form.firstName} onChange={set("firstName")} /></div>
          <div><label className="ui-label">Last Name *</label><input className="ui-input" placeholder="Last name" value={form.lastName} onChange={set("lastName")} /></div>
          <div><label className="ui-label">Gender</label><select className="ui-select" value={form.gender} onChange={set("gender")}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
          <div><label className="ui-label">Designation *</label><input className="ui-input" placeholder="e.g. Software Engineer" value={form.designation} onChange={set("designation")} /></div>
          <div><label className="ui-label">Email *</label><input className="ui-input" type="email" placeholder="Email address" value={form.email} onChange={set("email")} /></div>
          <div><label className="ui-label">Mobile *</label><input className="ui-input" placeholder="Mobile number" value={form.mobile} onChange={set("mobile")} /></div>
          <div><label className="ui-label">Employment Type</label><select className="ui-select" value={form.employmentType} onChange={set("employmentType")}><option value="">Select</option><option>Permanent</option><option>Contract</option><option>Intern</option></select></div>
          <div><label className="ui-label">Branch</label><select className="ui-select" value={form.branch} onChange={set("branch")}><option value="">Select</option><option>Head Office</option><option>Branch 1</option><option>Branch 2</option></select></div>
          <div><label className="ui-label">Department</label><input className="ui-input" placeholder="Department" value={form.department} onChange={set("department")} /></div>
          <div><label className="ui-label">Expected Date of Joining</label><input className="ui-input" type="date" value={form.doj} onChange={set("doj")} /></div>
        </div>
        <div style={{ display:"flex",justifyContent:"flex-end",gap:10,padding:"12px 22px 18px",borderTop:"1px solid var(--color-border-soft)" }}>
          <button className="ui-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="ui-btn-primary" onClick={() => {
            if (!form.firstName.trim() || !form.email.trim()) return;
            onSave({ id:Date.now(), name:`${form.firstName} ${form.lastName}`.trim(), designation:form.designation, branch:form.branch||"Head Office", dept:form.department, email:form.email, phone:form.mobile, doj:form.doj, status:"Offer Sent", task:"Document Collection" });
          }}>Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Preboarding() {
  const [tab, setTab] = useState("manage");
  const [step, setStep] = useState("offers");
  const [records, setRecords] = useState(MOCK);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const active   = records.filter((r) => r.status !== "Archived");
  const archived = records.filter((r) => r.status === "Archived");
  const list     = (tab === "manage" ? active : archived).filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  const KPI = ({ label, value, color }) => (
    <div className="ui-card" style={{ padding:"12px 16px" }}>
      <div style={{ fontSize:11,fontWeight:600,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:24,fontWeight:800,color }}>{value}</div>
    </div>
  );

  const thisWeek = active.filter((r) => {
    if (!r.doj) return false;
    const d = new Date(r.doj), now = new Date();
    const diff = (d - now) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;

  return (
    <div className="ui-page" style={{ paddingTop:20,paddingBottom:32 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ margin:0,fontSize:20,fontWeight:700,color:"var(--color-text)" }}>Preboarding</h1>
          <p style={{ margin:"4px 0 0",fontSize:13,color:"var(--color-text-muted)" }}>Manage candidates before they officially join.</p>
        </div>
        <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowAdd(true)}>+ Add Candidate</button>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16 }}>
        <KPI label="Total Preboarding"  value={active.length}                                                    color="var(--color-primary)" />
        <KPI label="Docs Pending"       value={active.filter((r) => r.status === "Docs Pending").length}         color="#854d0e" />
        <KPI label="Joining This Week"  value={thisWeek}                                                         color="#1d4ed8" />
        <KPI label="Ready to Join"      value={active.filter((r) => r.status === "Ready to Join").length}        color="#15803d" />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",alignItems:"center",gap:4,borderBottom:"2px solid var(--color-border)",marginBottom:0 }}>
        {[{ id:"manage",label:"Manage Candidates" },{ id:"archived",label:"Archived Candidates" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"8px 18px",fontSize:13,fontWeight:600,border:"none",background:"transparent",cursor:"pointer",color: tab===t.id ? "var(--color-primary)" : "var(--color-text-muted)",borderBottom: tab===t.id ? "2px solid var(--color-primary)" : "2px solid transparent",marginBottom:-2,transition:"all .15s" }}>{t.label}</button>
        ))}
      </div>

      {/* Sub-steps */}
      {tab === "manage" && (
        <div style={{ display:"flex",gap:6,padding:"12px 0",borderBottom:"1px solid var(--color-border-muted)",marginBottom:14 }}>
          {[{ id:"offers",label:"Manage Offers" },{ id:"docs",label:"Manage Documents" },{ id:"joiners",label:"New Joiners" }].map((s) => (
            <button key={s.id} onClick={() => setStep(s.id)} style={{ padding:"5px 14px",fontSize:12,fontWeight:600,borderRadius:20,border:"1.5px solid",borderColor: step===s.id ? "var(--color-primary)" : "var(--color-border)",background: step===s.id ? "var(--color-primary)" : "transparent",color: step===s.id ? "#fff" : "var(--color-text-muted)",cursor:"pointer",transition:"all .15s" }}>{s.label}</button>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ position:"relative",marginBottom:14,maxWidth:280 }}>
        <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--color-text-muted)",fontSize:14,pointerEvents:"none" }}>🔍</span>
        <input className="ui-input" style={{ paddingLeft:32,minHeight:34,fontSize:12 }} placeholder="Search candidate…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="ui-card" style={{ padding:0,overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:900 }}>
            <thead>
              <tr style={{ background:"var(--color-surface-thead)" }}>
                {["SR No.","Candidate Name","Designation","Branch","Department","Contact Info","Date of Joining","Task","Status","Action"].map((h) => (
                  <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11.5,fontWeight:700,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border)",whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={10} className="ui-empty">No records found</td></tr>
              ) : list.map((r, i) => {
                const [bg, fg] = STATUS_STYLE[r.status] || ["#f3f3f6","#6b6b76"];
                return (
                  <tr key={r.id} style={{ borderBottom:"1px solid var(--color-border-muted)" }}>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-muted)" }}>{i+1}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <div style={{ width:30,height:30,borderRadius:"50%",background:"var(--color-primary-soft)",color:"var(--color-primary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0 }}>{r.name[0]}</div>
                        <span style={{ fontSize:13,fontWeight:600,color:"var(--color-text)" }}>{r.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{r.designation}</td>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{r.branch}</td>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{r.dept}</td>
                    <td style={{ padding:"10px 14px",fontSize:12,color:"var(--color-text-muted)" }}>{r.email}<br/>{r.phone}</td>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{r.doj || "—"}</td>
                    <td style={{ padding:"10px 14px",fontSize:12,color:"var(--color-text-secondary)" }}>{r.task}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:bg,color:fg }}>{r.status}</span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex",gap:5 }}>
                        <button title="Convert to Employee" onClick={() => setRecords((p) => p.map((x) => x.id===r.id ? { ...x,status:"Ready to Join" } : x))} style={{ padding:"4px 8px",fontSize:11,fontWeight:600,borderRadius:6,border:"none",background:"var(--color-primary-soft)",color:"var(--color-primary)",cursor:"pointer" }}>Convert</button>
                        <button title="Archive" onClick={() => setRecords((p) => p.map((x) => x.id===r.id ? { ...x,status:"Archived" } : x))} style={{ width:26,height:26,borderRadius:"50%",border:"none",background:"var(--color-surface-muted)",color:"var(--color-text-muted)",cursor:"pointer",fontSize:12 }}>📦</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:"10px 16px",borderTop:"1px solid var(--color-border-muted)",fontSize:12,color:"var(--color-text-muted)" }}>
          Showing {list.length} of {(tab==="manage"?active:archived).length} entries
        </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSave={(r) => { setRecords((p) => [...p,r]); setShowAdd(false); }} />}
    </div>
  );
}

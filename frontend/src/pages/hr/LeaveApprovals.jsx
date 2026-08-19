import { useState } from "react";
import { createPortal } from "react-dom";

const MOCK = [
  { id:1, emp:"Ravi Kumar",      type:"Sick Leave",        from:"2025-07-01", to:"2025-07-02", days:2, reason:"Fever",          status:"Pending",  createdBy:"Ravi Kumar" },
  { id:2, emp:"Priya Sharma",    type:"Casual Leave",      from:"2025-07-05", to:"2025-07-05", days:1, reason:"Personal work",  status:"Pending",  createdBy:"Priya Sharma" },
  { id:3, emp:"Arjun Singh",     type:"Earned Leave",      from:"2025-06-20", to:"2025-06-22", days:3, reason:"Family trip",    status:"Approved", createdBy:"Arjun Singh" },
  { id:4, emp:"Meena Patel",     type:"Maternity Leave",   from:"2025-07-10", to:"2025-09-10", days:62,reason:"Maternity",      status:"Approved", createdBy:"Meena Patel" },
  { id:5, emp:"Suresh Reddy",    type:"Leave Without Pay", from:"2025-07-08", to:"2025-07-09", days:2, reason:"Emergency",      status:"Rejected", createdBy:"Suresh Reddy" },
  { id:6, emp:"Kavitha Nair",    type:"Compensatory Off",  from:"2025-07-12", to:"2025-07-12", days:1, reason:"Worked Sunday",  status:"Pending",  createdBy:"Kavitha Nair" },
  { id:7, emp:"Deepak Joshi",    type:"Sick Leave",        from:"2025-07-15", to:"2025-07-16", days:2, reason:"Cold & cough",   status:"Pending",  createdBy:"Deepak Joshi" },
];

const STATUS_STYLE = {
  Pending:  ["#fef9c3","#854d0e"],
  Approved: ["#dcfce7","#15803d"],
  Rejected: ["#fde8e8","#dc2626"],
};

const LEAVE_TYPES = ["Casual Leave","Compensatory Off","Earned Leave","Leave Without Pay","Maternity Leave","Paternity Leave","Sabbatical Leave","Sick Leave"];

function ApplyModal({ onClose, onSave }) {
  const [form, setForm] = useState({ emp:"", type:"", from:"", to:"", reason:"" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const days = form.from && form.to ? Math.max(0, Math.round((new Date(form.to) - new Date(form.from)) / 86400000) + 1) : 0;
  return createPortal(
    <div style={{ position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,17,23,0.45)",backdropFilter:"blur(2px)",padding:16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--color-surface)",borderRadius:16,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px 14px",borderBottom:"1px solid var(--color-border-soft)" }}>
          <h3 style={{ margin:0,fontSize:16,fontWeight:700,color:"var(--color-text)" }}>Leave Request</h3>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:"50%",border:"none",background:"var(--color-surface-muted)",cursor:"pointer",fontSize:15,color:"var(--color-text-muted)" }}>✕</button>
        </div>
        <div style={{ padding:"18px 22px",display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <label className="ui-label">Employee *</label>
            <input className="ui-input" placeholder="Employee name" value={form.emp} onChange={set("emp")} />
          </div>
          <div>
            <label className="ui-label">Leave Type *</label>
            <select className="ui-select" value={form.type} onChange={set("type")}>
              <option value="">Select Leave Type</option>
              {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div><label className="ui-label">From *</label><input className="ui-input" type="date" value={form.from} onChange={set("from")} /></div>
            <div><label className="ui-label">To *</label><input className="ui-input" type="date" value={form.to} onChange={set("to")} /></div>
          </div>
          <div style={{ display:"flex",gap:20,fontSize:12,color:"var(--color-text-muted)",background:"var(--color-surface-muted)",padding:"8px 12px",borderRadius:8 }}>
            <span>Number of days: <b style={{ color:"var(--color-text)" }}>{days}</b></span>
            <span>Remaining Leaves: <b style={{ color:"var(--color-text)" }}>10</b></span>
          </div>
          <div><label className="ui-label">Reason *</label><textarea className="ui-textarea" placeholder="Enter reason" rows={3} value={form.reason} onChange={set("reason")} /></div>
          <div><label className="ui-label">Attachment</label><button className="ui-btn-outline ui-btn--sm">＋ Upload Document</button></div>
        </div>
        <div style={{ display:"flex",justifyContent:"flex-end",gap:10,padding:"12px 22px 18px",borderTop:"1px solid var(--color-border-soft)" }}>
          <button className="ui-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="ui-btn-primary" onClick={() => {
            if (!form.emp.trim() || !form.type || !form.from || !form.to) return;
            onSave({ id: Date.now(), emp: form.emp, type: form.type, from: form.from, to: form.to, days, reason: form.reason, status:"Pending", createdBy: form.emp });
          }}>Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function LeaveApprovals() {
  const [records, setRecords] = useState(MOCK);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState("All");
  const [empSearch, setEmpSearch] = useState("");
  const [showApply, setShowApply] = useState(false);

  const navMonth = (d) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(y, m - 1 + d, 1).toISOString().slice(0, 7));
  };

  const filtered = records.filter((r) => {
    const inMonth = r.from.startsWith(month);
    const byStatus = statusFilter === "All" || r.status === statusFilter;
    const byEmp = !empSearch || r.emp.toLowerCase().includes(empSearch.toLowerCase());
    return inMonth && byStatus && byEmp;
  });

  const approve = (id) => setRecords((p) => p.map((r) => r.id === id ? { ...r, status:"Approved" } : r));
  const reject  = (id) => setRecords((p) => p.map((r) => r.id === id ? { ...r, status:"Rejected" } : r));
  const remove  = (id) => setRecords((p) => p.filter((r) => r.id !== id));

  const total    = records.length;
  const pending  = records.filter((r) => r.status === "Pending").length;
  const approved = records.filter((r) => r.status === "Approved").length;
  const rejected = records.filter((r) => r.status === "Rejected").length;

  const KPI = ({ label, value, color }) => (
    <div className="ui-card" style={{ padding:"12px 16px" }}>
      <div style={{ fontSize:11,fontWeight:600,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:24,fontWeight:800,color }}>{value}</div>
    </div>
  );

  return (
    <div className="ui-page" style={{ paddingTop:20,paddingBottom:32 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ margin:0,fontSize:20,fontWeight:700,color:"var(--color-text)" }}>Leave Approvals</h1>
          <p style={{ margin:"4px 0 0",fontSize:13,color:"var(--color-text-muted)" }}>Review and approve employee leave requests.</p>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(-1)}>‹</button>
          <span style={{ fontSize:13,fontWeight:600,color:"var(--color-text)",minWidth:90,textAlign:"center" }}>
            {new Date(month + "-01").toLocaleString("default", { month:"short", year:"numeric" })}
          </span>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(1)}>›</button>
          <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowApply(true)}>+ Leave Request</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16 }}>
        <KPI label="Total Requests" value={total}    color="var(--color-primary)" />
        <KPI label="Pending"        value={pending}  color="#854d0e" />
        <KPI label="Approved"       value={approved} color="#15803d" />
        <KPI label="Rejected"       value={rejected} color="#dc2626" />
      </div>

      {/* Filters */}
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap" }}>
        <div style={{ position:"relative",flex:1,minWidth:200 }}>
          <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--color-text-muted)",fontSize:14,pointerEvents:"none" }}>🔍</span>
          <input className="ui-input" style={{ paddingLeft:32,minHeight:36,fontSize:13 }} placeholder="Search employee…" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} />
        </div>
        {["All","Pending","Approved","Rejected"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ padding:"6px 14px",fontSize:12,fontWeight:600,borderRadius:20,border:"1.5px solid",borderColor: statusFilter===s ? "var(--color-primary)" : "var(--color-border)",background: statusFilter===s ? "var(--color-primary)" : "transparent",color: statusFilter===s ? "#fff" : "var(--color-text-muted)",cursor:"pointer",transition:"all .15s" }}>{s}</button>
        ))}
      </div>

      <div className="ui-card" style={{ padding:0,overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:900 }}>
            <thead>
              <tr style={{ background:"var(--color-surface-thead)" }}>
                {["SR No.","Employee","Leave Type","From","To","Days","Reason","Status","Action"].map((h) => (
                  <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11.5,fontWeight:700,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border)",whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="ui-empty">No records found</td></tr>
              ) : filtered.map((r, i) => {
                const [bg, fg] = STATUS_STYLE[r.status] || ["#f3f3f6","#6b6b76"];
                return (
                  <tr key={r.id} style={{ borderBottom:"1px solid var(--color-border-muted)" }}>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-muted)" }}>{i+1}</td>
                    <td style={{ padding:"10px 14px",fontSize:13,fontWeight:600,color:"var(--color-text)" }}>{r.emp}</td>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{r.type}</td>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{r.from}</td>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{r.to}</td>
                    <td style={{ padding:"10px 14px",fontSize:13,fontWeight:600,color:"var(--color-text)" }}>{r.days}</td>
                    <td style={{ padding:"10px 14px",fontSize:12,color:"var(--color-text-muted)",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.reason}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:bg,color:fg }}>{r.status}</span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex",gap:5 }}>
                        {r.status === "Pending" && <>
                          <button title="Approve" onClick={() => approve(r.id)} style={{ padding:"4px 10px",fontSize:11,fontWeight:700,borderRadius:6,border:"none",background:"#dcfce7",color:"#15803d",cursor:"pointer" }}>✓ Approve</button>
                          <button title="Reject"  onClick={() => reject(r.id)}  style={{ padding:"4px 10px",fontSize:11,fontWeight:700,borderRadius:6,border:"none",background:"#fde8e8",color:"#dc2626",cursor:"pointer" }}>✕ Reject</button>
                        </>}
                        <button title="Delete" onClick={() => remove(r.id)} style={{ width:26,height:26,borderRadius:"50%",border:"none",background:"var(--color-surface-muted)",color:"var(--color-text-muted)",cursor:"pointer",fontSize:12 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderTop:"1px solid var(--color-border-muted)",flexWrap:"wrap",gap:8 }}>
          <span style={{ fontSize:12,color:"var(--color-text-muted)" }}>Showing {filtered.length} of {records.length} entries</span>
        </div>
      </div>

      {showApply && <ApplyModal onClose={() => setShowApply(false)} onSave={(r) => { setRecords((p) => [...p, r]); setShowApply(false); }} />}
    </div>
  );
}

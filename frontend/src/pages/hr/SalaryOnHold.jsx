import { useState } from "react";
import { createPortal } from "react-dom";

const INR = (n) => "₹" + Number(n).toLocaleString("en-IN");
const MONTHS_OPTS = Array.from({ length:12 }, (_, i) => {
  const d = new Date(2025, i, 1);
  return { value: d.toISOString().slice(0,7), label: d.toLocaleString("default",{ month:"short", year:"numeric" }) };
});

function HoldModal({ onClose, onSave }) {
  const [form, setForm] = useState({ emp:"", month:"", reason:"" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return createPortal(
    <div style={{ position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,17,23,0.45)",backdropFilter:"blur(2px)",padding:16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--color-surface)",borderRadius:16,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px 14px",borderBottom:"1px solid var(--color-border-soft)" }}>
          <h3 style={{ margin:0,fontSize:16,fontWeight:700,color:"var(--color-text)" }}>Put Salary On Hold</h3>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:"50%",border:"none",background:"var(--color-surface-muted)",cursor:"pointer",fontSize:15,color:"var(--color-text-muted)" }}>✕</button>
        </div>
        <div style={{ padding:"18px 22px",display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <label className="ui-label">Employee *</label>
            <input className="ui-input" placeholder="Employee name" value={form.emp} onChange={set("emp")} />
          </div>
          <div>
            <label className="ui-label">Month *</label>
            <select className="ui-select" value={form.month} onChange={set("month")}>
              <option value="">Select Month</option>
              {MONTHS_OPTS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="ui-label">Reason for Hold *</label>
            <textarea className="ui-textarea" placeholder="Enter reason" rows={3} value={form.reason} onChange={set("reason")} />
          </div>
        </div>
        <div style={{ display:"flex",justifyContent:"flex-end",gap:10,padding:"12px 22px 18px",borderTop:"1px solid var(--color-border-soft)" }}>
          <button className="ui-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="ui-btn-primary" onClick={() => {
            if (!form.emp.trim() || !form.month || !form.reason.trim()) return;
            onSave({ id:Date.now(), emp:form.emp, dept:"—", month:form.month, paidDays:0, deduct:0, gross:0, net:0, reason:form.reason, status:"On Hold", updatedBy:"HR Admin" });
          }}>Put On Hold</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function SalaryOnHold() {
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [showHold, setShowHold] = useState(false);
  const [releaseId, setReleaseId] = useState(null);

  const navMonth = (d) => {
    if (!month) { setMonth(new Date().toISOString().slice(0,7)); return; }
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(y, m-1+d, 1).toISOString().slice(0,7));
  };

  const filtered = records.filter((r) => {
    const byMonth = !month || r.month === month;
    const byEmp   = !empSearch || r.emp.toLowerCase().includes(empSearch.toLowerCase());
    return byMonth && byEmp;
  });

  const onHold   = records.filter((r) => r.status === "On Hold").length;
  const released = records.filter((r) => r.status === "Released").length;

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
          <h1 style={{ margin:0,fontSize:20,fontWeight:700,color:"var(--color-text)" }}>Salary On Hold</h1>
          <p style={{ margin:"4px 0 0",fontSize:13,color:"var(--color-text-muted)" }}>Manage salaries that are held or pending release.</p>
        </div>
        <button className="ui-btn-primary ui-btn--sm" onClick={() => setShowHold(true)}>+ Put On Hold</button>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16 }}>
        <KPI label="Total Records" value={records.length} color="var(--color-primary)" />
        <KPI label="On Hold"       value={onHold}         color="#854d0e" />
        <KPI label="Released"      value={released}       color="#15803d" />
      </div>

      {/* Filters */}
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap" }}>
        <div style={{ position:"relative",flex:1,minWidth:200 }}>
          <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--color-text-muted)",fontSize:14,pointerEvents:"none" }}>🔍</span>
          <input className="ui-input" style={{ paddingLeft:32,minHeight:36,fontSize:13 }} placeholder="Search employee…" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} />
        </div>
        <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(-1)}>‹</button>
        <span style={{ fontSize:13,fontWeight:600,color:"var(--color-text)",minWidth:100,textAlign:"center" }}>
          {month ? new Date(month+"-01").toLocaleString("default",{ month:"short",year:"numeric" }) : "All Months"}
        </span>
        <button className="ui-btn-outline ui-btn--sm" onClick={() => navMonth(1)}>›</button>
        {month && <button className="ui-btn-outline ui-btn--sm" onClick={() => setMonth("")}>Clear</button>}
      </div>

      <div className="ui-card" style={{ padding:0,overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:800 }}>
            <thead>
              <tr style={{ background:"var(--color-surface-thead)" }}>
                {["SR No.","Employee","Department","Month","Paid Days","Deductions","Gross Pay","Net Pay","Reason","Status","Action"].map((h) => (
                  <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11.5,fontWeight:700,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border)",whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="ui-empty">No records found</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ borderBottom:"1px solid var(--color-border-muted)" }}>
                  <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-muted)" }}>{i+1}</td>
                  <td style={{ padding:"10px 14px",fontSize:13,fontWeight:600,color:"var(--color-text)" }}>{r.emp}</td>
                  <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{r.dept}</td>
                  <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>
                    {r.month ? new Date(r.month+"-01").toLocaleString("default",{ month:"short",year:"numeric" }) : "—"}
                  </td>
                  <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{r.paidDays || "—"}</td>
                  <td style={{ padding:"10px 14px",fontSize:13,color:"#dc2626",fontWeight:600 }}>{r.deduct ? INR(r.deduct) : "—"}</td>
                  <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{r.gross ? INR(r.gross) : "—"}</td>
                  <td style={{ padding:"10px 14px",fontSize:13,fontWeight:700,color:"var(--color-primary)" }}>{r.net ? INR(r.net) : "—"}</td>
                  <td style={{ padding:"10px 14px",fontSize:12,color:"var(--color-text-muted)",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.reason}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background: r.status==="On Hold" ? "#fef9c3" : "#dcfce7",color: r.status==="On Hold" ? "#854d0e" : "#15803d" }}>{r.status}</span>
                  </td>
                  <td style={{ padding:"10px 14px" }}>
                    {r.status === "On Hold" ? (
                      <button onClick={() => setReleaseId(r.id)} style={{ padding:"4px 10px",fontSize:11,fontWeight:700,borderRadius:6,border:"none",background:"#dcfce7",color:"#15803d",cursor:"pointer" }}>Release</button>
                    ) : (
                      <span style={{ fontSize:12,color:"var(--color-text-muted)" }}>Released</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:"10px 16px",borderTop:"1px solid var(--color-border-muted)",fontSize:12,color:"var(--color-text-muted)" }}>
          Showing {filtered.length} of {records.length} entries
        </div>
      </div>

      {showHold && <HoldModal onClose={() => setShowHold(false)} onSave={(r) => { setRecords((p) => [...p,r]); setShowHold(false); }} />}

      {releaseId && createPortal(
        <div style={{ position:"fixed",inset:0,zIndex:90,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,17,23,0.45)",backdropFilter:"blur(2px)",padding:16 }}>
          <div style={{ background:"var(--color-surface)",borderRadius:16,padding:"28px 24px",maxWidth:360,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize:32,marginBottom:12 }}>💰</div>
            <h3 style={{ margin:"0 0 8px",fontSize:17,fontWeight:700,color:"var(--color-text)" }}>Release Salary?</h3>
            <p style={{ margin:"0 0 20px",fontSize:13,color:"var(--color-text-muted)" }}>This will mark the salary as released and include it in the next payroll run.</p>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <button className="ui-btn-secondary" onClick={() => setReleaseId(null)}>Cancel</button>
              <button className="ui-btn-success" onClick={() => { setRecords((p) => p.map((r) => r.id===releaseId ? { ...r,status:"Released" } : r)); setReleaseId(null); }}>Release</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

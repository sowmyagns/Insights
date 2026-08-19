import { useState } from "react";
import { createPortal } from "react-dom";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const MOCK_EMPLOYEES = [
  { id:1, name:"Ravi Kumar",    dept:"Engineering", base:45000, bonus:5000, deduct:6750, net:43250 },
  { id:2, name:"Priya Sharma",  dept:"HR",          base:38000, bonus:2000, deduct:5700, net:34300 },
  { id:3, name:"Arjun Singh",   dept:"Sales",       base:42000, bonus:8000, deduct:6300, net:43700 },
  { id:4, name:"Meena Patel",   dept:"Finance",     base:40000, bonus:3000, deduct:6000, net:37000 },
  { id:5, name:"Suresh Reddy",  dept:"Engineering", base:50000, bonus:6000, deduct:7500, net:48500 },
];

const INR = (n) => "₹" + Number(n).toLocaleString("en-IN");

function PayrollDetailModal({ month, year, onClose }) {
  return createPortal(
    <div style={{ position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,17,23,0.45)",backdropFilter:"blur(2px)",padding:16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--color-surface)",borderRadius:16,width:"100%",maxWidth:700,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px 14px",borderBottom:"1px solid var(--color-border-soft)" }}>
          <h3 style={{ margin:0,fontSize:16,fontWeight:700,color:"var(--color-text)" }}>Payroll — {MONTHS[month]} {year}</h3>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:"50%",border:"none",background:"var(--color-surface-muted)",cursor:"pointer",fontSize:15,color:"var(--color-text-muted)" }}>✕</button>
        </div>
        <div style={{ padding:"18px 22px" }}>
          {/* Summary */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18 }}>
            {[
              { label:"Employees",   value:MOCK_EMPLOYEES.length,                                                    color:"var(--color-primary)" },
              { label:"Gross Pay",   value:INR(MOCK_EMPLOYEES.reduce((s,e)=>s+e.base+e.bonus,0)),                   color:"#15803d" },
              { label:"Deductions",  value:INR(MOCK_EMPLOYEES.reduce((s,e)=>s+e.deduct,0)),                         color:"#dc2626" },
              { label:"Net Pay",     value:INR(MOCK_EMPLOYEES.reduce((s,e)=>s+e.net,0)),                            color:"#1d4ed8" },
            ].map((k) => (
              <div key={k.label} className="ui-card" style={{ padding:"10px 14px" }}>
                <div style={{ fontSize:10,fontWeight:600,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3 }}>{k.label}</div>
                <div style={{ fontSize:18,fontWeight:800,color:k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
          <div style={{ overflowX:"auto",borderRadius:10,border:"1px solid var(--color-border-muted)" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",minWidth:600 }}>
              <thead>
                <tr style={{ background:"var(--color-surface-thead)" }}>
                  {["Employee","Department","Base","Bonus","Deductions","Net Pay"].map((h) => (
                    <th key={h} style={{ padding:"9px 14px",textAlign:"left",fontSize:11.5,fontWeight:700,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border)",whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_EMPLOYEES.map((e) => (
                  <tr key={e.id} style={{ borderBottom:"1px solid var(--color-border-muted)" }}>
                    <td style={{ padding:"9px 14px",fontSize:13,fontWeight:600,color:"var(--color-text)" }}>{e.name}</td>
                    <td style={{ padding:"9px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{e.dept}</td>
                    <td style={{ padding:"9px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{INR(e.base)}</td>
                    <td style={{ padding:"9px 14px",fontSize:13,color:"#15803d",fontWeight:600 }}>{INR(e.bonus)}</td>
                    <td style={{ padding:"9px 14px",fontSize:13,color:"#dc2626",fontWeight:600 }}>{INR(e.deduct)}</td>
                    <td style={{ padding:"9px 14px",fontSize:13,fontWeight:700,color:"var(--color-primary)" }}>{INR(e.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display:"flex",justifyContent:"flex-end",gap:10,padding:"12px 22px 18px",borderTop:"1px solid var(--color-border-soft)" }}>
          <button className="ui-btn-outline" onClick={onClose}>Close</button>
          <button className="ui-btn-primary">📥 Export PDF</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function MonthlyPay() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [generated, setGenerated] = useState({ [`${new Date().getFullYear()}-${new Date().getMonth()}`]: true });
  const [confirm, setConfirm] = useState(null);   // { month, year }
  const [detail, setDetail]   = useState(null);   // { month, year }

  const totalNet   = MOCK_EMPLOYEES.reduce((s,e) => s+e.net, 0);
  const totalGross = MOCK_EMPLOYEES.reduce((s,e) => s+e.base+e.bonus, 0);
  const totalDeduct= MOCK_EMPLOYEES.reduce((s,e) => s+e.deduct, 0);

  const isGenerated = (m) => Boolean(generated[`${year}-${m}`]);

  return (
    <div className="ui-page" style={{ paddingTop:20,paddingBottom:32 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ margin:0,fontSize:20,fontWeight:700,color:"var(--color-text)" }}>Monthly Pay</h1>
          <p style={{ margin:"4px 0 0",fontSize:13,color:"var(--color-text-muted)" }}>Generate and manage monthly payroll.</p>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => setYear((y) => y-1)}>‹</button>
          <span style={{ fontSize:14,fontWeight:700,color:"var(--color-text)",minWidth:52,textAlign:"center" }}>{year}</span>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => setYear((y) => y+1)}>›</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
        {[
          { label:"Employees Processed", value:MOCK_EMPLOYEES.length,                                                  color:"var(--color-primary)" },
          { label:"Total Gross Pay",      value:INR(totalGross),                                                       color:"#15803d" },
          { label:"Total Deductions",     value:INR(totalDeduct),                                                      color:"#dc2626" },
          { label:"Total Net Pay",        value:INR(totalNet),                                                         color:"#1d4ed8" },
        ].map((k) => (
          <div key={k.label} className="ui-card" style={{ padding:"12px 16px" }}>
            <div style={{ fontSize:11,fontWeight:600,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:22,fontWeight:800,color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* 12-month grid */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
        {MONTHS.map((m, i) => {
          const gen = isGenerated(i);
          const isPast = i <= new Date().getMonth() || year < new Date().getFullYear();
          return (
            <div key={m} className="ui-card" style={{ padding:"16px",display:"flex",flexDirection:"column",gap:10 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <span style={{ fontSize:15,fontWeight:700,color:"var(--color-text)" }}>{m} {year}</span>
                <span style={{ fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:20,background: gen ? "#dcfce7" : "#f3f3f6",color: gen ? "#15803d" : "#6b6b76" }}>
                  {gen ? "Generated" : "Not Generated"}
                </span>
              </div>
              {gen && (
                <div style={{ fontSize:13,fontWeight:700,color:"var(--color-primary)" }}>{INR(totalNet)}</div>
              )}
              <div style={{ display:"flex",gap:8,marginTop:"auto" }}>
                {gen ? (
                  <button className="ui-btn-outline ui-btn--sm" style={{ flex:1 }} onClick={() => setDetail({ month:i, year })}>View Details</button>
                ) : (
                  <button className="ui-btn-primary ui-btn--sm" style={{ flex:1 }} disabled={!isPast} onClick={() => setConfirm({ month:i, year })}>
                    ⚡ Generate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm generate modal */}
      {confirm && createPortal(
        <div style={{ position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,17,23,0.45)",backdropFilter:"blur(2px)",padding:16 }}>
          <div style={{ background:"var(--color-surface)",borderRadius:16,padding:"28px 24px",maxWidth:380,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize:32,marginBottom:12 }}>⚡</div>
            <h3 style={{ margin:"0 0 8px",fontSize:17,fontWeight:700,color:"var(--color-text)" }}>Generate Payroll?</h3>
            <p style={{ margin:"0 0 20px",fontSize:13,color:"var(--color-text-muted)" }}>
              Generate payroll for <b>{MONTHS[confirm.month]} {confirm.year}</b> for {MOCK_EMPLOYEES.length} employees?
            </p>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <button className="ui-btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="ui-btn-primary" onClick={() => {
                setGenerated((p) => ({ ...p, [`${confirm.year}-${confirm.month}`]: true }));
                setConfirm(null);
              }}>Generate</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {detail && <PayrollDetailModal month={detail.month} year={detail.year} onClose={() => setDetail(null)} />}
    </div>
  );
}

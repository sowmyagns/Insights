import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../api";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const INR = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

function DetailModal({ month, year, records, onClose }) {
  const gross = records.reduce((s, r) => s + Number(r.gross_pay || 0), 0);
  const ded   = records.reduce((s, r) => s + Number(r.deductions || 0), 0);
  const net   = records.reduce((s, r) => s + Number(r.net_pay || 0), 0);
  return createPortal(
    <div style={{ position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,17,23,0.45)",backdropFilter:"blur(2px)",padding:16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--color-surface)",borderRadius:16,width:"100%",maxWidth:720,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px 14px",borderBottom:"1px solid var(--color-border-muted)" }}>
          <h3 style={{ margin:0,fontSize:16,fontWeight:700,color:"var(--color-text)" }}>Payroll — {MONTHS[month - 1]} {year}</h3>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:"50%",border:"none",background:"var(--color-surface-muted)",cursor:"pointer",fontSize:15,color:"var(--color-text-muted)" }}>✕</button>
        </div>
        <div style={{ padding:"18px 22px" }}>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18 }}>
            {[
              { label:"Employees",  value:records.length, color:"var(--color-primary)" },
              { label:"Gross Pay",  value:INR(gross),     color:"#15803d" },
              { label:"Deductions", value:INR(ded),       color:"#dc2626" },
              { label:"Net Pay",    value:INR(net),       color:"#1d4ed8" },
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
                  {["Employee","Dept","Present Days","LOP Days","Gross Pay","Deductions","Net Pay","Status"].map((h) => (
                    <th key={h} style={{ padding:"9px 14px",textAlign:"left",fontSize:11.5,fontWeight:700,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border)",whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && <tr><td colSpan={8} className="ui-empty">No records</td></tr>}
                {records.map((r) => (
                  <tr key={r.id} style={{ borderBottom:"1px solid var(--color-border-muted)" }}>
                    <td style={{ padding:"9px 14px",fontSize:13,fontWeight:600,color:"var(--color-text)" }}>{r.employee_name || `Emp #${r.employee_id}`}</td>
                    <td style={{ padding:"9px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{r.department || "—"}</td>
                    <td style={{ padding:"9px 14px",fontSize:13 }}>{r.present_days ?? "—"}</td>
                    <td style={{ padding:"9px 14px",fontSize:13,color:"#dc2626" }}>{r.lop_days ?? 0}</td>
                    <td style={{ padding:"9px 14px",fontSize:13,color:"#15803d",fontWeight:600 }}>{INR(r.gross_pay)}</td>
                    <td style={{ padding:"9px 14px",fontSize:13,color:"#dc2626",fontWeight:600 }}>{INR(r.deductions)}</td>
                    <td style={{ padding:"9px 14px",fontSize:13,fontWeight:700,color:"var(--color-primary)" }}>{INR(r.net_pay)}</td>
                    <td style={{ padding:"9px 14px" }}>
                      <span style={{ fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:r.status==="paid"?"#dcfce7":"#fef9c3",color:r.status==="paid"?"#15803d":"#854d0e" }}>{r.status||"draft"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display:"flex",justifyContent:"flex-end",gap:10,padding:"12px 22px 18px",borderTop:"1px solid var(--color-border-muted)" }}>
          <button className="ui-btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function MonthlyPay() {
  const [year, setYear]             = useState(new Date().getFullYear());
  const [records, setRecords]       = useState([]);
  const [generating, setGenerating] = useState(null);
  const [confirm, setConfirm]       = useState(null);
  const [detail, setDetail]         = useState(null);

  const load = () => {
    api.payroll.list({ year }).then(setRecords).catch(() => setRecords([]));
  };

  useEffect(() => { load(); }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  const byMonth = {};
  records.forEach((r) => {
    const key = String(r.month || "").slice(0, 7);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(r);
  });

  const monthKey    = (m) => `${year}-${String(m).padStart(2, "0")}`;
  const isGenerated = (m) => (byMonth[monthKey(m)] || []).length > 0;

  const curM       = new Date().getMonth() + 1;
  const curRecords = byMonth[monthKey(curM)] || [];
  const totalGross = curRecords.reduce((s, r) => s + Number(r.gross_pay || 0), 0);
  const totalDed   = curRecords.reduce((s, r) => s + Number(r.deductions || 0), 0);
  const totalNet   = curRecords.reduce((s, r) => s + Number(r.net_pay || 0), 0);

  const handleGenerate = async () => {
    if (!confirm) return;
    const { month } = confirm;
    setConfirm(null);
    setGenerating(month);
    try { await api.payroll.run({ year, month }); } catch {/* ignore */}
    load();
    setGenerating(null);
  };

  return (
    <div className="ui-page" style={{ paddingTop:20,paddingBottom:32 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ margin:0,fontSize:20,fontWeight:700,color:"var(--color-text)" }}>Monthly Pay</h1>
          <p style={{ margin:"4px 0 0",fontSize:13,color:"var(--color-text-muted)" }}>Generate and manage monthly payroll.</p>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => setYear((y) => y - 1)}>‹</button>
          <span style={{ fontSize:14,fontWeight:700,color:"var(--color-text)",minWidth:52,textAlign:"center" }}>{year}</span>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => setYear((y) => y + 1)}>›</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
        {[
          { label:"Employees Processed", value:curRecords.length, color:"var(--color-primary)" },
          { label:"Total Gross Pay",     value:INR(totalGross),   color:"#15803d" },
          { label:"Total Deductions",    value:INR(totalDed),     color:"#dc2626" },
          { label:"Total Net Pay",       value:INR(totalNet),     color:"#1d4ed8" },
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
          const monthNum  = i + 1;
          const gen       = isGenerated(monthNum);
          const isPast    = year < new Date().getFullYear() || monthNum <= new Date().getMonth() + 1;
          const monthRecs = byMonth[monthKey(monthNum)] || [];
          const mNet      = monthRecs.reduce((s, r) => s + Number(r.net_pay || 0), 0);
          const isRunning = generating === monthNum;
          return (
            <div key={m} className="ui-card" style={{ padding:"16px",display:"flex",flexDirection:"column",gap:10 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <span style={{ fontSize:15,fontWeight:700,color:"var(--color-text)" }}>{m} {year}</span>
                <span style={{ fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:20,background:gen?"#dcfce7":"#f3f3f6",color:gen?"#15803d":"#6b6b76" }}>
                  {gen ? "Generated" : "Not Generated"}
                </span>
              </div>
              {gen && (
                <div>
                  <div style={{ fontSize:13,fontWeight:700,color:"var(--color-primary)" }}>{INR(mNet)}</div>
                  <div style={{ fontSize:11,color:"var(--color-text-muted)",marginTop:2 }}>{monthRecs.length} employees</div>
                </div>
              )}
              <div style={{ display:"flex",gap:8,marginTop:"auto" }}>
                {gen ? (
                  <button className="ui-btn-outline ui-btn--sm" style={{ flex:1 }} onClick={() => setDetail({ month:monthNum, year, recs:monthRecs })}>View Details</button>
                ) : (
                  <button className="ui-btn-primary ui-btn--sm" style={{ flex:1 }} disabled={!isPast || isRunning} onClick={() => setConfirm({ month:monthNum, year })}>
                    {isRunning ? "Generating…" : "⚡ Generate"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm modal */}
      {confirm && createPortal(
        <div style={{ position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,17,23,0.45)",backdropFilter:"blur(2px)",padding:16 }}>
          <div style={{ background:"var(--color-surface)",borderRadius:16,padding:"28px 24px",maxWidth:380,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize:32,marginBottom:12 }}>⚡</div>
            <h3 style={{ margin:"0 0 8px",fontSize:17,fontWeight:700,color:"var(--color-text)" }}>Generate Payroll?</h3>
            <p style={{ margin:"0 0 20px",fontSize:13,color:"var(--color-text-muted)" }}>
              Generate payroll for <b>{MONTHS[confirm.month - 1]} {confirm.year}</b>?
            </p>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <button className="ui-btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="ui-btn-primary" onClick={handleGenerate}>Generate</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {detail && (
        <DetailModal month={detail.month} year={detail.year} records={detail.recs} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

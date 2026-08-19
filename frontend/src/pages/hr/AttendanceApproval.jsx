import { useState } from "react";

const MOCK = [
  { id:1, emp:"Ravi Kumar",   date:"2025-07-01", oldIn:"09:45", newIn:"09:00", oldOut:"18:30", newOut:"18:00", oldHrs:"8:45", newHrs:"9:00", oldStatus:"Late",    newStatus:"Present", reason:"Traffic delay",      createdBy:"Ravi Kumar",   approvalStatus:"Pending" },
  { id:2, emp:"Priya Sharma", date:"2025-07-03", oldIn:"10:15", newIn:"09:30", oldOut:"19:00", newOut:"18:30", oldHrs:"8:45", newHrs:"9:00", oldStatus:"Late",    newStatus:"Present", reason:"Doctor appointment", createdBy:"Priya Sharma", approvalStatus:"Pending" },
  { id:3, emp:"Arjun Singh",  date:"2025-06-28", oldIn:"—",     newIn:"09:00", oldOut:"—",     newOut:"18:00", oldHrs:"0:00", newHrs:"9:00", oldStatus:"Absent",  newStatus:"Present", reason:"System error",      createdBy:"Arjun Singh",  approvalStatus:"Approved" },
  { id:4, emp:"Meena Patel",  date:"2025-07-05", oldIn:"09:00", newIn:"09:00", oldOut:"16:00", newOut:"18:00", oldHrs:"7:00", newHrs:"9:00", oldStatus:"Present", newStatus:"Present", reason:"Forgot to punch",   createdBy:"Meena Patel",  approvalStatus:"Rejected" },
  { id:5, emp:"Suresh Reddy", date:"2025-07-07", oldIn:"11:00", newIn:"09:00", oldOut:"18:00", newOut:"18:00", oldHrs:"7:00", newHrs:"9:00", oldStatus:"Late",    newStatus:"Present", reason:"Power outage",      createdBy:"Suresh Reddy", approvalStatus:"Pending" },
];

const STATUS_STYLE = { Pending:["#fef9c3","#854d0e"], Approved:["#dcfce7","#15803d"], Rejected:["#fde8e8","#dc2626"] };

export default function AttendanceApproval() {
  const [records, setRecords] = useState(MOCK);
  const [statusFilter, setStatusFilter] = useState("All");
  const [empSearch, setEmpSearch] = useState("");

  const filtered = records.filter((r) => {
    const byStatus = statusFilter === "All" || r.approvalStatus === statusFilter;
    const byEmp    = !empSearch || r.emp.toLowerCase().includes(empSearch.toLowerCase());
    return byStatus && byEmp;
  });

  const approve = (id) => setRecords((p) => p.map((r) => r.id === id ? { ...r, approvalStatus:"Approved" } : r));
  const reject  = (id) => setRecords((p) => p.map((r) => r.id === id ? { ...r, approvalStatus:"Rejected" } : r));

  const total    = records.length;
  const pending  = records.filter((r) => r.approvalStatus === "Pending").length;
  const approved = records.filter((r) => r.approvalStatus === "Approved").length;
  const rejected = records.filter((r) => r.approvalStatus === "Rejected").length;

  const KPI = ({ label, value, color }) => (
    <div className="ui-card" style={{ padding:"12px 16px" }}>
      <div style={{ fontSize:11,fontWeight:600,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:24,fontWeight:800,color }}>{value}</div>
    </div>
  );

  return (
    <div className="ui-page" style={{ paddingTop:20,paddingBottom:32 }}>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ margin:0,fontSize:20,fontWeight:700,color:"var(--color-text)" }}>Attendance Approvals</h1>
        <p style={{ margin:"4px 0 0",fontSize:13,color:"var(--color-text-muted)" }}>Review and approve attendance correction requests.</p>
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
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:1100 }}>
            <thead>
              <tr style={{ background:"var(--color-surface-thead)" }}>
                <th rowSpan={2} style={TH}>SR No.</th>
                <th rowSpan={2} style={TH}>Employee</th>
                <th rowSpan={2} style={TH}>Date</th>
                <th colSpan={2} style={{ ...TH,textAlign:"center",borderBottom:"1px solid var(--color-border)" }}>Check-in</th>
                <th colSpan={2} style={{ ...TH,textAlign:"center",borderBottom:"1px solid var(--color-border)" }}>Check-out</th>
                <th colSpan={2} style={{ ...TH,textAlign:"center",borderBottom:"1px solid var(--color-border)" }}>Hours</th>
                <th colSpan={2} style={{ ...TH,textAlign:"center",borderBottom:"1px solid var(--color-border)" }}>Status</th>
                <th rowSpan={2} style={TH}>Reason</th>
                <th rowSpan={2} style={TH}>Approval</th>
                <th rowSpan={2} style={TH}>Action</th>
              </tr>
              <tr style={{ background:"var(--color-surface-thead)" }}>
                {["Old","New","Old","New","Old","New","Old","New"].map((h,i) => (
                  <th key={i} style={{ ...TH,fontSize:10.5,color:"var(--color-text-muted)",fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={14} className="ui-empty">No records found</td></tr>
              ) : filtered.map((r, i) => {
                const [bg, fg] = STATUS_STYLE[r.approvalStatus] || ["#f3f3f6","#6b6b76"];
                return (
                  <tr key={r.id} style={{ borderBottom:"1px solid var(--color-border-muted)" }}>
                    <td style={TD}>{i+1}</td>
                    <td style={{ ...TD,fontWeight:600,color:"var(--color-text)" }}>{r.emp}</td>
                    <td style={TD}>{r.date}</td>
                    <td style={{ ...TD,color:"var(--color-text-muted)" }}>{r.oldIn}</td>
                    <td style={{ ...TD,color:"#15803d",fontWeight:600 }}>{r.newIn}</td>
                    <td style={{ ...TD,color:"var(--color-text-muted)" }}>{r.oldOut}</td>
                    <td style={{ ...TD,color:"#15803d",fontWeight:600 }}>{r.newOut}</td>
                    <td style={{ ...TD,color:"var(--color-text-muted)" }}>{r.oldHrs}</td>
                    <td style={{ ...TD,color:"#15803d",fontWeight:600 }}>{r.newHrs}</td>
                    <td style={TD}><span style={{ fontSize:10,padding:"2px 7px",borderRadius:20,background:"#fde8e8",color:"#dc2626",fontWeight:600 }}>{r.oldStatus}</span></td>
                    <td style={TD}><span style={{ fontSize:10,padding:"2px 7px",borderRadius:20,background:"#dcfce7",color:"#15803d",fontWeight:600 }}>{r.newStatus}</span></td>
                    <td style={{ ...TD,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--color-text-muted)" }}>{r.reason}</td>
                    <td style={TD}><span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:bg,color:fg }}>{r.approvalStatus}</span></td>
                    <td style={TD}>
                      {r.approvalStatus === "Pending" ? (
                        <div style={{ display:"flex",gap:5 }}>
                          <button onClick={() => approve(r.id)} style={{ padding:"4px 10px",fontSize:11,fontWeight:700,borderRadius:6,border:"none",background:"#dcfce7",color:"#15803d",cursor:"pointer" }}>✓</button>
                          <button onClick={() => reject(r.id)}  style={{ padding:"4px 10px",fontSize:11,fontWeight:700,borderRadius:6,border:"none",background:"#fde8e8",color:"#dc2626",cursor:"pointer" }}>✕</button>
                        </div>
                      ) : <span style={{ fontSize:12,color:"var(--color-text-muted)" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:"10px 16px",borderTop:"1px solid var(--color-border-muted)",fontSize:12,color:"var(--color-text-muted)" }}>
          Showing {filtered.length} of {records.length} entries
        </div>
      </div>
    </div>
  );
}

const TH = { padding:"9px 12px",textAlign:"left",fontSize:11.5,fontWeight:700,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border)",whiteSpace:"nowrap" };
const TD = { padding:"9px 12px",fontSize:12,color:"var(--color-text-secondary)" };

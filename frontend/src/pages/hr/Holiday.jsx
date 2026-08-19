import { useState } from "react";
import { createPortal } from "react-dom";

const MOCK_HOLIDAYS = [
  { id: 1, name: "New Year's Day",      date: "2025-01-01", type: "Public",   branch: "All" },
  { id: 2, name: "Republic Day",        date: "2025-01-26", type: "Public",   branch: "All" },
  { id: 3, name: "Holi",               date: "2025-03-14", type: "Public",   branch: "All" },
  { id: 4, name: "Good Friday",         date: "2025-04-18", type: "Optional", branch: "All" },
  { id: 5, name: "Independence Day",    date: "2025-08-15", type: "Public",   branch: "All" },
  { id: 6, name: "Gandhi Jayanti",      date: "2025-10-02", type: "Public",   branch: "All" },
  { id: 7, name: "Diwali",             date: "2025-10-20", type: "Public",   branch: "All" },
  { id: 8, name: "Christmas",          date: "2025-12-25", type: "Public",   branch: "All" },
  { id: 9, name: "Company Foundation", date: "2025-06-15", type: "Company",  branch: "Head Office" },
];

const EMPTY = { name: "", date: "", type: "Public", branch: "All" };
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const TYPE_COLORS = { Public: ["#dcfce7","#15803d"], Optional: ["#fef9c3","#854d0e"], Company: ["#eff6ff","#1d4ed8"] };

function HolidayModal({ holiday, onClose, onSave }) {
  const [form, setForm] = useState(holiday ? { name: holiday.name, date: holiday.date, type: holiday.type, branch: holiday.branch } : EMPTY);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isEdit = Boolean(holiday);
  return createPortal(
    <div style={{ position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,17,23,0.45)",backdropFilter:"blur(2px)",padding:16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--color-surface)",borderRadius:16,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px 14px",borderBottom:"1px solid var(--color-border-soft)" }}>
          <h3 style={{ margin:0,fontSize:16,fontWeight:700,color:"var(--color-text)" }}>{isEdit ? "Edit Holiday" : "Add Holiday"}</h3>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:"50%",border:"none",background:"var(--color-surface-muted)",cursor:"pointer",fontSize:15,color:"var(--color-text-muted)" }}>✕</button>
        </div>
        <div style={{ padding:"18px 22px",display:"flex",flexDirection:"column",gap:14 }}>
          <div><label className="ui-label">Holiday Name *</label><input className="ui-input" placeholder="e.g. Diwali" value={form.name} onChange={set("name")} /></div>
          <div><label className="ui-label">Date *</label><input className="ui-input" type="date" value={form.date} onChange={set("date")} /></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div>
              <label className="ui-label">Type</label>
              <select className="ui-select" value={form.type} onChange={set("type")}>
                <option>Public</option><option>Optional</option><option>Company</option>
              </select>
            </div>
            <div>
              <label className="ui-label">Branch</label>
              <select className="ui-select" value={form.branch} onChange={set("branch")}>
                <option>All</option><option>Head Office</option><option>Branch 1</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ display:"flex",justifyContent:"flex-end",gap:10,padding:"12px 22px 18px",borderTop:"1px solid var(--color-border-soft)" }}>
          <button className="ui-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="ui-btn-primary" onClick={() => { if (!form.name.trim() || !form.date) return; onSave(form); }}>
            {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Holiday() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState(MOCK_HOLIDAYS);
  const [modal, setModal] = useState(null); // null | { mode:"add"|"edit", holiday? }
  const [deleteId, setDeleteId] = useState(null);

  const filtered = holidays.filter((h) => new Date(h.date).getFullYear() === year);

  const handleSave = (form) => {
    if (modal.mode === "edit") {
      setHolidays((prev) => prev.map((h) => h.id === modal.holiday.id ? { ...h, ...form } : h));
    } else {
      setHolidays((prev) => [...prev, { id: Date.now(), ...form }]);
    }
    setModal(null);
  };

  const KPI = ({ label, value, color }) => (
    <div className="ui-card" style={{ padding:"12px 16px",display:"flex",flexDirection:"column",gap:4 }}>
      <div style={{ fontSize:11,fontWeight:600,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.05em" }}>{label}</div>
      <div style={{ fontSize:24,fontWeight:800,color }}>{value}</div>
    </div>
  );

  return (
    <div className="ui-page" style={{ paddingTop:20,paddingBottom:32 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ margin:0,fontSize:20,fontWeight:700,color:"var(--color-text)" }}>Holiday List</h1>
          <p style={{ margin:"4px 0 0",fontSize:13,color:"var(--color-text-muted)" }}>Manage public and company holidays.</p>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => setYear((y) => y - 1)}>‹</button>
          <span style={{ fontSize:14,fontWeight:700,color:"var(--color-text)",minWidth:52,textAlign:"center" }}>{year}</span>
          <button className="ui-btn-outline ui-btn--sm" onClick={() => setYear((y) => y + 1)}>›</button>
          <button className="ui-btn-primary ui-btn--sm" onClick={() => setModal({ mode:"add" })}>+ Add Holiday</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16 }}>
        <KPI label="Total Holidays" value={filtered.length} color="var(--color-primary)" />
        <KPI label="Public" value={filtered.filter((h) => h.type === "Public").length} color="#15803d" />
        <KPI label="Optional" value={filtered.filter((h) => h.type === "Optional").length} color="#854d0e" />
        <KPI label="Company" value={filtered.filter((h) => h.type === "Company").length} color="#1d4ed8" />
      </div>

      <div className="ui-card" style={{ padding:0,overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:700 }}>
            <thead>
              <tr style={{ background:"var(--color-surface-thead)" }}>
                {["SR No.","Holiday Name","Date","Day","Type","Branch","Action"].map((h) => (
                  <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11.5,fontWeight:700,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border)",whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="ui-empty">No holidays found for {year}</td></tr>
              ) : filtered.sort((a,b) => a.date.localeCompare(b.date)).map((h, i) => {
                const d = new Date(h.date);
                const [bg, fg] = TYPE_COLORS[h.type] || ["#f3f3f6","#6b6b76"];
                return (
                  <tr key={h.id} style={{ borderBottom:"1px solid var(--color-border-muted)" }}>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-muted)" }}>{i+1}</td>
                    <td style={{ padding:"10px 14px",fontSize:13,fontWeight:600,color:"var(--color-text)" }}>{h.name}</td>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{d.toLocaleDateString("en-IN",{ day:"2-digit",month:"short",year:"numeric" })}</td>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{DAYS[d.getDay()]}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:bg,color:fg }}>{h.type}</span>
                    </td>
                    <td style={{ padding:"10px 14px",fontSize:13,color:"var(--color-text-secondary)" }}>{h.branch}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex",gap:6 }}>
                        <button title="Edit" onClick={() => setModal({ mode:"edit",holiday:h })} style={{ width:28,height:28,borderRadius:"50%",border:"none",background:"var(--color-primary-soft)",color:"var(--color-primary)",cursor:"pointer",fontSize:13 }}>✎</button>
                        <button title="Delete" onClick={() => setDeleteId(h.id)} style={{ width:28,height:28,borderRadius:"50%",border:"none",background:"var(--color-danger-soft)",color:"var(--color-danger)",cursor:"pointer",fontSize:13 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <HolidayModal holiday={modal.holiday} onClose={() => setModal(null)} onSave={handleSave} />}

      {deleteId && createPortal(
        <div style={{ position:"fixed",inset:0,zIndex:90,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,17,23,0.45)",backdropFilter:"blur(2px)",padding:16 }}>
          <div style={{ background:"var(--color-surface)",borderRadius:16,padding:"28px 24px",maxWidth:360,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize:32,marginBottom:12 }}>🗑️</div>
            <h3 style={{ margin:"0 0 8px",fontSize:17,fontWeight:700,color:"var(--color-text)" }}>Delete Holiday?</h3>
            <p style={{ margin:"0 0 20px",fontSize:13,color:"var(--color-text-muted)" }}>This action cannot be undone.</p>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <button className="ui-btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="ui-btn-danger" onClick={() => { setHolidays((p) => p.filter((h) => h.id !== deleteId)); setDeleteId(null); }}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

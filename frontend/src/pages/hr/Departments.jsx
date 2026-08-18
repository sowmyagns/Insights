import { useState, useEffect } from "react";
import { api } from "../api";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => {
    setLoading(true);
    try { setDepartments(await api.departments.list()); }
    catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (modal === "create") await api.departments.create(form);
      else await api.departments.update(modal.id, form);
      setModal(null); load();
    } catch (e) { alert(e.message); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this department?")) return;
    try { await api.departments.delete(id); load(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>Departments</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Manage your organization departments.</p>
        </div>
        <button className="ui-btn-primary ui-btn--sm" onClick={() => { setForm({ name: "", description: "" }); setModal("create"); }}>+ Add Department</button>
      </div>

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>Loading departments...</div>
      ) : (
        <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="ui-table-wrap" style={{ border: "none" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-thead)" }}>
                  {["Name", "Description", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{d.name}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: "var(--color-text-muted)" }}>{d.description || "—"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="ui-btn-outline ui-btn--sm" onClick={() => { setForm({ name: d.name, description: d.description || "" }); setModal({ type: "edit", id: d.id }); }}>Edit</button>
                        <button className="ui-btn-danger ui-btn--sm" onClick={() => remove(d.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!departments.length && <tr><td colSpan={3} className="ui-empty">No departments found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,17,23,0.45)", backdropFilter: "blur(2px)" }} onClick={() => setModal(null)}>
          <div className="ui-card" style={{ padding: "28px 32px", width: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{modal === "create" ? "Add Department" : "Edit Department"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="ui-label">Name</label>
                <input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="ui-label">Description</label>
                <input className="ui-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button className="ui-btn-secondary ui-btn--sm" onClick={() => setModal(null)}>Cancel</button>
              <button className="ui-btn-primary ui-btn--sm" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

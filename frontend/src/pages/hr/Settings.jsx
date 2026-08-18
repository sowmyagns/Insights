import { useState } from "react";

export default function Settings() {
  const [tab, setTab] = useState("pay");
  const [cycle, setCycle] = useState("last");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>HR Settings</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Configure payroll and integrations.</p>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid var(--color-border)" }}>
        {[{ id: "pay", label: "Pay Schedule" }, { id: "tally", label: "Tally Configuration" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, border: "none", background: "transparent", cursor: "pointer", color: tab === t.id ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t.id ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2, transition: "all .15s" }}>{t.label}</button>
        ))}
      </div>

      {tab === "pay" && (
        <div className="ui-card" style={{ padding: "22px 24px", maxWidth: 520 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", marginBottom: 16 }}>Set Salary Cycle</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            {[
              { val: "last", label: "The last working day of every month" },
              { val: "custom", label: "Customize salary cycle" },
            ].map((opt) => (
              <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--color-text)" }}>
                <input type="radio" checked={cycle === opt.val} onChange={() => setCycle(opt.val)} style={{ accentColor: "var(--color-primary)", width: 16, height: 16 }} />
                {opt.label}
              </label>
            ))}
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--color-surface-muted)", border: "1px solid var(--color-border)", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 20 }}>
            <b>Note:</b> Salary cycle 1st Jan to 31st Jan
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="ui-label">Start Payroll From</label>
            <input className="ui-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ maxWidth: 220 }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="ui-btn-primary ui-btn--sm">Save</button>
            <button className="ui-btn-secondary ui-btn--sm">Cancel</button>
          </div>
        </div>
      )}

      {tab === "tally" && (
        <div className="ui-card" style={{ padding: "22px 24px", maxWidth: 600 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 14, alignItems: "flex-end", marginBottom: 20 }}>
            <div>
              <label className="ui-label">Tally Serial Number *</label>
              <input className="ui-input" placeholder="Enter Tally Serial Number" />
            </div>
            <div>
              <label className="ui-label">Mobile Number *</label>
              <div style={{ display: "flex", gap: 0 }}>
                <span style={{ display: "flex", alignItems: "center", padding: "0 10px", background: "var(--color-surface-muted)", border: "1px solid var(--color-border-soft)", borderRight: "none", borderRadius: "var(--radius-md) 0 0 var(--radius-md)", fontSize: 13, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>+91</span>
                <input className="ui-input" placeholder="Enter Mobile Number" style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0" }} />
              </div>
            </div>
            <button className="ui-btn-primary ui-btn--sm">Save</button>
          </div>
          <div>
            <label className="ui-label">Organization Authentication Key <span style={{ color: "var(--color-primary)", cursor: "pointer", fontWeight: 400 }}>(generate API key)</span></label>
            <button className="ui-btn-outline ui-btn--sm">Generate</button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import Modal from "../components/Modal";

export default function AssetManagement({ view }) {
  const title = view === "assets-allocate" ? "Allocate Assets" : view === "assets-mapped" ? "Mapped Assets" : "Company Assets";

  const headers = view === "assets-allocate"
    ? ["SR No.","Employee","Asset Name","Asset Type","Allocated On","Action"]
    : view === "assets-mapped"
    ? ["SR No.","Employee","Asset Name","Asset Type","Mapped On","Action"]
    : ["SR No.","Asset Name","Asset Type","Category","Status","Action"];

  return (
    <div className="ui-page" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>{title}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Manage company assets and allocations.</p>
        </div>
        {view !== "assets-allocate" && view !== "assets-mapped" && (
          <button className="ui-btn-primary ui-btn--sm">+ Add Category</button>
        )}
      </div>

      <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ui-table-wrap" style={{ border: "none" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-thead)" }}>
                {headers.map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={headers.length} className="ui-empty">
                  {view === "assets-allocate" ? "No assets allocated" : view === "assets-mapped" ? "No mapped assets" : "No assets found"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Placeholder({ title = "Coming Soon", subtitle }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 320,
        padding: 24,
        background: "#f8fafc",
        borderRadius: 12,
        color: "#64748b",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
      <h3 style={{ margin: 0, fontSize: 18, color: "#334155", fontWeight: 600 }}>{title}</h3>
      {subtitle && <p style={{ margin: "8px 0 0", fontSize: 14 }}>{subtitle}</p>}
    </div>
  );
}

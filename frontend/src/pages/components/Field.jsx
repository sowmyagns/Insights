export default function Field({ label, children, required, className }) {
  return (
    <div style={{ marginBottom: 14 }} className={className}>
      {label && (
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4, color: "#374151" }}>
          {label}
          {required && <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
    </div>
  );
}

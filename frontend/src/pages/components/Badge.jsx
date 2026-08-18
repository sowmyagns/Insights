const STATUS_COLORS = {
  pending:  { bg: "#FEF3C7", color: "#92400E" },
  approved: { bg: "#D1FAE5", color: "#065F46" },
  rejected: { bg: "#FEE2E2", color: "#991B1B" },
  active:   { bg: "#DBEAFE", color: "#1E40AF" },
  inactive: { bg: "#F3F4F6", color: "#374151" },
  paid:     { bg: "#D1FAE5", color: "#065F46" },
  unpaid:   { bg: "#FEE2E2", color: "#991B1B" },
};

export default function Badge({ label = "", status = "", style = {} }) {
  const key = (status || label || "").toLowerCase().trim();
  const cl = STATUS_COLORS[key] || { bg: "#F3F4F6", color: "#374151" };
  return (
    <span
      style={{
        display: "inline-block", padding: "2px 10px", borderRadius: 999,
        fontSize: 12, fontWeight: 600, background: cl.bg, color: cl.color, ...style,
      }}
    >
      {label || status}
    </span>
  );
}

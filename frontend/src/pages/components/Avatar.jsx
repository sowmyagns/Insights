export default function Avatar({ name = "", size = 36, style = {} }) {
  const initials = (name || "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
  const COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899"];
  const bg = COLORS[(name.charCodeAt(0) || 0) % COLORS.length];
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: bg,
        color: "#fff", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: Math.round(size * 0.38),
        fontWeight: 700, flexShrink: 0, userSelect: "none", ...style,
      }}
    >
      {initials}
    </div>
  );
}

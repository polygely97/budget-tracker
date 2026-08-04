export const s = {
  wrap: {
    fontFamily: "'Inter',system-ui,sans-serif", maxWidth: 430, margin: "0 auto",
    background: "#f5f5f7", minHeight: "100vh", paddingBottom: 96,
  },
  hdr: {
    background: "linear-gradient(135deg,#1a1a2e,#0f3460)", padding: "20px 16px 16px",
    position: "sticky", top: 0, zIndex: 10, paddingTop: "max(20px, env(safe-area-inset-top))",
  },
  card: {
    background: "#fff", borderRadius: 16, padding: 16, margin: "10px 12px 0",
    boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
  },
  lbl: {
    fontSize: 11, color: "#999", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.07em", marginBottom: 8,
  },
  row: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 0", borderBottom: "1px solid #f5f5f5",
  },
  inp: {
    width: "100%", padding: "13px 16px", borderRadius: 12, border: "1.5px solid #eee",
    fontSize: 16, outline: "none", boxSizing: "border-box", background: "#fafafa",
  },
  navBar: {
    position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
    width: "100%", maxWidth: 430, background: "#fff", borderTop: "1px solid #eee",
    display: "flex", padding: "8px 0", paddingBottom: "max(18px, env(safe-area-inset-bottom))",
    zIndex: 20, boxShadow: "0 -2px 12px rgba(0,0,0,0.07)",
  },
  navBtn: (active) => ({
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    border: "none", background: "none", cursor: "pointer", color: active ? "#0f3460" : "#bbb",
  }),
  backBtn: {
    background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
    borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 14,
  },
  tabBtn: (active, col = "#fff", bg = "rgba(255,255,255,0.15)") => ({
    flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 700, background: active ? "#fff" : bg,
    color: active ? "#1a1a2e" : col,
  }),
  catBtn: (active, col) => ({
    padding: "10px 4px", borderRadius: 12, border: `2px solid ${active ? col : "#eee"}`,
    background: active ? col + "20" : "#fff", cursor: "pointer", textAlign: "center",
  }),
  bigAddBtn: {
    background: "linear-gradient(135deg,#E24B4A,#c0392b)", borderRadius: 22,
    padding: "11px 32px", color: "#fff", fontSize: 15, fontWeight: 800, border: "none",
    cursor: "pointer", boxShadow: "0 4px 14px rgba(226,75,74,0.35)",
  },
  filterBtn: (active) => ({
    padding: "6px 14px", borderRadius: 20, border: "1px solid #ddd", cursor: "pointer",
    fontSize: 12, fontWeight: 700, background: active ? "#1a1a2e" : "#fff",
    color: active ? "#fff" : "#666",
  }),
  primaryBtn: (color = "#0f3460", enabled = true) => ({
    width: "100%", padding: 16, borderRadius: 14, border: "none",
    cursor: enabled ? "pointer" : "default", fontSize: 16, fontWeight: 800, color: "#fff",
    background: enabled ? `linear-gradient(135deg,${color},${color}cc)` : "#e0e0e0",
    boxShadow: enabled ? `0 6px 20px ${color}44` : "none", transition: "all 0.2s",
  }),
};

export function Bar({ pct, color, height = 6 }) {
  return (
    <div style={{ height, background: "#f0f0f0", borderRadius: height / 2, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: color,
        borderRadius: height / 2, transition: "width 0.4s ease",
      }} />
    </div>
  );
}

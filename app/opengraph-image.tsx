import { ImageResponse } from "next/og";

export const alt = "TabeDog: Tabelog in English, on a map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#fdfffc", color: "#1a1c1a", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 800 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#ff6347" }} />
          TabeDog
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 84, fontWeight: 800, lineHeight: 1.05, marginTop: 40, letterSpacing: -2 }}>
          <div>Tabelog in English,</div>
          <div>on a map.</div>
        </div>
        <div style={{ fontSize: 32, color: "#6f736f", marginTop: 32 }}>Find authentic Japanese restaurants with the ratings locals trust.</div>
      </div>
    ),
    size,
  );
}

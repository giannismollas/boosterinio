import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name}: LoL boosting and gaming marketplace`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default social preview: the marquee and CRT, drawn with plain shapes.
export default function OpengraphImage() {
  const stripes = Array.from({ length: 40 }, (_, i) => i);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#100f0e", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", height: 18 }}>
          {stripes.map((i) => (
            <div key={i} style={{ width: 30, height: 18, background: ["#ff2e88", "#2f6bff", "#5cf2d6"][i % 3], marginRight: 0 }} />
          ))}
        </div>
        <div
          style={{
            margin: 56,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 56,
            borderRadius: 36,
            border: "14px solid #050408",
            background: "radial-gradient(circle at 50% 40%, #0a2125 0%, #051315 60%, #020a0b 100%)",
          }}
        >
          <div style={{ fontSize: 108, fontWeight: 900, color: "#f3f1fa", letterSpacing: 4, textShadow: "4px 4px 0 #ff2e88, 8px 8px 0 #2f6bff" }}>
            {site.name.toUpperCase()}
          </div>
          <div style={{ marginTop: 18, fontSize: 40, color: "#5cf2d6" }}>LoL boosting, priced to the coin.</div>
          <div style={{ marginTop: 12, fontSize: 28, color: "#9fcfc6" }}>Approved boosters · itemized prices · escrow on every order</div>
        </div>
      </div>
    ),
    size,
  );
}

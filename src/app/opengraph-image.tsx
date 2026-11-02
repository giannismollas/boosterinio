import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { B_PATH, B_TRANSFORM, B_VIEWBOX } from "@/lib/brand-mark";
import { site } from "@/lib/site";

export const alt = `${site.name}: LoL boosting and gaming marketplace`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The small B as a standalone SVG.
function mark() {
  const fill = `<linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#ff74b6"/><stop offset="0.5" stop-color="#ff2e88"/><stop offset="1" stop-color="#d80d68"/></linearGradient>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${B_VIEWBOX}"><defs>${fill}</defs><path d="${B_PATH}" transform="${B_TRANSFORM}" fill="url(#g)" fill-rule="evenodd"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// Default social preview: the hero in one card.
export default async function OpengraphImage() {
  // Saira ExtraBold Italic at width 118 and Rubik Regular, pinned from the site's variable fonts (SIL Open Font License).
  const [saira, rubik, plate] = await Promise.all([
    readFile(join(process.cwd(), "src/app/fonts/saira-extrabold-italic-wide.ttf")),
    readFile(join(process.cwd(), "src/app/fonts/rubik-regular.ttf")),
    readFile(join(process.cwd(), "public/images/brand/b-plate-og.png")),
  ]);
  const display = { fontFamily: "Saira", fontWeight: 800, fontStyle: "italic" } as const;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "radial-gradient(70% 90% at 92% 0%, rgba(255,46,136,0.28), rgba(11,10,14,0) 65%), #0b0b16",
          padding: "64px 72px",
          fontFamily: "Rubik",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* light streaks */}
        <div style={{ position: "absolute", left: 640, top: 40, width: 700, height: 3, background: "linear-gradient(90deg, rgba(255,46,136,0), rgba(255,46,136,0.85) 70%, #ffc6e0 90%, rgba(255,46,136,0))", transform: "rotate(-28deg)" }} />
        <div style={{ position: "absolute", left: 760, top: 300, width: 520, height: 2, background: "linear-gradient(90deg, rgba(255,46,136,0), rgba(255,46,136,0.6) 70%, rgba(255,46,136,0))", transform: "rotate(-28deg)" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${plate.toString("base64")}`} alt="" width={440} height={400} style={{ position: "absolute", right: 40, top: 30 }} />

        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark()} alt="" width={66} height={60} />
          <div style={{ ...display, marginLeft: 14, fontSize: 46, color: "#ffffff", letterSpacing: 0.5 }}>{site.name.toUpperCase()}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ ...display, fontSize: 84, lineHeight: 0.95, color: "#ffffff" }}>LOL BOOSTING,</div>
          <div style={{ display: "flex", ...display, fontSize: 84, lineHeight: 0.95 }}>
            <span style={{ color: "#ffffff" }}>PRICED&nbsp;</span>
            <span style={{ color: "#ff2e88" }}>TO THE COIN</span>
          </div>
          <div style={{ marginTop: 26, fontSize: 28, color: "#c8c3d0" }}>Approved boosters · itemized prices · escrow on every order</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Saira", data: saira, weight: 800, style: "italic" },
        { name: "Rubik", data: rubik, weight: 400, style: "normal" },
      ],
    },
  );
}

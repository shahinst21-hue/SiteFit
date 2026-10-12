import { ImageResponse } from "next/og";
import { site } from "@/lib/site-config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const size = { width: 1200, height: 630 };
export const dynamic = "force-static";
export function GET() {
  const logo = readFileSync(join(process.cwd(), "public/brand/sitefit-wordmark.svg")).toString("base64");
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#eaeaea",
        color: "#0d1400",
        padding: "65px 75px",
      }}
    >
      <div style={{display: "flex"}}><img src={`data:image/svg+xml;base64,${logo}`} alt={site.name} width={220} height={50}/></div>
      <div
        style={{
          fontSize: 68,
          fontWeight: 600,
          lineHeight: 1,
          display: "flex",
          maxWidth: 940,
        }}
      >
        {site.tagline}
      </div>
      <div style={{ fontSize: 24, display: "flex" }}>
        UK commercial locations · Evidence before assumptions
      </div>
    </div>,
    size,
  );
}

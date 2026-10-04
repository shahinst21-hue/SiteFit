import { ImageResponse } from "next/og";
import { site } from "@/lib/site-config";
const size = { width: 1200, height: 630 };
export const dynamic = "force-static";
export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f6f5ee",
        color: "#203b32",
        padding: "65px 75px",
      }}
    >
      <div style={{ fontSize: 40, display: "flex" }}>{site.name}.</div>
      <div
        style={{
          fontSize: 70,
          lineHeight: 1.12,
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

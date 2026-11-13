import { NextResponse } from "next/server";

const links = new Map([
  ["selsian", { medium: "email", content: "ad-02" }],
  ["cafe-plum", { medium: "email", content: "ad-03" }],
  ["selsian-client", { medium: "referral", content: "ad-02" }],
  ["cafe-plum-client", { medium: "referral", content: "ad-03" }],
]);

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" };

export async function GET(_request: Request, { params }: { params: Promise<{ partner: string }> }) {
  const link = links.get((await params).partner);
  if (!link) return new Response(null, { status: 404, headers });

  const destination = new URL("https://sitefit.co.uk/coffee-shop-location-analysis");
  destination.search = new URLSearchParams({
    utm_source: "sitefit",
    utm_medium: link.medium,
    utm_content: link.content,
  }).toString();
  return NextResponse.redirect(destination, { status: 302, headers });
}

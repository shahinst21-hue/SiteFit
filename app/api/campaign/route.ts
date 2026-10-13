import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/analysis/http";
import { boundedJson } from "@/lib/payments/http";
import { CAMPAIGN_COOKIE, campaignChoice, campaignCode, measurementEnabled } from "@/lib/marketing/campaign";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
export async function GET() {
  const enabled = measurementEnabled(process.env);
  return NextResponse.json({ enabled, campaign: enabled ? campaignCode((await cookies()).get(CAMPAIGN_COOKIE)?.value) : null }, { headers });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Unavailable." }, { status: 403, headers });
  try {
    const choice = campaignChoice(await boundedJson(request));
    if (choice.action === "accept" && !measurementEnabled(process.env)) return NextResponse.json({ error: "Measurement is disabled." }, { status: 503, headers });
    const response = NextResponse.json({ saved: true }, { headers });
    response.cookies.set(CAMPAIGN_COOKIE, choice.action === "accept" ? choice.campaign : "", {
      httpOnly: true, secure: request.url.startsWith("https:"), sameSite: "lax", path: "/",
      ...(choice.action === "clear" ? { maxAge: 0 } : {}),
    });
    return response;
  } catch { return NextResponse.json({ error: "Choose a valid measurement preference." }, { status: 400, headers }); }
}

import { developmentFulfilment } from "@/lib/fulfilment/policy";
import { runnerAuthorised } from "@/lib/fulfilment/auth";
import { fulfilOne } from "@/lib/fulfilment/worker";
export const runtime = "nodejs";
export const maxDuration = 200;
export async function POST(request: Request) {
  if (!developmentFulfilment(process.env, new URL(request.url).hostname) ||
    !runnerAuthorised(request.headers.get("authorization"), process.env.SITEFIT_FULFILMENT_RUNNER_SECRET))
    return new Response(null, { status: 404 });
  // No caller-controlled work identifiers, URLs, provider or spending switches.
  if (request.body) {
    const reader = request.body.getReader(); let bytes = 0; const chunks: Uint8Array[] = [];
    while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength;
      if (bytes > 2) { await reader.cancel(); return new Response(null, { status: 400 }); } chunks.push(part.value); }
    if (bytes && Buffer.concat(chunks).toString("utf8") !== "{}") return new Response(null, { status: 400 });
  }
  const result = await fulfilOne({ paidExecutionApproved: false });
  return Response.json({ state: result }, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

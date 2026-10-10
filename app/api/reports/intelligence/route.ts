import { after } from "next/server";
import { verifiedUser } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/analysis/http";
import { intelligenceId as uuid, verificationEnabled } from "@/lib/report-intelligence/http";
import { fullRepository } from "@/lib/report-intelligence/repository";
import { fullStatus, generateFullIntelligence } from "@/lib/report-intelligence/generate";

export const runtime = "nodejs";
export const maxDuration = 150;
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: {
  "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
async function owner() {
  const { user, client } = await verifiedUser();
  if (!user || user.is_anonymous || !user.email_confirmed_at || !client) return null;
  const active = await client.rpc("sitefit_session_available");
  return !active.error && active.data === true ? user.id : null;
}
export async function GET(request: Request) {
  if (!verificationEnabled(process.env, new URL(request.url).hostname)) return reply({ error: "Intelligence verification is unavailable." }, 404);
  const id = new URL(request.url).searchParams.get("report"); if (!uuid(id)) return reply({ error: "Invalid report." }, 400);
  try {
    const account = await owner(); if (!account) return reply({ error: "Sign in to your verified account." }, 401);
    const edition = await fullRepository(account).read(id);
    return reply(new URL(request.url).searchParams.get("content") === "1" && edition.status === "ready" ? edition.projection : fullStatus(edition));
  } catch { return reply({ error: "This report is unavailable to this account." }, 403); }
}
export async function POST(request: Request) {
  if (!verificationEnabled(process.env, new URL(request.url).hostname)) return reply({ error: "Intelligence verification is unavailable." }, 404);
  if (!sameOrigin(request)) return reply({ error: "Reload and try again." }, 403);
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json") || Number(request.headers.get("content-length")) > 512) throw Error();
    const reader = request.body?.getReader(); if (!reader) throw Error();
    let bytes = 0; const chunks: Uint8Array[] = [];
    while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength;
      if (bytes > 512) { await reader.cancel(); throw Error(); } chunks.push(part.value); }
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { reportId: string; action: string };
    if (Object.keys(input).length !== 2 || !uuid(input.reportId) || !["start", "resume"].includes(input.action)) throw Error();
    const account = await owner(); if (!account) return reply({ error: "Sign in to your verified account." }, 401);
    if (!process.env.OPENAI_API_KEY?.startsWith("sk-")) return reply({ error: "Verification is temporarily unavailable." }, 503);
    const repo = fullRepository(account), edition = input.action === "start" ? await repo.start(input.reportId) : await repo.read(input.reportId);
    if (edition.status !== "ready" && (input.action === "resume" || edition.revision === 0)) {
      after(async () => { try { await generateFullIntelligence(account, edition.id, { resume: input.action === "resume" }); }
        catch { console.warn("full_intelligence", { code: "checkpoint_retained" }); } });
    }
    return reply(fullStatus(edition), 202);
  } catch { return reply({ error: "Could not start this report. Existing checkpoints are retained." }, 503); }
}

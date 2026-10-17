import { verifiedUser } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/analysis/http";
import { intelligenceId, verificationEnabled } from "@/lib/report-intelligence/http";
import { fullRepository } from "@/lib/report-intelligence/repository";
import { groundedQuestion, suggestedAnswer } from "@/lib/report-intelligence/questions";
export const runtime = "nodejs";
export const maxDuration = 40;
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: {
  "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
export async function POST(request: Request) {
  if (!verificationEnabled(process.env, new URL(request.url).hostname)) return reply({ error: "Intelligence verification is unavailable." }, 404);
  if (!sameOrigin(request)) return reply({ error: "Reload and try again." }, 403);
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json") || Number(request.headers.get("content-length")) > 1600) throw Error();
    const reader = request.body?.getReader(); if (!reader) throw Error(); const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength;
      if (bytes > 1600) { await reader.cancel(); throw Error(); } chunks.push(part.value); }
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { reportId: string; intent?: string; question?: string };
    if (Object.keys(input).length !== 2 || !intelligenceId(input.reportId) ||
      !(input.intent && ["main-risk", "strongest-support", "before-signing"].includes(input.intent) || typeof input.question === "string")) throw Error();
    const { user, client } = await verifiedUser();
    if (!user || user.is_anonymous || !user.email_confirmed_at || !client) return reply({ error: "Sign in to your verified account." }, 401);
    const active = await client.rpc("sitefit_session_available"); if (active.error || active.data !== true) return reply({ error: "Account unavailable." }, 403);
    const repo = fullRepository(user.id), edition = await repo.read(input.reportId);
    if (input.intent) return reply(suggestedAnswer(edition, input.intent as "main-risk" | "strongest-support" | "before-signing"));
    return reply(await groundedQuestion(edition, input.question!, () => repo.reserveQuestion(edition.id)));
  } catch { return reply({ error: "An evidence-grounded answer is unavailable. Your report is unchanged." }, 503); }
}

import { createServerSupabase } from "@/lib/supabase/server";
import { sameOrigin, submissionBody, ownedGeneration } from "@/lib/analysis/http";
import { generateSnapshot } from "@/lib/analysis/generate";
export const runtime = "nodejs";
export const maxDuration = 120;
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Reload this page and try again." }, 403);
  let input;
  try { input = await submissionBody(request); } catch { return reply({ error: "Choose a resolved address and business type." }, 400); }
  const client = await createServerSupabase();
  if (!client) return reply({ error: "Snapshot generation is temporarily unavailable." }, 503);
  try {
    const verified = await client.auth.getUser();
    let user = verified.error ? null : verified.data.user;
    if (!user) {
      if (verified.error && verified.error.name !== "AuthSessionMissingError") return reply({ error: "Your session could not be verified. Reload and try again." }, 503);
      const guest = await client.auth.signInAnonymously();
      if (guest.error || !guest.data.user) return reply({ error: "Your private Snapshot session could not be created. Try again shortly." }, 503);
      const reverified = await client.auth.getUser(); user = reverified.error ? null : reverified.data.user;
      if (!user) return reply({ error: "Your session could not be verified." }, 503);
    }
    const result = await ownedGeneration(user.id, input, () => generateSnapshot(user.id, input.propertyId, input.businessType, input.nonce, request.signal));
    return reply({ reportId: result.reportId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "unavailable";
    const safeCodes = new Set(["submission_unavailable", "report_read_unavailable", "analysis_configuration_missing", "property_unavailable",
      "outside_analysis_coverage", "location_precision_unavailable", "source_persistence_incomplete", "stored_section_packet_mismatch",
      "section_analysis_incomplete", "synthesis_incomplete", "partial_report_persistence_failed", "report_persistence_failed", "stored_input_read_unavailable", "stored_report_read_unavailable", "generation_busy", "generation_limit"]);
    console.warn("snapshot_generation", { code: safeCodes.has(code) ? code : "unavailable" });
    if (code === "outside_analysis_coverage") return reply({ error: "Location analysis currently covers London. You can choose another address." }, 422);
    if (code === "location_precision_unavailable") return reply({ error: "This address has no usable location point. Select a returned postal address to generate local analysis." }, 422);
    if (code === "generation_busy" || code === "generation_limit") return reply({ error: "A Snapshot is running or the current generation limit has been reached. Try again later." }, 429);
    return reply({ error: "We could not complete your Snapshot. Saved source results are retained; retrying this request will reuse them." }, 503);
  }
}

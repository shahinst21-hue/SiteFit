import nextEnv from "@next/env";
import { frameworkClient } from "../../lib/data/server-client.ts";
import { premisesHistoryRepository } from "../../lib/premises-history/repository.ts";
import { uuid } from "../../lib/data/validation.ts";
import { packetDigest } from "../../lib/analysis/canonical.ts";

// Explicit development operator probe; never imported into the application/CI.
nextEnv.loadEnvConfig(process.cwd(), true);
const [analysisId, inputId] = process.argv.slice(2);
if (process.env.DATA_SOURCE_PROBES_ENABLED !== "true" || process.env.VERCEL_ENV === "production" || ![analysisId, inputId].every(uuid)) {
  throw new Error("Development history probe requires explicit enable and analysis/input IDs.");
}
const client = frameworkClient();
const { data: analysis, error } = await client.from("analyses").select("owner_id").eq("id", analysisId).single();
if (error || !analysis) throw new Error("Development analysis unavailable.");
const { data: owner, error: ownerError } = await client.rpc("sitefit_access_owner", { p_original: analysis.owner_id });
if (ownerError || !owner) throw new Error("Development owner unavailable.");
const repository = premisesHistoryRepository(owner);
const before = await repository.read(analysisId, inputId);
const bundle = await repository.collect(analysisId, inputId, {
  propertyDataKey: process.env.PROPERTYDATA_API_KEY, epcKey: process.env.EPC_API_TOKEN,
});
let replayCalls = 0;
const replay = await repository.collect(analysisId, inputId, { fetcher: async () => { replayCalls++; throw new Error("Replay provider dispatch forbidden."); } });
if (packetDigest(replay) !== packetDigest(bundle) || replayCalls) throw new Error("Historical replay failed.");
console.log(JSON.stringify({ storedBefore: Boolean(before), events: bundle.events.length, replayCalls,
  sources: bundle.receipts.map(r => ({ source: r.source, outcome: r.outcome, candidates: r.candidates, rejected: r.rejected, credits: r.credits, complete: r.complete })) }));

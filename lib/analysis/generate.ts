import "server-only";
import { createHash } from "node:crypto";
import { frameworkClient } from "../data/server-client.ts";
import { framework } from "../data/framework.ts";
import { uuid, validateContext } from "../data/validation.ts";
import { validPoint } from "../spatial/model.ts";
import { spatialRepository } from "../spatial/repository.ts";
import { comparisonRepository } from "./comparison-repository.ts";
import { residentialMetric } from "./metrics.ts";
import { sectionPackets } from "./packets.ts";
import { analysisAIProvider, type AIReceipt } from "./ai-provider.ts";
import { interpretSections, synthesiseSections, restoreSynthesis, type ValidatedSection } from "./section-engine.ts";
import { freeProjection, validateFreeProjection } from "./projection.ts";
import { scoringVersions, weightManifest, type Dimension } from "./scoring.ts";
import type { Json } from "../supabase/database.types.ts";
import type { CollectionContext } from "../data/contracts.ts";
import { evidenceIndex, type Evidence } from "./evidence.ts";
import { validatePacket, type InterpretationPacket } from "./interpretation.ts";
import { packetDigest } from "./canonical.ts";
import { selectEnrichmentReleases, prepareEnrichmentIdentity } from "../data/enrichment-preparation.ts";
import { generateEnrichedSnapshot } from "./generate-enriched.ts";
import type { ResolvedAddress } from "../addresses/model.ts";
const json = (value: unknown) => value as Json;
const dimensions: Dimension[] = ["customer-base", "market-position", "customer-access", "premises"];
export async function generateSnapshot(ownerId: string, propertyId: string, businessType: string, nonce: string, signal?: AbortSignal) {
  if (![ownerId, propertyId, nonce].every(uuid) || !["coffee-shop", "restaurant", "hair-salon", "beauty-salon"].includes(businessType)) throw new Error("invalid_submission");
  const bound = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(110_000)]);
  const databaseBound = (milliseconds: number) => AbortSignal.any([bound, AbortSignal.timeout(milliseconds)]);
  const client = frameworkClient();
  const sha = createHash("sha256").update(JSON.stringify({ propertyId, businessType })).digest("hex");
  const { data: analysis, error: submissionError } = await client.rpc("submit_sitefit_analysis", {
    p_owner: ownerId, p_property: propertyId, p_business: businessType, p_nonce: nonce, p_sha256: sha,
  }).abortSignal(databaseBound(2000));
  if (submissionError || !analysis || analysis.owner_id !== ownerId) throw new Error("submission_unavailable");
  const analysisId = analysis.id;
  const { data: ready, error: readError } = await client.from("reports").select("id,free_projection").eq("analysis_id", analysis.id).eq("tier", "free").eq("status", "ready").eq("schema_version", 2).abortSignal(databaseBound(8000)).maybeSingle();
  if (readError) throw new Error("report_read_unavailable");
  // Historical replay ends here, before creating a collector, spatial repository or AI client.
  if (ready) { validateFreeProjection(ready.free_projection); return { reportId: ready.id, replay: true }; }
  if (!process.env.OPENAI_API_KEY) throw new Error("analysis_configuration_missing");
  const data = framework(ownerId);
  const { data: existing, error: inputReadError } = await client.from("analysis_inputs").select("resolved_context").eq("analysis_id", analysis.id).not("resolved_context", "is", null).order("version", { ascending: true }).limit(1).abortSignal(databaseBound(8000)).maybeSingle();
  if (inputReadError) throw new Error("stored_input_read_unavailable");
  let context: CollectionContext;
  if (existing?.resolved_context) context = validateContext(existing.resolved_context);
  else {
    const { data: property, error } = await client.from("properties").select("*").eq("id", propertyId).abortSignal(databaseBound(2000)).single();
    if (error || !property) throw new Error("property_unavailable");
    const point = property.longitude === null || property.latitude === null ? null : {
      longitude: property.longitude, latitude: property.latitude, crs: "EPSG:4326" as const,
      precision: property.coordinate_precision, source: property.coordinate_source ?? "unknown",
    };
    if (!point || !validPoint(point) || point.precision === "unknown" || property.address_resolution_state !== "provider_verified") throw new Error("location_precision_unavailable");
    const selection = await selectEnrichmentReleases(bound);
    const releases = selection.legacy;
    bound.throwIfAborted();
    const spatial = spatialRepository();
    const geography = await spatial.geography(releases.geography, point);
    bound.throwIfAborted();
    if (!geography.region.eligible) throw new Error("outside_analysis_coverage");
    const selected: ResolvedAddress = {formattedAddress: property.formatted_address, lines: [], postcode: property.postcode ?? "",
      postTown: property.post_town ?? "", country: null, components: property.address_components as ResolvedAddress["components"],
      provider: property.address_provider, providerAddressId: property.provider_address_id, udprn: property.udprn, uprn: null,
      latitude: property.latitude, longitude: property.longitude, coordinatePrecision: point.precision === "postcode_centroid" ? "postcode_centroid" : "unknown",
      coordinateSource: property.coordinate_source, resolution: "provider_verified"};
    const enrichment = await prepareEnrichmentIdentity(selected, selection.enrichment, bound);
    const precise = enrichment.identity.point ? await spatial.geography(releases.geography, enrichment.identity.point) : geography;
    context = await data.repository.prepareEnriched(analysis.id, {}, {region: precise.region, geography: precise.geography, releases}, enrichment);
  }
  const { data: unfinished, error: unfinishedReadError } = await client.from("reports").select("provenance").eq("analysis_id", analysis.id).eq("version", 1).neq("status", "ready").abortSignal(databaseBound(8000)).maybeSingle();
  if (unfinishedReadError) throw new Error("stored_report_read_unavailable");
  if (context.schemaVersion === 2) return generateEnrichedSnapshot(ownerId, context, bound, unfinished?.provenance);
  const collection = await data.collectSources(context, ["ons-population", "tfl-stop-points", "fsa-establishments"], "free-v1", bound);
  const snapshots = collection.outcomes.flatMap(outcome => outcome.snapshot ? [outcome.snapshot] : []);
  if (snapshots.length !== 3) throw new Error("source_persistence_incomplete");
  const provenance = unfinished?.provenance as { partial?: { sections: ValidatedSection[]; evidence: Evidence[]; packets: InterpretationPacket[];
    residential: ReturnType<typeof residentialMetric>; comparison: unknown; dispatches: number; receipts?: AIReceipt[];
    early?: Awaited<ReturnType<typeof synthesiseSections>>; earlyPacketDigest?: string } } | undefined;
  const prior = provenance?.partial;
  const ons = snapshots.find(snapshot => snapshot.result.meta.source === "ons-population")!;
  let comparison: Awaited<ReturnType<ReturnType<typeof comparisonRepository>["residential"]>> = null;
  if (!prior && context.geography && !context.geography.ambiguous && context.releases.population && context.releases.geography) {
    try { comparison = await comparisonRepository().residential(context.releases.population, context.releases.geography, context.geography.code); } catch { /* Only the dependent comparison is unavailable; source outcomes remain preserved. */ }
  }
  const residential = prior?.residential ?? residentialMetric(context, ons, comparison);
  const prepared = prior ? { evidence: prior.evidence, packets: prior.packets,
    index: evidenceIndex(prior.evidence, context.analysisId, context.inputId, new Date()) } : sectionPackets(context, snapshots, residential, new Date());
  for (const packet of prepared.packets) validatePacket(packet, prepared.index);
  const ai = analysisAIProvider({ priorDispatches: prior?.dispatches ?? 0 });
  const interpreted = await interpretSections(prepared.packets, prepared.index, ai, bound, prior?.sections ?? []);
  async function preserveIncomplete(errors: unknown, early?: Awaited<ReturnType<typeof synthesiseSections>>) {
    // Analytical content belongs to a private unfinished report, never operational logs.
    const { error } = await client.from("reports").upsert({ analysis_id: analysisId, input_id: context.inputId, version: 1, schema_version: 2,
      tier: "free", status: "failed", provenance: json({ partial: { sections: interpreted.sections, errors,
        evidence: prepared.evidence, packets: prepared.packets, residential, comparison: prior?.comparison ?? comparison,
        dispatches: ai.dispatches(), receipts: [...(prior?.receipts ?? []), ...ai.receipts()],
        ...(early ? { early, earlyPacketDigest: packetDigest(interpreted.sections) } : {}) } }) }, { onConflict: "analysis_id,version" }).abortSignal(AbortSignal.timeout(8000));
    if (error) throw new Error("partial_report_persistence_failed");
  }
  if (interpreted.errors.length) {
    await preserveIncomplete(interpreted.errors);
    throw new Error("section_analysis_incomplete");
  }
  let early;
  try {
    if (prior?.early) {
      early = restoreSynthesis(prior.early, prior.earlyPacketDigest, interpreted.sections, prepared.index);
    } else early = await synthesiseSections(interpreted.sections, ai, bound);
  }
  catch { await preserveIncomplete([{ section: "early-view", code: "synthesis_unavailable" }]); throw new Error("synthesis_incomplete"); }
  const generatedAt = new Date().toISOString();
  const projection = validateFreeProjection(freeProjection(context, interpreted.sections, early, prepared.evidence, residential, generatedAt));
  // Exact cohort operands occur once, referenced by the descriptive metric.
  const compactMetric = { ...residential, operands: undefined, comparisonReference: "provenance.comparison",
    ranking: residential.ranking ? { ...residential.ranking, cohort: { ...residential.ranking.cohort, members: undefined },
      membersReference: "provenance.comparison.members" } : null };
  const audit = { inputId: context.inputId, generatedAt, scoringVersions,
    weights: dimensions.map(dimension => weightManifest(dimension, context.category)), metrics: [compactMetric], comparison: prior?.comparison ?? comparison,
    ai: { sections: interpreted.sections.map(section => section.receipt), synthesis: early.receipt, dispatches: ai.dispatches(),
      receipts: [...(prior?.receipts ?? []), ...ai.receipts()] },
    sourceSnapshotIds: snapshots.map(snapshot => snapshot.id), inputContext: context };
  const sectionRows = [{ section: "early-view", ...early }, ...interpreted.sections.map(section => ({ ...section,
    evidenceIds: [...new Set([section.conclusion, ...section.reasons, ...section.support, ...section.opposition, ...section.alternatives, ...section.unknowns, section.implication, section.question].flatMap(p => p.evidenceIds))] }))];
  const { data: reportId, error: finaliseError } = await client.rpc("finalise_sitefit_free", {
    p_owner: ownerId, p_analysis: analysis.id, p_input: context.inputId, p_evidence: json(prepared.evidence), p_sections: json(sectionRows), p_projection: json(projection), p_provenance: json(audit),
  }).abortSignal(databaseBound(8000));
  if (finaliseError || !reportId) {
    await preserveIncomplete([{ section: "early-view", code: "report_persistence_failed" }], early);
    throw new Error("report_persistence_failed");
  }
  return { reportId, replay: false };
}

import "server-only";
import { framework } from "../data/framework.ts";
import { frameworkClient } from "../data/server-client.ts";
import { collector } from "../data/collect.ts";
import { collectEnrichment, collectTransportEnrichment } from "../data/enrichment-collection.ts";
import { nativeContextAdapter } from "../data/adapters/native-context.ts";
import { premisesAdapter } from "../data/adapters/premises.ts";
import { epcAdapter } from "../data/adapters/epc.ts";
import type { CollectionContext } from "../data/contracts.ts";
import type { Json } from "../supabase/database.types.ts";
import { enrichedPackets } from "./enriched-packets.ts";
import { enrichedProjection } from "./enriched-projection.ts";
import { evidenceIndex, type Evidence } from "./evidence.ts";
import { analysisAIProvider, type AIReceipt } from "./ai-provider.ts";
import { interpretSections, synthesiseSections, restoreSynthesis, type ValidatedSection } from "./section-engine.ts";
import { validatePacket, type InterpretationPacket } from "./interpretation.ts";
import { packetDigest } from "./canonical.ts";
import { weightManifest, scoringVersions } from "./scoring.ts";

type Early = Awaited<ReturnType<typeof synthesiseSections>>;
type Partial = {enrichmentVersion: "phase8-observations-1"; evidence: Evidence[]; packets: InterpretationPacket[];
  sections: ValidatedSection[]; dispatches: number; receipts: AIReceipt[]; early?: Early; earlyPacketDigest?: string};
const json = (v: unknown) => v as Json;
/** Entered only after ready replay and frozen input reads. Historical v1 inputs
 * continue through the original generator; source and AI replay stay immutable. */
export async function generateEnrichedSnapshot(owner: string, context: CollectionContext, signal: AbortSignal, unfinished: unknown) {
  if (context.schemaVersion !== 2) throw new Error("enriched_generation_context_required");
  const data = framework(owner), client = frameworkClient(), key = "free-enriched-v1";
  const groups = await Promise.all([
    data.collectSources(context,["ons-population","tfl-stop-points","fsa-establishments"],key,signal),
    collectEnrichment(data.repository,context,key,signal),
    collectTransportEnrichment(data.repository,context,key,signal),
    collector(data.repository,[premisesAdapter("propertydata-premises"),premisesAdapter("propertydata-flood"),premisesAdapter("propertydata-rent")])
      .collectSources(context,["propertydata-premises","propertydata-flood","propertydata-rent"],key,signal),
    collector(data.repository,[nativeContextAdapter("ons-income-context"),nativeContextAdapter("ons-jobs-context")])
      .collectSources(context,["ons-income-context","ons-jobs-context"],key,signal),
  ]);
  const snapshots = groups.flatMap(g => g.outcomes.flatMap(o => o.snapshot ? [o.snapshot] : []));
  if (snapshots.length !== 16) throw new Error("source_persistence_incomplete");
  const premises=snapshots.find(s=>s.result.meta.source==="propertydata-premises");
  const fallback=await collector(data.repository,[epcAdapter(premises)]).collectSources(context,["govuk-non-domestic-epc"],key,signal);
  const certificate=fallback.outcomes[0]?.snapshot;
  if(!certificate)throw new Error("source_persistence_incomplete");
  snapshots.push(certificate);
  const prior = (unfinished as {partial?: Partial} | null)?.partial;
  if (prior && prior.enrichmentVersion !== "phase8-observations-1") throw new Error("stored_enrichment_version_mismatch");
  const built = enrichedPackets(context,snapshots,null,new Date());
  const prepared = prior ? {...built, evidence: prior.evidence, packets: prior.packets,
    index: evidenceIndex(prior.evidence,context.analysisId,context.inputId,new Date())} : built;
  for (const p of prepared.packets) validatePacket(p,prepared.index);
  const ai = analysisAIProvider({priorDispatches: prior?.dispatches ?? 0});
  const interpreted = await interpretSections(prepared.packets,prepared.index,ai,signal,prior?.sections ?? []);
  async function preserve(errors: unknown, early?: Early) {
    const {error} = await client.from("reports").upsert({analysis_id: context.analysisId,input_id: context.inputId,version:1,schema_version:2,tier:"free",status:"failed",
      provenance:json({partial:{enrichmentVersion:"phase8-observations-1",evidence:prepared.evidence,packets:prepared.packets,sections:interpreted.sections,
        dispatches:ai.dispatches(),receipts:[...(prior?.receipts??[]),...ai.receipts()],errors,...(early ? {early,earlyPacketDigest:packetDigest(interpreted.sections)} : {})}})},
      {onConflict:"analysis_id,version"}).abortSignal(AbortSignal.timeout(8000));
    if(error)throw new Error("partial_report_persistence_failed");
  }
  if(interpreted.errors.length){await preserve(interpreted.errors);throw new Error("section_analysis_incomplete");}
  let early: Early;
  try {early=prior?.early ? restoreSynthesis(prior.early,prior.earlyPacketDigest,interpreted.sections,prepared.index) : await synthesiseSections(interpreted.sections,ai,signal);}
  catch {await preserve([{section:"early-view",code:"synthesis_unavailable"}]);throw new Error("synthesis_incomplete");}
  const generatedAt=new Date().toISOString(), projection=enrichedProjection(context,interpreted.sections,early,prepared.evidence,snapshots,null,generatedAt);
  const audit={inputId:context.inputId,generatedAt,scoringVersions,
    weights:prepared.packets.map(p=>weightManifest(p.section,context.category)),
    metrics:built.metrics.map(m=>({id:m.id,version:m.version,sourceSnapshotId:m.sourceSnapshotId,score:null,direction:"unreviewed"})),comparison:null,
    ai:{receipts:[...(prior?.receipts??[]),...ai.receipts()],dispatches:ai.dispatches()},sourceSnapshotIds:snapshots.map(s=>s.id),inputContext:context,
    enrichmentVersion:"phase8-observations-1",candidateScoringActivated:false,deferredEconomics:built.deferredEconomics};
  const sections=[{section:"early-view",...early},...interpreted.sections.map(s=>({...s,evidenceIds:[...new Set([s.conclusion,...s.reasons,...s.support,...s.opposition,...s.alternatives,...s.unknowns,s.implication,s.question].flatMap(p=>p.evidenceIds))]}))];
  const {data:reportId,error}=await client.rpc("finalise_sitefit_free",{p_owner:owner,p_analysis:context.analysisId,p_input:context.inputId,
    p_evidence:json(prepared.evidence),p_sections:json(sections),p_projection:json(projection),p_provenance:json(audit)}).abortSignal(AbortSignal.any([signal,AbortSignal.timeout(8000)]));
  if(error||!reportId){await preserve([{section:"early-view",code:"report_persistence_failed"}],early);throw new Error("report_persistence_failed");}
  return {reportId,replay:false};
}

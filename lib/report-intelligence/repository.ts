import "server-only";
import { frameworkClient } from "../data/server-client.ts";
import { canonicalJSON, packetDigest } from "../analysis/canonical.ts";
import { validateAssessment } from "../analysis/assessment.ts";
import { assessmentRepository } from "../analysis/assessment-repository.ts";
import { object, uuid, validateContext } from "../data/validation.ts";
import { validateEvidence, type Evidence } from "../analysis/evidence.ts";
import type { Json } from "../supabase/database.types.ts";
import { buildCatalog, catalogPacket, type Catalog, type SectionKey } from "./catalog.ts";
import { intelligencePolicy, newCheckpoint, validateCheckpoint, type Checkpoint } from "./execution.ts";
import { validateDiscovery } from "../web-evidence/model.ts";
import { validateFullProjection } from "./export.ts";
import { storedProfiles, profileFocus } from "./profiles.ts";
import { fullRequest } from "./provider.ts";
import { groupInstructions, selectionSchema } from "./selection.ts";
import { evaluateScenarioFit, type ScenarioFit } from "./scenario-fit.ts";
import { projectOperators } from "./operators.ts";
import { privateTokenText } from "../data/private-text.ts";
import { storedRentalSupplements } from "./rental-preparation.ts";
import { rentalFallback, approvedRentalSources, type RentSourceAdapter, type RentalFallback } from "../web-evidence/rental-fallback.ts";
import { webEvidenceSearch } from "../web-evidence/search.ts";
import { applyRentalDiscovery } from "./rental-discovery.ts";

type Rpc = { rpc(name: string, args: Record<string, Json | null>): PromiseLike<{ data: unknown; error: unknown }> };
export type Preparation = { version: "full-preparation-v1"; configuration: "full-intelligence-v1";
  narrativeVersion?: "consultant-narrative-v1";
  verificationRunId?: string;
  appendixPolicy?: "deterministic-appendix-v1";
  analysisId: string; inputId: string; assessmentId: string; assessmentDigest: string; catalog: Catalog;
  scenarioFit?: ScenarioFit;
  profiles?: ReturnType<typeof storedProfiles>;
  rentalPreparation?: { version: "rental-preparation-v1"; supplementDigests: string[]; sourceBindings: { snapshotId: string; checksum: string }[];
    fallback: { state: RentalFallback["state"]; receipt: RentalFallback["receipt"]; findingDigests: string[]; findings: RentalFallback["findings"] } };
  identityOmissions?: string[];
  presentation?: { freeReportId: string; analysisTimestamp: string; property: { id: string; label: string; precision: string };
    spatial: { reportId: string; digest: string | null; state: "available" | "unavailable" }; photo: { state: "unavailable" } };
  packetDigests: { context: string; premises: string } };
export type StoredEdition = { id: string; analysisId: string; inputId: string; revision: number; status: "draft" | "ready";
  preparation: Preparation; checkpoint: Checkpoint; projection: unknown };
export function validateStoredEdition(value: unknown): StoredEdition {
  const row = object(value), provenance = object(row.provenance), p = object(provenance.preparation);
  if (![row.id, row.analysisId, row.inputId].every(uuid) || !Number.isSafeInteger(row.revision) || !["draft", "ready"].includes(String(row.status)) ||
    p.version !== "full-preparation-v1" || p.analysisId !== row.analysisId || p.inputId !== row.inputId || p.configuration !== "full-intelligence-v1") throw Error("invalid_full_edition");
  const checkpoint = validateCheckpoint(provenance.checkpoint as Checkpoint);
  if (checkpoint.bindingDigest !== packetDigest(p) || checkpoint.revision !== row.revision) throw Error("invalid_full_binding");
  if (p.scenarioFit) {
    const fit = p.scenarioFit as ScenarioFit;
    const category = fit.businessType === "hair-salon" || fit.businessType === "beauty-salon" ? "hair-beauty-salon" : fit.businessType;
    if (fit.version !== "scenario-fit-v1" || fit.registryVersion !== "operating-formats-v1" ||
      fit.numericalScore !== null || fit.scenarios.length !== 3 || category !== (p.catalog as Catalog).business ||
      fit.subtype === "barber" && fit.businessType !== "hair-salon") throw Error("invalid_scenario_binding");
  }
  if (row.status === "ready") {
    const projection = validateFullProjection(row.projection);
    if (projection.bindingDigest !== checkpoint.bindingDigest || packetDigest(projection.index) !== packetDigest(object(p.catalog).index) ||
      packetDigest(projection.readiness) !== packetDigest(object(p.catalog).readiness) ||
      p.scenarioFit && packetDigest(projection.scenarioFit) !== packetDigest(p.scenarioFit)) throw Error("invalid_full_replay");
  }
  return { id: String(row.id), analysisId: String(row.analysisId), inputId: String(row.inputId), revision: Number(row.revision),
    status: row.status as StoredEdition["status"], preparation: p as Preparation, checkpoint, projection: row.projection };
}
export function fullRepository(owner: string, client = frameworkClient()) {
  if (!uuid(owner)) throw Error("permission_denied"); const rpc = client as unknown as Rpc;
  const invoke = async (name: string, args: Record<string, Json | null>) => {
    const result = await rpc.rpc(name, { p_owner: owner, ...args });
    if (result.error || result.data === null) throw Error("full_operation_unavailable"); return result.data;
  };
  const read = async (reportId: string) => {
    if (!uuid(reportId)) throw Error("invalid_request");
    return validateStoredEdition(await invoke("read_sitefit_full", { p_report: reportId }));
  };
  return { read, async material(freeReportId:string){
    if(!uuid(freeReportId))throw Error('invalid_request');
    return invoke('read_sitefit_full_material',{p_free:freeReportId});
  }, async start(freeReportId: string, rentalExecution: { grantId: string; sources?: readonly RentSourceAdapter[] } | null = null,
    verificationRunId?: string): Promise<StoredEdition> {
    if (!uuid(freeReportId)) throw Error("invalid_request");
    // Private operator proof only; HTTP handlers never accept this argument.
    if (verificationRunId && (!uuid(verificationRunId) || process.env.VERCEL_ENV === "production")) throw Error("invalid_technical_proof");
    const existing = await rpc.rpc("find_sitefit_full", { p_owner: owner, p_free: freeReportId });
    if (existing.error) throw Error("full_operation_unavailable");
    if (existing.data !== null && !verificationRunId) return validateStoredEdition(existing.data);
    const material = object(await invoke("read_sitefit_full_material", { p_free: freeReportId }));
    const context = validateContext(material.context);
    if (material.assessment === null) {
      if (!Number.isSafeInteger(material.databaseBytes) || Number(material.databaseBytes) + 400_000 > 450_000_000)
        throw Error("capacity_checkpoint");
      // First paid preparation may have no Phase 11 supplement yet. Reuse that
      // existing frozen-input method once; no provider/AI/scoring-policy change.
      const assessments = assessmentRepository(owner, client);
      try { await assessments.prepare(context.analysisId, context.inputId); }
      catch {
        // A concurrent first preparation can win the immutable assessment
        // write. Reuse that winner; never recalculate or overwrite it.
        if (!await assessments.read(context.analysisId, context.inputId)) throw Error("assessment_preparation_unavailable");
      }
      return this.start(freeReportId, rentalExecution, verificationRunId);
    }
    const assessment = validateAssessment(material.assessment);
    if (assessment.contextDigest !== packetDigest(context) || assessment.analysisId !== context.analysisId ||
      assessment.inputId !== context.inputId || assessment.propertyId !== context.selectedProperty.id ||
      packetDigest(assessment) !== material.assessmentDigest || !uuid(material.assessmentId) || !Array.isArray(material.evidence)) throw Error("full_source_binding_invalid");
    const evidence: Evidence[] = material.evidence.map(e => { validateEvidence(e); return e; });
    const preparedAt = new Date();
    const rentalSupplements = storedRentalSupplements(context, assessment, Array.isArray(material.rentalSnapshots) ? material.rentalSnapshots : [], preparedAt);
    const catalog = buildCatalog(assessment, evidence, preparedAt, material.discovery === null ? null : validateDiscovery(material.discovery), rentalSupplements);
    let discoveryExecution = rentalExecution;
    if (!discoveryExecution && !catalog.rentalObservations.length && process.env.SITEFIT_RENT_DISCOVERY_ENABLED === "1" &&
      process.env.VERCEL_ENV !== "production" && approvedRentalSources.length) {
      // Owner-configured activation still needs a scoped durable approval. Never
      // accept grants, policies or parsers from a customer request body.
      const { data: grants, error } = await client.from("system_events").select("id").eq("analysis_id", context.analysisId)
        .eq("event_type", "rent-search-owner-approved").eq("safe_metadata->>ownerId", owner).eq("safe_metadata->>inputId", context.inputId)
        .order("occurred_at", { ascending: false }).limit(1);
      if (error) throw Error("rental_grant_read_unavailable");
      if (grants?.[0]) discoveryExecution = { grantId: grants[0].id, sources: approvedRentalSources };
    }
    const fallback = await rentalFallback(context, catalog.rentalObservations.length, discoveryExecution ? {
      grantId: discoveryExecution.grantId, sources: discoveryExecution.sources ?? approvedRentalSources,
      reserve: async (grantId, policies) => {
        if (!Number.isSafeInteger(material.reservedMicros) || Number(material.reservedMicros) + intelligencePolicy.reportReserveMicros > intelligencePolicy.phaseBudgetMicros)
          throw Error("full_report_budget_unavailable");
        await invoke("reserve_sitefit_rent_search", { p_analysis: context.analysisId, p_input: context.inputId, p_grant: grantId, p_policies: policies });
      },
      discover: address => webEvidenceSearch({ enabled: true, approvedUsd: .5,
        allowedDomains: (discoveryExecution.sources ?? approvedRentalSources).map(s => s.permission.host) }).discover(address, { kind: "rent" }),
      settle: async (receipt, state) => {
        await invoke("settle_sitefit_rent_search", { p_analysis: context.analysisId, p_input: context.inputId,
          p_grant: discoveryExecution.grantId, p_receipt: receipt as unknown as Json, p_state: state });
      },
    } : null);
    applyRentalDiscovery(context, catalog, fallback);
    projectOperators(context, assessment, catalog, Array.isArray(material.operatorSnapshots) ? material.operatorSnapshots : [], new Date());
    const scenarioFit = evaluateScenarioFit({ businessType: context.businessType, facts: catalog.facts,
      history: catalog.timeline, rental: catalog.rentalObservations });
    const profiles = storedProfiles(context, assessment, Array.isArray(material.profileSnapshots) ? material.profileSnapshots : []);
    profileFocus(catalog, profiles);
    const identityOmissions = [context.selectedProperty.formattedAddress, context.selectedProperty.postcode, context.selectedProperty.uprn,
      context.selectedProperty.providerAddressId].filter((v): v is string => typeof v === "string" && v.length > 3);
    const packet = (keys: SectionKey[]) => {
      const projected = catalogPacket(catalog, keys, identityOmissions), encoded = JSON.stringify(projected);
      // Protect against identity hidden in free source text, not just named JSON fields.
      if (identityOmissions.some(v => encoded.toLowerCase().includes(v.toLowerCase())) || /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(encoded) ||
        privateTokenText(encoded) || /guestClaim|authorization/i.test(encoded)) throw Error("full_packet_identity_rejected");
      fullRequest(keys.includes("premises") ? "premises" : "context", projected, groupInstructions, selectionSchema);
      return projected;
    };
    const preparation: Preparation = { version: "full-preparation-v1", configuration: "full-intelligence-v1",
      narrativeVersion: "consultant-narrative-v1",
      appendixPolicy: "deterministic-appendix-v1",
      ...(verificationRunId ? { verificationRunId } : {}),
      analysisId: assessment.analysisId, inputId: assessment.inputId, assessmentId: material.assessmentId,
      assessmentDigest: String(material.assessmentDigest), catalog,
      scenarioFit,
      rentalPreparation: { version: "rental-preparation-v1", supplementDigests: rentalSupplements.map(packetDigest),
        sourceBindings: rentalSupplements.flatMap(s => s.sourceBindings),
        fallback: { state: fallback.state, receipt: fallback.receipt, findingDigests: fallback.findings.map(f => f.id), findings: fallback.findings } },
      profiles, identityOmissions,
      presentation: { freeReportId, analysisTimestamp: context.analysisTimestamp,
        property: { id: context.selectedProperty.id, label: context.selectedProperty.formattedAddress,
          precision: context.enrichment?.identity.point?.precision ?? context.selectedProperty.point?.precision ?? "unknown" },
        spatial: { reportId: freeReportId, digest: material.spatial === null ? null : packetDigest(material.spatial), state: material.spatial === null ? "unavailable" : "available" },
        photo: { state: "unavailable" } },
      packetDigests: { context: packetDigest(packet(["customer-context", "competition", "access"])), premises: packetDigest(packet(["premises", "rental-context"])) } };
    const checkpoint = newCheckpoint(preparation);
    if (Buffer.byteLength(canonicalJSON(preparation)) > intelligencePolicy.maxPreparationBytes) throw Error("full_preparation_bounds");
    return validateStoredEdition(await invoke("start_sitefit_full", { p_free: freeReportId,
      p_preparation: canonicalJSON(preparation), p_checkpoint: canonicalJSON(checkpoint) }));
  }, async checkpoint(edition: StoredEdition, next: Checkpoint) {
    return validateStoredEdition(await invoke("checkpoint_sitefit_full", { p_report: edition.id, p_revision: edition.revision,
      p_checkpoint: canonicalJSON(validateCheckpoint(next)) }));
  }, async freeze(edition: StoredEdition, projection: unknown) {
    validateFullProjection(projection);
    return validateStoredEdition(await invoke("freeze_sitefit_full", { p_report: edition.id, p_revision: edition.revision,
      p_projection: canonicalJSON(projection) }));
  }, async reserveQuestion(reportId: string) {
    if (!uuid(reportId)) throw Error("invalid_request");
    const ordinal = Number(await invoke("reserve_sitefit_full_question", { p_report: reportId }));
    if (!Number.isSafeInteger(ordinal) || ordinal < 1 || ordinal > 5) throw Error("question_unavailable");
    return { ordinal, settle: async (receipt: unknown, state: string) => {
      await invoke("settle_sitefit_full_question", { p_report: reportId, p_ordinal: ordinal,
        p_receipt: canonicalJSON(receipt), p_state: state });
    } };
  } };
}

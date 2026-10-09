import "server-only";
import type { DataAdapter, SourceId } from "../contracts.ts";
import { coverage } from "../coverage.ts";
import { definitions } from "../registry.ts";
import { initialResult } from "../result.ts";
import { validateContext, validateResult } from "../validation.ts";
import { enrichmentRepository } from "../enrichment-repository.ts";
import { SourceError } from "../errors.ts";

type PlanningSource = Extract<SourceId, "planning-conservation" | "planning-article4">;
export function planningAdapter(id: PlanningSource, repository: typeof enrichmentRepository = enrichmentRepository): DataAdapter {
  const source = definitions[id], dataset = id === "planning-conservation" ? "conservation-area" : "article-4-direction-area";
  return { source, supports: context => coverage(id, context), async retrieve(request, execution) {
    const context = validateContext(request.context), result = initialResult(source, request, execution);
    const eligible = coverage(id, context);
    if (!eligible.eligible) { result.outcome = eligible.outcome; result.error = { code: eligible.code, status: null, retryable: false }; return validateResult(result); }
    if (!context.enrichment?.identity.point) throw new SourceError("insufficient_precision");
    const started = Date.now(), releases = context.enrichment.releases;
    const lookup = await repository(releases).constraints(dataset, context.enrichment.identity.point, execution.signal);
    result.outcome = "partial"; result.payload = { schemaVersion: 1, kind: "planning_constraints", lookup };
    result.meta.datasetReleaseId = id === "planning-conservation" ? releases.conservationReleaseId : releases.article4ReleaseId;
    result.meta.sourceVersion = result.meta.datasetReleaseId;
    result.meta.quality.precision = "building"; result.meta.quality.missing = ["publisher_complete_coverage", "legal_applicability", "premises_extent", "permitted_use"];
    result.limitations = ["Published designation profiles at an OS address/building point; not premises extent or an entrance.",
      "No matching profile is not clearance: publisher coverage is unconfirmed.",
      "Legal scope, dates and applicability require review; these records do not confirm permitted use."];
    result.meta.quality.limitations = [...result.limitations];
    result.meta.cache.state = "local_release";
    result.meta.cost = { units: 0, money: "0", currency: "GBP", category: "observed", priceReference: source.id === "planning-conservation" ? "https://www.planning.data.gov.uk/dataset/conservation-area" : "https://www.planning.data.gov.uk/dataset/article-4-direction-area" };
    result.meta.execution.durationMs = Math.max(0, Date.now() - started);
    result.meta.retrievedAt = execution.now().toISOString(); result.meta.sourceRetrievedAt = result.meta.retrievedAt;
    result.observations = [{ id: `${id}-inventory`, path: "lookup", recordId: result.meta.datasetReleaseId,
      reference: result.meta.licence.termsUrl, observedAt: null, units: "published_designation_profiles", geography: context.geography?.code ?? null,
      sourceClass: "official_public_data", kind: "direct_register", limitations: [...result.limitations] }];
    return validateResult(result);
  } };
}

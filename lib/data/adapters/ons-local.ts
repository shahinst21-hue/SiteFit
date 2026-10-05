import "server-only";
import type { DataAdapter, LicenceMetadata } from "../contracts.ts";
import { coverage } from "../coverage.ts";
import { SourceError, safeError } from "../errors.ts";
import { definitions } from "../registry.ts";
import { initialResult } from "../result.ts";
import { assertPolicy } from "../policy.ts";
import { object, validateContext, validateResult } from "../validation.ts";
import { spatialRepository } from "../../spatial/repository.ts";
export function onsLocal(repository: Pick<ReturnType<typeof spatialRepository>, "population"> = spatialRepository()): DataAdapter {
  const source = definitions["ons-population"];
  return { source, supports: context => coverage(source.id, context), async retrieve(request, execution) {
    validateContext(request.context); const result = initialResult(source, request, execution); const started = performance.now();
    const eligible = coverage(source.id, request.context);
    if (!eligible.eligible) { result.outcome = eligible.outcome; result.error = { code: eligible.code, retryable: false, status: null }; return validateResult(result); }
    try {
      const c = request.context, releaseId = c.releases.population, geographyReleaseId = c.releases.geography;
      if (!releaseId || !geographyReleaseId || !c.geography || c.geography.releaseId !== geographyReleaseId) throw new SourceError("dataset_missing");
      result.meta.execution.attempts = 1;
      const signal = AbortSignal.any([execution.signal, AbortSignal.timeout(source.timeoutMs)]);
      const value = await repository.population(releaseId, geographyReleaseId, c.geography.code, signal);
      if (!value) throw new SourceError("dataset_missing");
      const row = object(value); result.meta.licence = object(row.licence) as LicenceMetadata; assertPolicy(result.meta.licence);
      result.meta.datasetReleaseId = releaseId; result.meta.sourceVersion = String(row.version); result.meta.checksum = String(row.checksum);
      result.meta.sourceRetrievedAt = String(row.sourceRetrievedAt); result.meta.observedAt = String(row.effectiveAt); result.meta.publishedAt = row.publishedAt === null ? null : String(row.publishedAt);
      result.meta.licence.rawDisposition = "not_returned";
      result.meta.freshness = { assessedAt: execution.now().toISOString(), state: "stale", reason: "Census 2021 vintage is a dated baseline, not current residents or demand.", ruleVersion: "census2021-vintage-1" };
      result.meta.cache.state = "local_release";
      result.meta.cost = { units: 0, money: "0", currency: "GBP", category: "estimated", priceReference: "https://www.nomisweb.co.uk/sources/census_2021_bulk" };
      result.limitations = ["Census usual residents, not footfall, customers, spend or present-day population.", "Disclosure uses targeted swapping and cell-key perturbation.", "An OA total is not a radius/catchment estimate.", "Pinned boundary release includes recorded area-preserving topology normalisation."];
      if (c.geography.method === "centroid_proxy") result.limitations.push("Postcode-centroid OA assignment is provisional area context, not exact premises geography.");
      result.payload = { schemaVersion: 1, kind: "area_population", geographyCode: c.geography.code, geographyReleaseId, measure: "TS001-total", count: row.count as number | null,
        missingReason: row.missingReason as string | null, units: "persons", universe: "usual_residents", effectiveAt: String(row.effectiveAt), releaseId };
      result.outcome = row.count === null ? "partial" : "success"; if (row.count === null) result.meta.quality.missing.push("resident_count");
      result.observations = [{ id: `${releaseId}:${c.geography.code}:TS001-total`, path: "count", recordId: c.geography.code, reference: "https://www.nomisweb.co.uk/output/census/2021/census2021-ts001.zip", observedAt: String(row.effectiveAt), units: "persons", geography: c.geography.code, sourceClass: "official_public_data", kind: "measured", limitations: [...result.limitations] }];
    } catch (error) { result.outcome = "unavailable"; result.payload = null; result.observations = []; result.error = safeError(error); }
    result.meta.execution.durationMs = Math.round(performance.now() - started); result.meta.quality.limitations = [...result.limitations];
    return validateResult(result);
  } };
}

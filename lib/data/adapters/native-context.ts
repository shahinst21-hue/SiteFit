import "server-only";
import type { CollectionContext, DataAdapter } from "../contracts.ts";
import { definitions } from "../registry.ts";
import { coverage } from "../coverage.ts";
import { initialResult } from "../result.ts";
import { safeError, SourceError } from "../errors.ts";
import { validateContext, validateResult } from "../validation.ts";
import { validateNativeContextResult, type NativeContextResult } from "../native-context-result.ts";
import { frameworkClient } from "../server-client.ts";

type Id = "ons-income-context" | "ons-jobs-context";
export function nativeContextRepository() {
  return {async read(context: CollectionContext, id: Id, signal: AbortSignal): Promise<NativeContextResult | null> {
    const c = validateContext(context);
    if (c.schemaVersion !== 2 || !c.enrichment || !c.geography || c.geography.ambiguous) throw new SourceError("invalid_request");
    const e = c.enrichment.releases;
    const {data, error} = await frameworkClient().rpc("lookup_sitefit_owned_native_context", {
      p_oa_release_id: e.geographyReleaseId, p_native_release_id: e.nativeReleaseId,
      p_statistic_release_id: id === "ons-income-context" ? e.incomeReleaseId : e.bresReleaseId,
      p_oa_code: c.geography.code,
    }).abortSignal(signal);
    if (error) throw new SourceError("provider_unavailable");
    if (data === null) return null;
    if (JSON.stringify(data).length > 1_000_000) throw new SourceError("invalid_response");
    return validateNativeContextResult(data);
  }};
}
export function nativeContextAdapter(id: Id, factory = nativeContextRepository): DataAdapter {
  const source = definitions[id];
  return {source, supports: c => coverage(id, c), async retrieve(request, execution) {
    const c = validateContext(request.context), r = initialResult(source, request, execution), start = performance.now();
    try {
      const p = await factory().read(c, id, execution.signal);
      if (!p) throw new SourceError("dataset_missing");
      r.payload = p; r.outcome = "success";
      r.meta.datasetReleaseId = String(p.distribution.releaseId); r.meta.sourceVersion = String(p.distribution.releaseVersion);
      r.meta.sourceRetrievedAt = String(p.distribution.sourceRetrievedAt);
      r.meta.publishedAt = p.distribution.publishedAt as string | null;
      r.meta.cache.state = "local_release";
      r.limitations = ["All-London native-area distribution, target excluded; not comparable commercial sites or walking catchments.",
        id === "ons-income-context" ? "Modelled annual household income is not customer spending." : "Employee jobs are rounded native counts, not footfall, customers or an admitted density ranking."];
      const target = p.distribution.target as {geography: {code: string}; measure: {unit: string}};
      r.observations = [{id: target.geography.code, recordId: target.geography.code, path: "distribution", geography: target.geography.code,
        reference: r.meta.licence.termsUrl, observedAt: null, units: target.measure.unit,
        sourceClass: "official_public_data", kind: id === "ons-income-context" ? "modelled" : "measured", limitations: [...r.limitations]}];
    } catch (error) {r.payload = null; r.outcome = "unavailable"; r.error = safeError(error);}
    r.meta.execution.durationMs = Math.round(performance.now() - start);
    r.meta.quality.limitations = [...r.limitations]; return validateResult(r);
  }};
}

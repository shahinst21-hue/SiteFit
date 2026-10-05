import type { ExecutionContext, ProviderResult, SourceDefinition, SourceRequest } from "./contracts.ts";
import { policy } from "./policy.ts";
export function initialResult(source: SourceDefinition, request: SourceRequest, execution: ExecutionContext): ProviderResult {
  const date = execution.now().toISOString();
  return { schemaVersion: 1, outcome: "unavailable", payload: null, observations: [], limitations: [], error: null,
    meta: { source: source.id, provider: source.provider, dataset: source.dataset, operation: source.operation, contractVersion: 1,
      adapterVersion: source.adapterVersion, normalisationVersion: source.normalisationVersion, sourceVersion: null, datasetReleaseId: null, checksum: null,
      correlationId: execution.correlationId, retrievedAt: date, sourceRetrievedAt: date, observedAt: null, publishedAt: null,
      quality: { precision: request.context.selectedProperty.point?.precision ?? "unknown", coverage: "london", truncated: false, missing: [], limitations: [] },
      freshness: { assessedAt: date, state: "unknown", reason: "Source observation date unavailable; retrieval time is not observation time.", ruleVersion: "1" }, licence: policy(source.id),
      cache: { state: "bypass", key: null, expiresAt: null }, cost: { units: null, money: null, currency: null, category: "unknown", priceReference: null },
      execution: { durationMs: 0, attempts: 0, pages: 0, httpStatus: null, providerRequestId: null } } };
}

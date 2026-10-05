import type { CollectionContext, ProviderResult } from "../../../lib/data/contracts.ts";
export const ids = { analysis: "10000000-0000-0000-0000-000000000001", input: "10000000-0000-0000-0000-000000000002", property: "10000000-0000-0000-0000-000000000003", release: "10000000-0000-0000-0000-000000000004", correlation: "10000000-0000-0000-0000-000000000005" };
export const date = "2026-10-05T00:00:00.000Z";
export function context(): CollectionContext {
  return { schemaVersion: 1, analysisId: ids.analysis, inputId: ids.input, inputVersion: 1, analysisTimestamp: date,
    selectedProperty: { id: ids.property, formattedAddress: "Synthetic test premises", postcode: null, provider: null, providerAddressId: null, uprn: null,
      point: { longitude: -0.1, latitude: 51.5, crs: "EPSG:4326", precision: "postcode_centroid", source: "synthetic" }, resolution: "manual_unverified" },
    businessType: "coffee-shop", category: "coffee-shop", region: { id: "london", boundaryReleaseId: ids.release, eligible: true, method: "centroid_proxy" },
    geography: { code: "E00100001", type: "OA2021", releaseId: ids.release, method: "centroid_proxy", ambiguous: false }, releases: { population: ids.release, geography: ids.release } };
}
export function result(): ProviderResult {
  const permit = { allowed: true, maxDays: null, condition: "Synthetic fixture only" };
  return { schemaVersion: 1, outcome: "success", payload: { schemaVersion: 1, kind: "transport_access_points", complete: true,
    items: [{ id: "synthetic-stop-1", name: "Synthetic stop", mode: "bus", originalMode: "bus", point: null }] },
    observations: [{ id: "synthetic-stop-1", path: "items/0", recordId: "synthetic-stop-1", reference: "https://api.tfl.gov.uk/StopPoint/synthetic-stop-1", observedAt: null, units: "access_point", geography: null, sourceClass: "official_public_data", kind: "direct_register", limitations: ["Synthetic fixture"] }],
    meta: { source: "tfl-stop-points", provider: "tfl", dataset: "StopPoint", operation: "nearby", contractVersion: 1, adapterVersion: "1", normalisationVersion: "1", sourceVersion: null, datasetReleaseId: null, checksum: null,
      correlationId: ids.correlation, retrievedAt: date, sourceRetrievedAt: date, observedAt: null, publishedAt: null,
      quality: { precision: "postcode_centroid", coverage: "london", truncated: false, missing: ["source_observation_date"], limitations: ["Not footfall"] },
      freshness: { assessedAt: date, state: "unknown", reason: "Source date unavailable", ruleVersion: "1" },
      licence: { policyId: "synthetic", version: 1, reviewedAt: date, termsUrl: "https://example.org/licence", raw: { ...permit, allowed: false, maxDays: 0 }, normalised: permit, derived: permit, references: permit, timestamps: permit, attribution: ["Synthetic fixture"], cacheSeconds: 0, rawDisposition: "discarded" },
      cache: { state: "bypass", key: null, expiresAt: null }, cost: { units: null, money: null, currency: null, category: "unknown", priceReference: null },
      execution: { durationMs: 1, attempts: 1, pages: 1, httpStatus: 200, providerRequestId: null } }, limitations: ["Synthetic fixture"], error: null };
}

import type { Geography, Point, Precision } from "../spatial/model.ts";
import type { EnrichmentInput } from "./enrichment-input.ts";

export const sourceIds = ["ons-population", "tfl-stop-points", "fsa-establishments", "planning-conservation", "planning-article4", "geoapify-walking", "ons-catchments", "overture-catchments", "tfl-stations", "geoapify-access", "tfl-station-activity", "propertydata-premises", "propertydata-flood", "propertydata-rent", "ons-income-context", "ons-jobs-context"] as const;
export type SourceId = (typeof sourceIds)[number];
export type Category = "coffee-shop" | "restaurant" | "hair-beauty-salon";
export type Outcome = "success" | "partial" | "empty" | "unavailable" | "unsupported" | "not_applicable" | "policy_blocked";
export const errorCodes = ["invalid_request", "unsupported_geography", "insufficient_precision", "not_applicable",
  "configuration_missing", "authentication_failed", "permission_denied", "rate_limited", "timeout", "cancelled",
  "network_error", "provider_unavailable", "invalid_response", "dataset_missing", "dataset_stale", "licence_blocked", "persistence_failed"] as const;
export type ErrorCode = (typeof errorCodes)[number];
export type SafeSourceError = { code: ErrorCode; retryable: boolean; status: number | null };
export type CollectionContext = {
  schemaVersion: 1 | 2; analysisId: string; inputId: string; inputVersion: number; analysisTimestamp: string;
  enrichment?: EnrichmentInput;
  selectedProperty: { id: string; formattedAddress: string; postcode: string | null; provider: string | null;
    providerAddressId: string | null; uprn: string | null; point: Point | null; resolution: "provider_verified" | "manual_unverified" };
  businessType: "coffee-shop" | "restaurant" | "hair-salon" | "beauty-salon"; category: Category;
  region: { id: "london"; boundaryReleaseId: string; eligible: boolean; method: "point_in_polygon" | "centroid_proxy" | "unknown" };
  geography: Geography | null; releases: { population: string | null; geography: string | null };
};
export type ObservationRef = { id: string; path: string; recordId: string; reference: string; observedAt: string | null;
  units: string; geography: string | null; sourceClass: "official_public_data" | "commercial_data" | "community_open_data"; kind: "direct_register" | "measured" | "modelled" | "inferred"; limitations: string[] };
export type RetentionPermission = { allowed: boolean; maxDays: number | null; condition: string };
export type LicenceMetadata = { policyId: string; version: number; reviewedAt: string; termsUrl: string;
  raw: RetentionPermission; normalised: RetentionPermission; derived: RetentionPermission; references: RetentionPermission;
  timestamps: RetentionPermission; attribution: string[]; cacheSeconds: number; rawDisposition: "discarded" | "not_returned" | "forbidden" };
export type RetrievalMetadata = {
  source: SourceId; provider: string; dataset: string; operation: string; contractVersion: 1; adapterVersion: string;
  normalisationVersion: string; sourceVersion: string | null; datasetReleaseId: string | null; checksum: string | null;
  correlationId: string; retrievedAt: string; sourceRetrievedAt: string; observedAt: string | null; publishedAt: string | null;
  quality: { precision: Precision; coverage: "london"; truncated: boolean; missing: string[]; limitations: string[] };
  freshness: { assessedAt: string; state: "fresh" | "stale" | "unknown"; reason: string; ruleVersion: string };
  licence: LicenceMetadata;
  cache: { state: "bypass" | "miss" | "hit" | "local_release"; key: string | null; expiresAt: string | null };
  cost: { units: number | null; money: string | null; currency: string | null; category: "observed" | "estimated" | "unknown"; priceReference: string | null };
  execution: { durationMs: number; attempts: number; pages: number; httpStatus: number | null; providerRequestId: string | null };
};
export type AreaPopulation = { schemaVersion: 1; kind: "area_population"; geographyCode: string; geographyReleaseId: string;
  measure: "TS001-total"; count: number | null; missingReason: string | null; units: "persons";
  universe: "usual_residents"; effectiveAt: string; releaseId: string };
export type TransportAccessPoints = { schemaVersion: 1; kind: "transport_access_points"; complete: boolean;
  items: { id: string; name: string; mode: "bus" | "rail" | "tube" | "tram" | "water" | "other"; originalMode: string; point: Point | null }[] };
export type FoodEstablishments = { schemaVersion: 1; kind: "food_establishments"; complete: boolean;
  items: { id: string; authorityId: string; name: string; businessType: string; point: Point | null; observedAt: string | null }[] };
export type PlanningConstraints = { schemaVersion: 1; kind: "planning_constraints";
  lookup: ReturnType<typeof import("./planning-constraints.ts").validateConstraintLookup> };
export type WalkingGeometry = { schemaVersion: 1; kind: "walking_geometry";
  walking: import("./adapters/geoapify.ts").WalkingCatchments; topology: import("./walking-result.ts").WalkingTopology };
export type Payload = import("./native-context-result.ts").NativeContextResult | AreaPopulation | TransportAccessPoints | FoodEstablishments | PlanningConstraints | WalkingGeometry |
  import("./property-fact-result.ts").PropertyFactResult |
  import("./station-walking-result.ts").StationWalkingResult | import("./station-activity-result.ts").StationActivityResult |
  import("./catchment-sources.ts").CatchmentSources | import("./catchment-sources.ts").CatchmentPlaces;
export type ProviderResult = { schemaVersion: 1; outcome: Outcome; payload: Payload | null; observations: ObservationRef[];
  meta: RetrievalMetadata; limitations: string[]; error: SafeSourceError | null };
export type SourceRequest = { context: CollectionContext; collectionKey: string; radiusMetres: number };
export type SourceDefinition = { id: SourceId; provider: string; dataset: string; operation: string; adapterVersion: string;
  normalisationVersion: string; maxPages: number; maxRecords: number; maxBytes: number; timeoutMs: number; maxAttempts: number };
export type Eligibility = { eligible: true } | { eligible: false; outcome: "unsupported" | "not_applicable"; code: ErrorCode };
export type ExecutionContext = { signal: AbortSignal; correlationId: string; now: () => Date };
export interface DataAdapter {
  source: SourceDefinition;
  supports(context: CollectionContext): Eligibility;
  retrieve(request: SourceRequest, execution: ExecutionContext): Promise<ProviderResult>;
}
export type StoredSnapshot = { id: string; analysisId: string; inputId: string; collectionKey: string; requestHash: string; result: ProviderResult };
export interface SnapshotRepository {
  context(analysisId: string, inputId: string, signal?: AbortSignal): Promise<CollectionContext>;
  find(context: CollectionContext, key: string, source: SourceId, hash: string, signal?: AbortSignal): Promise<StoredSnapshot | null>;
  append(context: CollectionContext, key: string, hash: string, result: ProviderResult, signal?: AbortSignal): Promise<StoredSnapshot>;
}

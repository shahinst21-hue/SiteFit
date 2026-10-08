import { SourceError } from "./errors.ts";
import { sourceIds, errorCodes } from "./contracts.ts";
import type { CollectionContext, ProviderResult } from "./contracts.ts";
import { validPoint } from "../spatial/model.ts";
import { validateEnrichmentInput } from "./enrichment-input.ts";
import { validateStoredConstraintLookup } from "./planning-constraints.ts";
import { validateWalkingCatchments, validateWalkingTopology } from "./walking-result.ts";

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SourceError("invalid_response");
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 500): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max && Array.from(value).every(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127);
}
export function uuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
export function timestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const year = Number(value.slice(0,4)), month = Number(value.slice(5,7)), day = Number(value.slice(8,10));
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31,30,31,30,31,31,30,31,30,31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}
export function reference(value: unknown): value is string {
  if (!text(value, 1000)) return false;
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash; } catch { return false; }
}
function strings(value: unknown, max = 100): value is string[] { return Array.isArray(value) && value.length <= max && value.every(v => text(v, 1000)); }
function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max; }
function demand(condition: unknown): asserts condition { if (!condition) throw new SourceError("invalid_response"); }
function nullableDate(value: unknown) { demand(value === null || timestamp(value)); }
function keys(value: Record<string, unknown>, allowed: string) { const fields = allowed.split(" "); demand(Object.keys(value).every(k => fields.includes(k))); }

export function validateContext(value: unknown): CollectionContext {
  const c = object(value), p = object(c.selectedProperty), r = object(c.region), releases = object(c.releases);
  keys(c, "schemaVersion analysisId inputId inputVersion analysisTimestamp selectedProperty businessType category region geography releases enrichment");
  keys(p, "id formattedAddress postcode provider providerAddressId uprn point resolution"); keys(r, "id boundaryReleaseId eligible method"); keys(releases, "population geography");
  demand([1, 2].includes(Number(c.schemaVersion)) && typeof c.schemaVersion === "number" && uuid(c.analysisId) && uuid(c.inputId) && integer(c.inputVersion) && Number(c.inputVersion) > 0 && timestamp(c.analysisTimestamp));
  demand(uuid(p.id) && text(p.formattedAddress) && (p.postcode === null || text(p.postcode, 20)) && (p.point === null || validPoint(p.point)));
  for (const key of ["provider", "providerAddressId", "uprn"]) demand(p[key] === null || text(p[key], 120));
  demand(["provider_verified", "manual_unverified"].includes(String(p.resolution)));
  demand(["coffee-shop", "restaurant", "hair-salon", "beauty-salon"].includes(String(c.businessType)));
  demand(c.category === (c.businessType === "hair-salon" || c.businessType === "beauty-salon" ? "hair-beauty-salon" : c.businessType));
  demand(r.id === "london" && uuid(r.boundaryReleaseId) && typeof r.eligible === "boolean" && ["point_in_polygon", "centroid_proxy", "unknown"].includes(String(r.method)));
  for (const v of Object.values(releases)) demand(v === null || uuid(v));
  demand("population" in releases && "geography" in releases);
  if (c.geography !== null) { const g = object(c.geography); demand(/^E00\d{6}$/.test(String(g.code)) && g.type === "OA2021" && uuid(g.releaseId) && typeof g.ambiguous === "boolean" && ["point_in_polygon", "centroid_proxy"].includes(String(g.method))); }
  if (c.schemaVersion === 2) {
    const enriched = validateEnrichmentInput(c.enrichment);
    demand(enriched.releases.geographyReleaseId === releases.geography && enriched.releases.geographyReleaseId === r.boundaryReleaseId);
  } else demand(!("enrichment" in c));
  return structuredClone(value) as CollectionContext;
}

export function validateResult(value: unknown): ProviderResult {
  const r = object(value), m = object(r.meta), q = object(m.quality), f = object(m.freshness), l = object(m.licence), cache = object(m.cache), cost = object(m.cost), execution = object(m.execution);
  keys(r, "schemaVersion outcome payload observations meta limitations error");
  keys(m, "source provider dataset operation contractVersion adapterVersion normalisationVersion sourceVersion datasetReleaseId checksum correlationId retrievedAt sourceRetrievedAt observedAt publishedAt quality freshness licence cache cost execution");
  keys(q, "precision coverage truncated missing limitations"); keys(f, "assessedAt state reason ruleVersion"); keys(cache, "state key expiresAt");
  keys(cost, "units money currency category priceReference"); keys(execution, "durationMs attempts pages httpStatus providerRequestId");
  keys(l, "policyId version reviewedAt termsUrl raw normalised derived references timestamps attribution cacheSeconds rawDisposition");
  demand(r.schemaVersion === 1 && ["success", "partial", "empty", "unavailable", "unsupported", "not_applicable", "policy_blocked"].includes(String(r.outcome)));
  demand(sourceIds.includes(m.source as typeof sourceIds[number]) && m.contractVersion === 1 && uuid(m.correlationId));
  for (const key of ["provider", "dataset", "operation", "adapterVersion", "normalisationVersion"]) demand(text(m[key], 120));
  demand(m.sourceVersion === null || text(m.sourceVersion, 120)); demand(m.datasetReleaseId === null || uuid(m.datasetReleaseId));
  demand(m.checksum === null || /^[0-9a-f]{64}$/.test(String(m.checksum)));
  demand(timestamp(m.retrievedAt) && timestamp(m.sourceRetrievedAt)); nullableDate(m.observedAt); nullableDate(m.publishedAt);
  demand(["unknown", "postcode_centroid", "building", "rooftop"].includes(String(q.precision)) && q.coverage === "london" && typeof q.truncated === "boolean" && strings(q.missing) && strings(q.limitations));
  demand(timestamp(f.assessedAt) && ["fresh", "stale", "unknown"].includes(String(f.state)) && text(f.reason) && text(f.ruleVersion));
  demand(text(l.policyId, 120) && integer(l.version) && Number(l.version) > 0 && timestamp(l.reviewedAt) && reference(l.termsUrl) && strings(l.attribution) && integer(l.cacheSeconds, 86400));
  for (const key of ["raw", "normalised", "derived", "references", "timestamps"]) { const p = object(l[key]); keys(p, "allowed maxDays condition"); demand(typeof p.allowed === "boolean" && (p.maxDays === null || integer(p.maxDays)) && text(p.condition)); }
  demand(["discarded", "not_returned", "forbidden"].includes(String(l.rawDisposition)));
  demand(["bypass", "miss", "hit", "local_release"].includes(String(cache.state)) && (cache.key === null || /^[0-9a-f]{64}$/.test(String(cache.key)))); nullableDate(cache.expiresAt);
  demand(cost.units === null || (typeof cost.units === "number" && Number.isFinite(cost.units) && cost.units >= 0));
  demand(cost.money === null || /^\d+(\.\d{1,6})?$/.test(String(cost.money))); demand(cost.currency === null || /^[A-Z]{3}$/.test(String(cost.currency)));
  demand((cost.money === null) === (cost.currency === null) && ["observed", "estimated", "unknown"].includes(String(cost.category)) && (cost.priceReference === null || reference(cost.priceReference)));
  demand(integer(execution.durationMs) && integer(execution.attempts, 20) && integer(execution.pages, 10) && (execution.httpStatus === null || integer(execution.httpStatus, 599)) && (execution.providerRequestId === null || /^[A-Za-z0-9-]{1,100}$/.test(String(execution.providerRequestId))));
  demand(strings(r.limitations) && Array.isArray(r.observations) && r.observations.length <= 500);
  for (const observation of r.observations) { const o = object(observation); keys(o, "id path recordId reference observedAt units geography sourceClass kind limitations"); for (const key of ["id", "path", "recordId", "units"]) demand(text(o[key], 200)); demand(reference(o.reference) && o.sourceClass === (m.source === "geoapify-walking" ? "commercial_data" : "official_public_data") && ["direct_register", "measured", "modelled", "inferred"].includes(String(o.kind)) && strings(o.limitations) && (o.geography === null || text(o.geography, 100))); nullableDate(o.observedAt); }
  if (["success", "partial"].includes(String(r.outcome))) {
    const p = object(r.payload); demand(p.schemaVersion === 1 && r.observations.length > 0);
    if (m.source === "ons-population") {
      keys(p, "schemaVersion kind geographyCode geographyReleaseId measure count missingReason units universe effectiveAt releaseId");
      demand(p.kind === "area_population" && /^E00\d{6}$/.test(String(p.geographyCode)) && uuid(p.geographyReleaseId) && uuid(p.releaseId) && p.measure === "TS001-total" && p.units === "persons" && p.universe === "usual_residents" && timestamp(p.effectiveAt));
      demand((p.count === null && text(p.missingReason)) || (integer(p.count) && p.missingReason === null));
      demand(r.observations.length === 1 && object(r.observations[0]).path === "count" && object(r.observations[0]).recordId === p.geographyCode && object(r.observations[0]).units === "persons");
    } else if (m.source === "geoapify-walking") {
      keys(p, "schemaVersion kind walking topology"); demand(p.kind === "walking_geometry" && q.precision === "building");
      validateWalkingCatchments(p.walking);
      const topology = object(p.topology); demand(uuid(topology.geographyReleaseId));
      const checkedTopology = validateWalkingTopology(topology, topology.geographyReleaseId);
      demand(m.provider === "geoapify" && m.dataset === "walking-isolines" && m.datasetReleaseId === null &&
        r.observations.length === 1 && object(r.observations[0]).path === "walking" &&
        object(r.observations[0]).sourceClass === "commercial_data" && object(r.observations[0]).kind === "modelled" &&
        object(r.observations[0]).units === "seconds_metres_geometry" && r.outcome === (checkedTopology.parts[2].londonCoverageFraction === 1 ? "success" : "partial"));
    } else if (m.source === "planning-conservation" || m.source === "planning-article4") {
      keys(p, "schemaVersion kind lookup");
      demand(p.kind === "planning_constraints" && uuid(m.datasetReleaseId) && r.outcome === "partial" && q.precision === "building");
      const dataset = m.source === "planning-conservation" ? "conservation-area" : "article-4-direction-area";
      validateStoredConstraintLookup(p.lookup, m.datasetReleaseId, dataset);
      demand(m.provider === "planning-data" && m.dataset === dataset && r.observations.length === 1 &&
        object(r.observations[0]).path === "lookup" && object(r.observations[0]).recordId === m.datasetReleaseId &&
        object(r.observations[0]).units === "published_designation_profiles");
    } else {
      keys(p, "schemaVersion kind complete items");
      demand(p.kind === (m.source === "tfl-stop-points" ? "transport_access_points" : "food_establishments") && typeof p.complete === "boolean" && Array.isArray(p.items) && p.items.length > 0 && p.items.length <= 500);
      demand(r.outcome !== "success" || p.complete === true); demand(!q.truncated || r.outcome === "partial");
      const ids = new Set<string>();
      for (const item of p.items) { const i = object(item); demand(text(i.id, 120) && !ids.has(i.id) && text(i.name, 300) && (i.point === null || validPoint(i.point))); ids.add(i.id);
        keys(i, m.source === "tfl-stop-points" ? "id name mode originalMode point" : "id authorityId name businessType point observedAt");
        if (m.source === "tfl-stop-points") demand(["bus", "rail", "tube", "tram", "water", "other"].includes(String(i.mode)) && text(i.originalMode, 100));
        else { demand(text(i.authorityId, 120) && text(i.businessType, 120)); nullableDate(i.observedAt); }
      }
      demand(r.observations.length === p.items.length);
      for (let index = 0; index < p.items.length; index++) demand(object(r.observations[index]).path === `items/${index}` && object(r.observations[index]).recordId === object(p.items[index]).id);
    }
  } else demand(r.payload === null && r.observations.length === 0);
  if (r.error !== null) { const e = object(r.error); keys(e,"code retryable status"); demand(errorCodes.includes(e.code as typeof errorCodes[number]) && typeof e.retryable === "boolean" && (e.status === null || integer(e.status, 599))); }
  demand(r.outcome !== "success" && r.outcome !== "empty" || r.error === null);
  // Limit persisted envelopes and disallow secret-bearing/raw diagnostic fields anywhere.
  const encoded = JSON.stringify(value); demand(encoded.length <= 2_000_000 && !/(?:sb_secret_|sk_live_|app_key=|"(?:authorization|headers|rawResponse|stack)"\s*:)/i.test(encoded));
  return structuredClone(value) as ProviderResult;
}



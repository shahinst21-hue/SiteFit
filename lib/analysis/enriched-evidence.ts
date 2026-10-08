import "server-only";
import { randomUUID } from "node:crypto";
import type { CollectionContext, StoredSnapshot } from "../data/contracts.ts";
import { validateContext, validateResult, uuid } from "../data/validation.ts";
import { enrichmentReleaseKeys } from "../data/enrichment-input.ts";
import { queryPoint } from "../data/query-point.ts";
import { packetDigest } from "./canonical.ts";
import { enrichmentMetrics } from "./enrichment-metrics.ts";
import { evidenceIndex, validateEvidence, type EnrichedEvidence } from "./evidence.ts";
import type { Dimension } from "./scoring.ts";
import { reviewedStationTargets } from "../data/station-targets.ts";
import { validateWalkingMatrix } from "../data/walking-matrix-result.ts";

const sectionsFor = (source: string): Dimension[] => source === "geoapify-walking" ? ["customer-base", "market-position", "customer-access"] :
  ["ons-population", "ons-catchments"].includes(source) ? ["customer-base"] :
  ["overture-catchments", "fsa-establishments"].includes(source) ? ["market-position"] :
  ["tfl-stop-points", "tfl-stations", "geoapify-access", "tfl-station-activity"].includes(source) ? ["customer-access"] : ["premises"];
/** Private, source-bound observations only. All full operands remain in immutable
 * snapshots; this does not calibrate scores or expand the model's authority. */
export function enrichedEvidence(input: CollectionContext, snapshots: readonly StoredSnapshot[], now: Date) {
  const context = validateContext(input);
  if (context.schemaVersion !== 2 || !context.enrichment || snapshots.length > 14) throw new Error("enriched_evidence_context_required");
  const byId = new Map<string, StoredSnapshot>(), bySource = new Map<string, StoredSnapshot>();
  for (const snapshot of snapshots) {
    if (!uuid(snapshot.id) || snapshot.analysisId !== context.analysisId || snapshot.inputId !== context.inputId ||
      byId.has(snapshot.id) || bySource.has(snapshot.result.meta.source)) throw new Error("enriched_evidence_snapshot_binding");
    const result = validateResult(snapshot.result);
    if (result.payload && result.meta.checksum !== packetDigest({payload: result.payload, observations: result.observations})) throw new Error("enriched_evidence_checksum");
    byId.set(snapshot.id, snapshot); bySource.set(result.meta.source, snapshot);
  }
  const evidence: EnrichedEvidence[] = [], roots = new Map<string, EnrichedEvidence>();
  for (const snapshot of snapshots) {
    const r = snapshot.result, p = r.payload;
    const parents: EnrichedEvidence["lineage"]["parentSnapshots"] = [];
    if (p && "parent" in p) {
      const parent = byId.get(p.parent.snapshotId);
      if (!parent || parent.collectionKey !== snapshot.collectionKey || parent.result.meta.checksum !== p.parent.checksum)
        throw new Error("enriched_evidence_parent_binding");
      if ((p.kind === "catchment_statistics" || p.kind === "catchment_places") && parent.result.payload?.kind !== "walking_geometry")
        throw new Error("enriched_evidence_parent_kind");
      if (p.kind === "station_walking" || p.kind === "station_activity") {
        const selected = reviewedStationTargets(context, parent, snapshot.collectionKey);
        if (p.kind === "station_walking") validateWalkingMatrix(p.matrix, context.enrichment.identity.point!, selected.targets);
        else if (p.releaseId !== context.enrichment.releases.numbatReleaseId) throw new Error("enriched_evidence_station_release");
      }
      parents.push({id: parent.id, checksum: p.parent.checksum});
    }
    if (p?.kind === "walking_geometry" && (p.topology.geographyReleaseId !== context.enrichment.releases.geographyReleaseId ||
      packetDigest(p.walking.origin) !== packetDigest(context.enrichment.identity.point))) throw new Error("enriched_evidence_walking_origin");
    if (p?.kind === "property_fact" && (p.binding.uprn !== context.enrichment.identity.uprn || p.binding.osReleaseId !== context.enrichment.releases.osReleaseId ||
      packetDigest(p.binding.point) !== packetDigest(context.enrichment.identity.point))) throw new Error("enriched_evidence_property_binding");
    if (p?.kind === "planning_constraints" && p.lookup.releaseId !== context.enrichment.releases[r.meta.source === "planning-conservation" ? "conservationReleaseId" : "article4ReleaseId"])
      throw new Error("enriched_evidence_planning_release");
    // Benchmark operands are retained privately for later Economics, never a location factor.
    if (r.meta.source === "propertydata-rent") continue;
    const available = p !== null && ["success", "partial"].includes(r.outcome);
    const missingState = available ? r.outcome === "partial" ? "partial" : null :
      r.outcome === "unsupported" || r.outcome === "not_applicable" ? r.outcome : "unavailable";
    const statistical: EnrichedEvidence["geography"]["statistical"] = p?.kind === "area_population" ?
      {unit: "OA2021", code: p.geographyCode, releaseId: p.geographyReleaseId, method: context.geography?.method ?? "unknown", estimated: false} :
      p?.kind === "catchment_statistics" || p?.kind === "catchment_places" || p?.kind === "walking_geometry" ?
      {unit: "network_catchment", code: null, releaseId: context.enrichment.releases.geographyReleaseId,
        method: p.kind === "catchment_places" ? "native-point-closed-polygon" : p.kind === "catchment_statistics" ? "area-uniform-bng1" : "provider_walk_network", estimated: p.kind !== "catchment_places"} :
      {unit: p?.kind === "property_fact" || p?.kind === "planning_constraints" ? "property" : available ? "provider_point" : null,
        code: null, releaseId: p?.kind === "property_fact" ? p.binding.osReleaseId : null,
        method: p?.kind === "property_fact" ? "os_address_building_point_not_premises_extent" : "provider_register_point", estimated: r.observations.some(o => o.kind === "modelled")};
    const value = !available ? null : p?.kind === "area_population" ? p.count :
      p?.kind === "transport_access_points" || p?.kind === "food_establishments" ? p.items.length :
      p?.kind === "planning_constraints" ? p.lookup.features.length :
      p?.kind === "property_fact" && p.operation === "flood-risk" ? p.facts.riversAndSea :
      `Retained ${r.meta.dataset} observations`;
    const item: EnrichedEvidence = {schemaVersion: 2, id: randomUUID(), analysisId: context.analysisId, inputId: context.inputId,
      snapshotId: snapshot.id, sections: sectionsFor(r.meta.source),
      source: {provider: r.meta.provider, dataset: r.meta.dataset, releaseId: r.meta.datasetReleaseId,
        reference: r.observations[0]?.reference ?? r.meta.licence.termsUrl, adapterVersion: r.meta.adapterVersion},
      sourceClass: ["geoapify", "propertydata"].includes(r.meta.provider) ? "commercial" : r.meta.provider === "overture" ? "community_open" : "official_public",
      kind: available ? r.observations.some(o => o.kind === "modelled") ? "modelled" : "direct_register" : "capability",
      scope: `Retained ${r.meta.dataset} source outcome; origin precision is not statistical accuracy or premises extent`, value,
      units: p?.kind === "area_population" ? "usual residents" : p?.kind === "transport_access_points" || p?.kind === "food_establishments" || p?.kind === "planning_constraints" ? "returned records, not complete entities or clearance" : null,
      retrievedAt: r.meta.sourceRetrievedAt, effectiveAt: p?.kind === "area_population" ? p.effectiveAt : r.meta.observedAt,
      geography: {precision: queryPoint(context)?.precision ?? "unknown", crs: "EPSG:4326", scope: "frozen analysis origin",
        method: context.enrichment.identity.coordinateBasis ?? "unresolved_input", positionMeaning: "input_origin_only", statistical},
      quality: {available: available && value !== null, partial: r.outcome === "partial" || r.meta.quality.truncated,
        freshness: r.meta.freshness.state, limitations: [...new Set([...r.limitations, ...r.meta.quality.limitations])].slice(0, 32)},
      parents: [], observationIds: r.observations.slice(0, 256).map(o => o.id),
      licence: {policyId: r.meta.licence.policyId, version: r.meta.licence.version,
        representationAllowed: r.meta.licence.normalised.allowed && r.meta.licence.references.allowed && r.meta.licence.timestamps.allowed,
        expiresAt: r.meta.licence.normalised.maxDays === null ? null : new Date(Date.parse(r.meta.sourceRetrievedAt) + r.meta.licence.normalised.maxDays * 86400000).toISOString(), notices: [...r.meta.licence.attribution]},
      lineage: {sourceChecksum: r.meta.checksum, operandPaths: available ? r.observations.map(o => o.path).slice(0, 32) : [], parentSnapshots: parents,
        releaseBindings: enrichmentReleaseKeys.map(key => ({key, id: context.enrichment!.releases[key]})),
        methodVersion: r.meta.normalisationVersion, missingState: !available || value === null ? missingState ?? "missing" : missingState}};
    validateEvidence(item); roots.set(snapshot.id, item); evidence.push(item);
  }
  const add = (root: EnrichedEvidence, changes: Partial<EnrichedEvidence>, path: string, available: boolean, extraParents: string[] = []) => {
    const item: EnrichedEvidence = {...structuredClone(root), ...changes, id: randomUUID(), kind: "derived", parents: [root.id, ...extraParents],
      quality: {...root.quality, ...changes.quality, available},
      lineage: {...root.lineage, operandPaths: [path], methodVersion: "phase8-evidence-operands-1", missingState: available ? (changes.quality?.partial ?? root.quality.partial) ? "partial" : null : "unavailable"}};
    validateEvidence(item); evidence.push(item);
  };
  const metrics = enrichmentMetrics(context, snapshots);
  for (const metric of metrics) {
    const root = roots.get(metric.sourceSnapshotId)!;
    const geometryRoot = roots.get(metric.parent.snapshotId);
    if (!geometryRoot) throw new Error("enriched_evidence_geometry_parent_missing");
    if (metric.id === "census.walking-native-operands") {
      metric.ranges.forEach((range, i) => range.tables.forEach((table, j) => {
        const value = table.series?.[0]?.value ?? null;
        add(root, {sections: ["customer-base"], source: {...root.source, dataset: `${table.dataset} total, ${range.seconds / 60} minute walking estimate`, releaseId: table.releaseId},
          value, units: table.dataset === "TS007A" || table.dataset === "TS066" ? "persons, area-allocated estimate" : "households, area-allocated estimate",
          effectiveAt: "2021-03-21", scope: `${range.seconds / 60} minute cumulative walking scope; not current customers or a measured catchment`,
          geography: {...root.geography, statistical: {...root.geography.statistical, estimated: true}},
          quality: {...root.quality, partial: true, limitations: [...new Set([...root.quality.limitations, "Uniform population within each native area is an estimation assumption; cumulative contours must not be summed."])].slice(0, 32)}},
          `ranges/${i}/statistics/${j}/operands/censusEstimates/0`, value !== null, [geometryRoot.id]);
      }));
    } else {
      metric.ranges.forEach((range, i) => add(root, {sections: ["market-position"],
        source: {...root.source, dataset: `Native primary-family records, ${range.seconds / 60} minute walk`}, value: range.operands?.roles.primary ?? null,
        units: "native mapped records, not unique businesses", scope: `${range.seconds / 60} minute cumulative routing polygon; incomplete community inventory`,
        quality: {...root.quality, partial: true, limitations: [...new Set([...root.quality.limitations,
          "Native taxonomy records are not a complete deduplicated competitor inventory or evidence of saturation."])].slice(0, 32)}},
        `ranges/${i}/inventory/items`, range.operands !== null, [geometryRoot.id]));
    }
  }
  for (const snapshot of snapshots) {
    const p = snapshot.result.payload, root = roots.get(snapshot.id);
    if (!root || p?.kind !== "station_walking") continue;
    p.matrix.targets.forEach((target, i) => {
      for (const field of ["seconds", "metres"] as const) add(root, {value: target[field], units: field,
        source: {...root.source, dataset: `Modelled station route ${target.id}, ${field}`}, scope: "Input building point to reviewed station register point; neither endpoint is a confirmed entrance",
        geography: {...root.geography, statistical: {unit: "provider_point", code: null, releaseId: null, method: "provider_walk_network", estimated: true}}},
        `matrix/targets/${i}/${field}`, target.outcome === "success");
    });
  }
  return {evidence, index: evidenceIndex(evidence, context.analysisId, context.inputId, now), metrics,
    deferredEconomics: snapshots.filter(s => s.result.meta.source === "propertydata-rent").map(s => ({snapshotId: s.id, checksum: s.result.meta.checksum, admitted: false}))};
}

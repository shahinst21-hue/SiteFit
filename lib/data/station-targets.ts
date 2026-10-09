import type { CollectionContext, StoredSnapshot } from "./contracts.ts";
import { validateContext, validateResult, uuid } from "./validation.ts";
import { SourceError } from "./errors.ts";
import { mappedNativeStation, stationMappingVersion } from "./station-mapping.ts";

/** Explicit crosswalk targets only; no name/nearest/platform heuristics.
 * This bounded reviewed subset never claims all nearby stations or entrances. */
export function reviewedStationTargets(context: CollectionContext, stored: StoredSnapshot, collectionKey: string) {
  validateContext(context);
  const result = validateResult(stored.result), payload = result.payload;
  if (context.schemaVersion !== 2 || context.enrichment?.identity.state !== "matched" || !uuid(stored.id) ||
    stored.analysisId !== context.analysisId || stored.inputId !== context.inputId || stored.collectionKey !== collectionKey ||
    result.meta.source !== "tfl-stations" || !result.meta.checksum || payload?.kind !== "transport_access_points" ||
    !["success", "partial"].includes(result.outcome)) throw new SourceError("invalid_request");
  const reviewed = payload.items.filter(stop => stop.point && mappedNativeStation(stop, context.enrichment!.releases.numbatReleaseId))
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return {parent: {snapshotId: stored.id, checksum: result.meta.checksum}, mappingVersion: stationMappingVersion,
    selectionVersion: "reviewed-station-id-order-1" as const, returnedRegisterCount: payload.items.length,
    registerComplete: payload.complete, reviewedCount: reviewed.length,
    omittedIds: payload.items.filter(s => !reviewed.some(r => r.id === s.id)).map(s => s.id).sort(),
    targets: reviewed.slice(0, 8).map(stop => ({id: stop.id, point: structuredClone(stop.point!)})),
    truncatedReviewedIds: reviewed.slice(8).map(stop => stop.id), entranceConfirmed: false as const};
}

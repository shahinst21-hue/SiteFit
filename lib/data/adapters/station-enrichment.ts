import "server-only";
import type { DataAdapter, StoredSnapshot } from "../contracts.ts";
import { coverage } from "../coverage.ts";
import { definitions } from "../registry.ts";
import { initialResult } from "../result.ts";
import { SourceError, safeError } from "../errors.ts";
import { validateContext, validateResult } from "../validation.ts";
import { reviewedStationTargets } from "../station-targets.ts";
import { geoapifyWalkingMatrix } from "./geoapify.ts";
import { validateWalkingMatrix } from "../walking-matrix-result.ts";
import { queryPoint } from "../query-point.ts";
import { stationActivityRepository } from "../station-activity-repository.ts";
import type { StationActivityResult } from "../station-activity-result.ts";

type MatrixRead = ReturnType<typeof geoapifyWalkingMatrix>;
type NativeRead = ReturnType<typeof stationActivityRepository>;
/** Two isolated, bounded sources. A failed native station cannot erase another
 * station's successful profile, and routing never substitutes an entrance. */
export function stationEnrichmentAdapter(id: "geoapify-access" | "tfl-station-activity", parent: StoredSnapshot,
  options: {matrix?: MatrixRead; native?: (release: string) => NativeRead} = {}): DataAdapter {
  const source = definitions[id];
  return {source, supports: context => coverage(id, context), async retrieve(request, execution) {
    validateContext(request.context);
    const result = initialResult(source, request, execution), eligible = coverage(id, request.context);
    if (!eligible.eligible) {
      result.outcome = eligible.outcome; result.error = {code: eligible.code, retryable: false, status: null};
      return validateResult(result);
    }
    const start = performance.now();
    try {
      const targets = reviewedStationTargets(request.context, parent, request.collectionKey);
      if (!targets.targets.length) throw new SourceError("dataset_missing");
      const subset = !targets.registerComplete || targets.omittedIds.length > 0 || targets.truncatedReviewedIds.length > 0;
      result.meta.quality.truncated = subset;
      result.meta.quality.missing = ["confirmed_station_entrance", "complete_nearby_station_coverage"];
      result.limitations = ["Only explicitly reviewed station identities are included; this is not a complete nearby-station inventory.",
        "The property point and station register points do not establish confirmed entrances."];
      if (id === "geoapify-access") {
        result.meta.execution.attempts = 1;
        const origin = queryPoint(request.context)!;
        const read = options.matrix ?? geoapifyWalkingMatrix({key: process.env.GEOAPIFY_API_KEY, now: execution.now});
        const matrix = validateWalkingMatrix(await read(origin, targets.targets, execution.signal), origin, targets.targets);
        result.payload = {schemaVersion: 1, kind: "station_walking", parent: targets.parent,
          mappingVersion: targets.mappingVersion, selectionVersion: targets.selectionVersion,
          registerComplete: targets.registerComplete, omittedIds: targets.omittedIds,
          truncatedReviewedIds: targets.truncatedReviewedIds, entranceConfirmed: false, matrix};
        result.outcome = subset || matrix.targets.some(t => t.outcome !== "success") ? "partial" : "success";
        result.meta.sourceRetrievedAt = matrix.retrievedAt;
        result.meta.quality.missing.push("routing_dataset_version", "observed_provider_credits");
        result.meta.cost = {units: matrix.credits.expected, money: "0", currency: "GBP", category: "estimated",
          priceReference: "https://apidocs.geoapify.com/docs/route-matrix/"};
        result.limitations.push("Modelled walking time and distance use provider snapping; they are not observed journeys or accessibility guarantees.");
      } else {
        const release = request.context.enrichment!.releases.numbatReleaseId;
        const native = (options.native ?? stationActivityRepository)(release);
        const stations: StationActivityResult["stations"] = [], failures: StationActivityResult["failures"] = [];
        const register = parent.result.payload;
        if (register?.kind !== "transport_access_points") throw new SourceError("invalid_request");
        // Bounded concurrent reads, each cancelled by the collection deadline.
        const outcomes = await Promise.all(targets.targets.map(async target => {
          const stop = register.items.find(s => s.id === target.id)!;
          try {return {id: target.id, value: await native.activity(stop, "TWT", execution.signal), error: null};}
          catch (error) {return {id: target.id, value: null, error: safeError(error)};}
        }));
        for (const outcome of outcomes) {
          if (outcome.value?.activity) stations.push({id: outcome.id, activity: outcome.value.activity});
          else failures.push({id: outcome.id, reason: outcome.error ? "native_read_failed" : "native_profiles_missing", error: outcome.error});
        }
        if (!stations.length) throw new SourceError("dataset_missing");
        result.payload = {schemaVersion: 1, kind: "station_activity", parent: targets.parent, releaseId: release,
          mappingVersion: targets.mappingVersion, dayType: "TWT", stations, failures,
          registerComplete: targets.registerComplete, omittedIds: targets.omittedIds,
          truncatedReviewedIds: targets.truncatedReviewedIds, entranceConfirmed: false};
        result.outcome = subset || failures.length ? "partial" : "success";
        result.meta.datasetReleaseId = release; result.meta.sourceVersion = "2025";
        result.meta.quality.missing.push("current_station_activity", "pedestrian_footfall", "customer_count");
        result.meta.freshness.reason = "Native 2025 typical-day model; retrieval does not establish present-day activity.";
        result.meta.cost = {units: 0, money: "0", currency: "GBP", category: "observed", priceReference: null};
        result.limitations.push("NUMBAT TWT profiles model typical-day gateline passenger movements, not pedestrian footfall, unique customers or current trading demand.");
      }
      result.observations = [{id: targets.parent.snapshotId, path: id === "geoapify-access" ? "matrix" : "stations",
        recordId: targets.parent.snapshotId, reference: id === "geoapify-access" ? "https://apidocs.geoapify.com/docs/route-matrix/" : "https://tfl.gov.uk/corporate/publications-and-reports/underground-services-performance",
        observedAt: null, units: id === "geoapify-access" ? "metres_seconds" : "typical_day_gateline_passenger_movements",
        geography: null, sourceClass: id === "geoapify-access" ? "commercial_data" : "official_public_data", kind: "modelled", limitations: [...result.limitations]}];
    } catch (error) {
      result.outcome = "unavailable"; result.payload = null; result.observations = []; result.error = safeError(error);
    }
    result.meta.execution.durationMs = Math.round(performance.now() - start);
    result.meta.retrievedAt = execution.now().toISOString();
    result.meta.quality.limitations = [...result.limitations];
    return validateResult(result);
  }};
}

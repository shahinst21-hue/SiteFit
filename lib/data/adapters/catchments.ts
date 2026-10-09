import "server-only";
import columns from "../census-columns.json" with { type: "json" };
import type { DataAdapter, StoredSnapshot } from "../contracts.ts";
import { coverage } from "../coverage.ts";
import { definitions } from "../registry.ts";
import { initialResult } from "../result.ts";
import { validateContext, validateResult, uuid } from "../validation.ts";
import { enrichmentRepository } from "../enrichment-repository.ts";
import { SourceError, safeError } from "../errors.ts";
import { catchmentDatasets, catchmentReleaseKeys, type CatchmentSources, type CatchmentPlaces } from "../catchment-sources.ts";
import { validateWalkingCatchments } from "../walking-result.ts";

/** A dependent read receives a persisted immutable parent, never a fresh route.
 * Each failed read is retained alongside the successful independent operands. */
export function catchmentAdapter(id: "ons-catchments" | "overture-catchments", storedParent: StoredSnapshot,
  repository: typeof enrichmentRepository = enrichmentRepository): DataAdapter {
  const source = definitions[id], parent = structuredClone(storedParent);
  return { source, supports: context => coverage(id, context), async retrieve(request, execution) {
    const context = validateContext(request.context), result = initialResult(source, request, execution);
    const eligible = coverage(id, context);
    if (!eligible.eligible) { result.outcome = eligible.outcome; result.error = { code: eligible.code, status: null, retryable: false }; return validateResult(result); }
    const validated = validateResult(parent.result), payload = validated.payload, releases = context.enrichment!.releases;
    if (!uuid(parent.id) || parent.analysisId !== context.analysisId || parent.inputId !== context.inputId ||
      parent.collectionKey !== request.collectionKey || validated.meta.source !== "geoapify-walking" ||
      payload?.kind !== "walking_geometry" || payload.topology.geographyReleaseId !== releases.geographyReleaseId ||
      !validated.meta.checksum || !["success", "partial"].includes(validated.outcome)) throw new SourceError("invalid_request");
    validateWalkingCatchments(payload.walking, context.enrichment!.identity.point!);
    const started = performance.now(), lineage = { snapshotId: parent.id, checksum: validated.meta.checksum };
    let successes = 0;
    if (id === "ons-catchments") {
      const ranges: CatchmentSources["ranges"] = [];
      for (const polygon of payload.walking.polygons) {
        const statistics: CatchmentSources["ranges"][number]["statistics"] = [];
        for (let index = 0; index < catchmentDatasets.length; index++) {
          const dataset = catchmentDatasets[index], releaseId = releases[catchmentReleaseKeys[index]];
          try {
            const measured = await repository({ ...releases, censusReleaseId: releaseId }).catchment(polygon.geometry, columns[dataset].columns.length, execution.signal);
            statistics.push({ dataset, releaseId, referencePeriod: "2021-03-21", outcome: "success", operands: measured.operands, error: null }); successes++;
          } catch (error) { statistics.push({ dataset, releaseId, referencePeriod: "2021-03-21", outcome: "unavailable", operands: null, error: safeError(error) }); }
        }
        ranges.push({ seconds: polygon.seconds, statistics });
      }
      if (successes) result.payload = { schemaVersion: 1, kind: "catchment_statistics", parent: lineage, releases, ranges };
    } else {
      const ranges: CatchmentPlaces["ranges"] = [];
      for (const polygon of payload.walking.polygons) {
        try { const inventory = await repository(releases).places(polygon.geometry, execution.signal);
          ranges.push({ seconds: polygon.seconds, outcome: "success", inventory, error: null }); successes++;
        } catch (error) { ranges.push({ seconds: polygon.seconds, outcome: "unavailable", inventory: null, error: safeError(error) }); }
      }
      if (successes) result.payload = { schemaVersion: 1, kind: "catchment_places", parent: lineage, releaseId: releases.placesReleaseId,
        geographyReleaseId: releases.geographyReleaseId, retrievedAt: execution.now().toISOString(), ranges };
      result.meta.datasetReleaseId = releases.placesReleaseId; result.meta.sourceVersion = releases.placesReleaseId;
    }
    result.outcome = successes === (id === "ons-catchments" ? 12 : 3) ? "success" : successes ? "partial" : "unavailable";
    if (!successes) result.error = { code: "provider_unavailable", retryable: false, status: null };
    result.meta.quality.precision = "building"; result.meta.cache.state = "local_release";
    result.meta.quality.missing = id === "ons-catchments" ? ["within_area_distribution", "current_population", "pedestrian_footfall"] : ["unique_business_count", "entity_review", "validated_comparator_cohort"];
    result.limitations = id === "ons-catchments" ? ["Area allocation assumes uniform distribution; retained native operands are not observed walking-catchment population.",
      "Income is native non-additive MSOA context; employee jobs are not footfall. Independent failed reads remain unavailable."] :
      ["Native place records are not a deduplicated business census or a calibrated competition score.", "Classification, duplicates and missing source dates require review; failed ranges remain unavailable."];
    result.meta.quality.limitations = [...result.limitations];
    result.meta.execution.durationMs = Math.round(performance.now() - started);
    result.meta.cost = { units: 0, money: "0", currency: "GBP", category: "observed", priceReference: result.meta.licence.termsUrl };
    if (successes) result.observations = [{ id: `${id}-ranges`, path: "ranges", recordId: parent.id, reference: result.meta.licence.termsUrl,
      observedAt: null, units: id === "ons-catchments" ? "native_statistical_operands" : "native_place_records", geography: context.geography?.code ?? null,
      sourceClass: id === "ons-catchments" ? "official_public_data" : "community_open_data", kind: id === "ons-catchments" ? "modelled" : "direct_register", limitations: [...result.limitations] }];
    return validateResult(result);
  } };
}

import "server-only";
import type { DataAdapter } from "../contracts.ts";
import { coverage } from "../coverage.ts";
import { definitions } from "../registry.ts";
import { initialResult } from "../result.ts";
import { validateContext, validateResult } from "../validation.ts";
import { validateWalkingCatchments, validateWalkingTopology } from "../walking-result.ts";
import { geoapifyWalking, type WalkingCatchments } from "./geoapify.ts";
import { frameworkClient } from "../server-client.ts";
import { SourceError } from "../errors.ts";
import type { Point } from "../../spatial/model.ts";
import type { Json } from "../../supabase/database.types.ts";
type WalkingOptions = {
  retrieve?: (origin: Point, signal?: AbortSignal) => Promise<WalkingCatchments>;
  topology?: (release: string, walking: WalkingCatchments, signal: AbortSignal) => Promise<unknown>;
};
export function walkingAdapter(options: WalkingOptions = {}): DataAdapter {
  const source = definitions["geoapify-walking"];
  const retrieve = options.retrieve ?? geoapifyWalking({ key: process.env.GEOAPIFY_API_KEY });
  const topology = options.topology ?? (async (release, walking, signal) => {
    const { data, error } = await frameworkClient().rpc("validate_sitefit_walking_geometry", {
      p_geography_release_id: release, p_walking: walking as unknown as Json,
    }).abortSignal(signal);
    if (error || !data) throw new SourceError("invalid_response");
    return data;
  });
  return { source, supports: context => coverage(source.id, context), async retrieve(request, execution) {
    const context = validateContext(request.context), result = initialResult(source, request, execution);
    const eligible = coverage(source.id, context);
    if (!eligible.eligible) { result.outcome = eligible.outcome; result.error = { code: eligible.code, status: null, retryable: false }; return validateResult(result); }
    const point = context.enrichment?.identity.point, release = context.enrichment?.releases.geographyReleaseId;
    if (!point || !release) throw new SourceError("insufficient_precision");
    const started = performance.now(), walking = validateWalkingCatchments(await retrieve(point, execution.signal), point);
    const validation = validateWalkingTopology(await topology(release, walking, execution.signal), release);
    result.outcome = validation.parts[2].londonCoverageFraction === 1 ? "success" : "partial";
    result.payload = { schemaVersion: 1, kind: "walking_geometry", walking, topology: validation };
    result.meta.quality.precision = "building"; result.meta.quality.missing = ["routing_version", "provider_observed_credits", "snapped_isoline_origin", "premises_entrance"];
    result.meta.sourceRetrievedAt = walking.retrievedAt; result.meta.retrievedAt = execution.now().toISOString();
    result.meta.cost = { units: 6, money: "0", currency: "GBP", category: "estimated", priceReference: result.meta.licence.termsUrl };
    result.meta.execution = { durationMs: Math.round(performance.now() - started), attempts: 1, pages: 1, httpStatus: null, providerRequestId: null };
    result.limitations = ["Modelled walking accessibility from an OS building/address point, not a verified entrance or measured pedestrian footfall.",
      "Provider routing version and snapped isoline origin are unavailable; echoed origin is the request coordinate.",
      "PostGIS checks topology, origin and nesting; this does not independently prove every mapped bridge, barrier or path.",
      "Outside-London coverage is retained in geometry and coverage operands; it is not missing-as-zero.",
      "Coverage uses the frozen source geography footprint; uncovered water or other footprint gaps do not by themselves establish that a location is outside London.",
      "Six expected API credits are an estimate; provider-observed account billing is unavailable."];
    result.meta.quality.limitations = [...result.limitations];
    result.observations = [{ id: "walking-300-600-900", path: "walking", recordId: "walking-300-600-900", reference: result.meta.licence.termsUrl,
      observedAt: null, units: "seconds_metres_geometry", geography: context.geography?.code ?? null, sourceClass: "commercial_data", kind: "modelled", limitations: [...result.limitations] }];
    return validateResult(result);
  } };
}

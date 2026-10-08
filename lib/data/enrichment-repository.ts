import "server-only";
import { frameworkClient } from "./server-client.ts";
import { SourceError } from "./errors.ts";
import { uuid } from "./validation.ts";
import { validatePolygonGeometry, type PolygonGeometry } from "../spatial/polygon.ts";
import { validPoint, type Point } from "../spatial/model.ts";
import { catchmentAllocationOperands, type CatchmentReleaseBindings } from "../analysis/catchment-operands.ts";
import { validatePlaceInventory } from "./place-inventory.ts";
import { validateConstraintLookup, type ConstraintDataset } from "./planning-constraints.ts";
import type { Database, Json } from "../supabase/database.types.ts";

type ReadName = "measure_sitefit_catchment" | "lookup_sitefit_places" | "lookup_sitefit_constraints";
type ReadArgs = Database["public"]["Functions"][ReadName]["Args"];
type Reader = (name: ReadName, args: ReadArgs, signal: AbortSignal) => Promise<unknown>;
export type EnrichmentReleaseBindings = CatchmentReleaseBindings & {
  placesReleaseId: string; conservationReleaseId: string; article4ReleaseId: string;
};

/** Narrow read boundary over admitted private source releases. This neither
 * creates a collector nor persists/refreshes an owned historical outcome.
 * New frozen inputs must supply their own immutable release vector. */
export function enrichmentRepository(bindings: EnrichmentReleaseBindings, options: { read?: Reader } = {}) {
  const releases = structuredClone(bindings);
  for (const key of ["geographyReleaseId", "nativeReleaseId", "censusReleaseId", "incomeReleaseId", "bresReleaseId",
    "placesReleaseId", "conservationReleaseId", "article4ReleaseId"] as const) {
    if (!uuid(releases[key])) throw new SourceError("invalid_request");
  }
  const client = options.read ? null : frameworkClient();
  const read: Reader = options.read ?? (async (name, args, signal) => {
    const { data, error } = await client!.rpc(name, args).abortSignal(signal);
    if (error) throw new SourceError("provider_unavailable");
    return data;
  });
  async function lookup(name: ReadName, args: ReadArgs, caller?: AbortSignal) {
    const timeout = AbortSignal.timeout(8000), signal = caller ? AbortSignal.any([caller, timeout]) : timeout;
    if (signal.aborted) throw new SourceError("cancelled");
    try {
      const result = await read(name, args, signal);
      signal.throwIfAborted();
      if (result === null) throw new SourceError("dataset_missing");
      if (JSON.stringify(result).length > 2_000_000) throw new SourceError("invalid_response");
      return result;
    } catch (error) {
      if (error instanceof SourceError) throw error;
      throw new SourceError(caller?.aborted ? "cancelled" : timeout.aborted ? "timeout" : "provider_unavailable");
    }
  }
  function geometry(value: PolygonGeometry): Json { return validatePolygonGeometry(value) as unknown as Json; }
  return {
    async catchment(shape: PolygonGeometry, columns: number, signal?: AbortSignal) {
      if (!Number.isSafeInteger(columns) || columns <= 0 || columns > 200) throw new SourceError("invalid_request");
      const value = await lookup("measure_sitefit_catchment", {
        p_geography_release_id: releases.geographyReleaseId, p_native_release_id: releases.nativeReleaseId,
        p_census_release_id: releases.censusReleaseId, p_income_release_id: releases.incomeReleaseId,
        p_bres_release_id: releases.bresReleaseId, p_geometry: geometry(shape),
      }, signal);
      const allocation = catchmentAllocationOperands(value, releases, columns);
      return { operands: structuredClone(value), allocation };
    },
    async places(shape: PolygonGeometry, signal?: AbortSignal) {
      const value = await lookup("lookup_sitefit_places", { p_release_id: releases.placesReleaseId,
        p_geography_release_id: releases.geographyReleaseId, p_geometry: geometry(shape) }, signal);
      return validatePlaceInventory(value, releases.placesReleaseId, releases.geographyReleaseId);
    },
    async constraints(dataset: ConstraintDataset, point: Point, signal?: AbortSignal) {
      if (!validPoint(point) || point.precision !== "building" || point.source !== "os-open-uprn" ||
        !["conservation-area", "article-4-direction-area"].includes(dataset)) throw new SourceError("insufficient_precision");
      const release = dataset === "conservation-area" ? releases.conservationReleaseId : releases.article4ReleaseId;
      const value = await lookup("lookup_sitefit_constraints", { p_release_id: release,
        p_geography_release_id: releases.geographyReleaseId, p_longitude: point.longitude, p_latitude: point.latitude }, signal);
      return validateConstraintLookup(value, release, dataset, new Date().toISOString());
    },
  };
}

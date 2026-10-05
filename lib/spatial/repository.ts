import "server-only";
import { frameworkClient } from "../data/server-client.ts";
import { SourceError } from "../data/errors.ts";
import { object, timestamp, uuid } from "../data/validation.ts";
import { validPoint } from "./model.ts";
import type { Point } from "./model.ts";
import { geographyContext } from "./geography.ts";
export function spatialRepository() {
  const client = frameworkClient();
  return {
    async geography(releaseId: string, point: Point) {
      if (!uuid(releaseId) || !validPoint(point) || point.precision === "unknown") throw new SourceError("insufficient_precision");
      const { data, error } = await client.rpc("lookup_sitefit_geography", { p_release_id: releaseId, p_longitude: point.longitude, p_latitude: point.latitude, p_precision: point.precision });
      if (error || !data) throw new SourceError("dataset_missing");
      return geographyContext(data, point, releaseId);
    },
    async population(releaseId: string, geographyReleaseId: string, code: string, signal?: AbortSignal) {
      if (!uuid(releaseId) || !uuid(geographyReleaseId) || !/^E00\d{6}$/.test(code)) throw new SourceError("invalid_request");
      let query = client.rpc("lookup_sitefit_population", { p_release_id: releaseId, p_geography_release_id: geographyReleaseId, p_code: code });
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw new SourceError(signal?.aborted ? signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled" : "dataset_missing");
      if (data === null) return null;
      const r = object(data);
      if (!(r.count === null || (typeof r.count === "number" && Number.isSafeInteger(r.count) && r.count >= 0)) || !timestamp(r.effectiveAt) || !timestamp(r.sourceRetrievedAt) || typeof r.version !== "string" || !/^[0-9a-f]{64}$/.test(String(r.checksum))) throw new SourceError("invalid_response");
      return r;
    },
  };
}

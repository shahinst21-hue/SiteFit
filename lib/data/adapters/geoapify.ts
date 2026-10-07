import "server-only";
import { SourceError } from "../errors.ts";
import { object } from "../validation.ts";
import { validPoint } from "../../spatial/model.ts";
import { validatePolygonGeometry } from "../../spatial/polygon.ts";
import type { Point } from "../../spatial/model.ts";
import type { PolygonGeometry } from "../../spatial/polygon.ts";

export type WalkingCatchments = {
  schemaVersion: 1; provider: "geoapify"; mode: "walk"; type: "time";
  origin: Point; retrievedAt: string; routingVersion: null; snappedOrigin: null;
  polygons: { seconds: 300 | 600 | 900; geometry: PolygonGeometry }[];
  credits: { expected: 6; observed: null };
};

/** Server-only query authentication: never log the URL/error or expose provider bytes.
 * Runtime admission still requires PostGIS topology, origin, nesting and coverage checks.
 */
export function geoapifyWalking(options: { key: string | undefined; fetcher?: typeof fetch; now?: () => Date }) {
  return async (origin: Point, signal?: AbortSignal): Promise<WalkingCatchments> => {
    if (!validPoint(origin) || origin.precision === "unknown" || origin.precision === "postcode_centroid") throw new SourceError("invalid_request");
    if (!options.key || options.key.length > 256 || /\s/.test(options.key)) throw new SourceError("configuration_missing");
    const timeout = AbortSignal.timeout(8_000), combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    if (combined.aborted) throw new SourceError("cancelled");
    try {
      const url = new URL("https://api.geoapify.com/v1/isoline");
      for (const [k, v] of Object.entries({ lat: String(origin.latitude), lon: String(origin.longitude), mode: "walk", type: "time", range: "300,600,900", apiKey: options.key })) url.searchParams.set(k, v);
      const response = await (options.fetcher ?? fetch)(url, { signal: combined, redirect: "error", cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new SourceError(response.status === 401 ? "authentication_failed" : response.status === 403 ? "permission_denied" : response.status === 429 ? "rate_limited" : "provider_unavailable", response.status);
      if (!response.body || !/^application\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "") || Number(response.headers.get("content-length")) > 1_000_000) throw new SourceError("invalid_response");
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
      try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
        if (size > 1_000_000) throw new SourceError("invalid_response"); chunks.push(part.value); } }
      finally { await reader.cancel(); }
      let decoded: unknown;
      try { decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
      catch { throw new SourceError("invalid_response"); }
      const root = object(decoded);
      if (root.type !== "FeatureCollection" || !Array.isArray(root.features) || root.features.length !== 3) throw new SourceError("invalid_response");
      const seen = new Set<number>();
      const polygons = root.features.map(value => {
        const feature = object(value), properties = object(feature.properties);
        if (feature.type !== "Feature" || properties.mode !== "walk" || properties.type !== "time" ||
            properties.lat !== origin.latitude || properties.lon !== origin.longitude ||
            ![300, 600, 900].includes(Number(properties.range)) || typeof properties.range !== "number" || seen.has(properties.range)) throw new SourceError("invalid_response");
        seen.add(properties.range);
        return { seconds: properties.range as 300 | 600 | 900, geometry: validatePolygonGeometry(feature.geometry) };
      }).sort((a, b) => a.seconds - b.seconds);
      // Provider echoes requested origin; it does not establish a snapped entrance or routing vintage.
      return { schemaVersion: 1, provider: "geoapify", mode: "walk", type: "time", origin: structuredClone(origin),
        retrievedAt: (options.now ?? (() => new Date()))().toISOString(), routingVersion: null, snappedOrigin: null,
        polygons, credits: { expected: 6, observed: null } };
    } catch (error) {
      if (error instanceof SourceError) throw error;
      throw new SourceError(signal?.aborted ? "cancelled" : timeout.aborted ? "timeout" : "network_error");
    }
  };
}

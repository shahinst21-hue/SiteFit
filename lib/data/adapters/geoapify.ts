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

async function boundedJson(url: URL, options: { fetcher?: typeof fetch }, signal: AbortSignal, body?: unknown): Promise<unknown> {
  const response = await (options.fetcher ?? fetch)(url, { signal, redirect: "error", cache: "no-store",
    method: body === undefined ? "GET" : "POST", headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) throw new SourceError(response.status === 401 ? "authentication_failed" : response.status === 403 ? "permission_denied" : response.status === 429 ? "rate_limited" : "provider_unavailable", response.status);
  if (!response.body || !/^application\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "") || Number(response.headers.get("content-length")) > 1_000_000) throw new SourceError("invalid_response");
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
    if (size > 1_000_000) throw new SourceError("invalid_response"); chunks.push(part.value); } }
  finally { await reader.cancel(); }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
  catch { throw new SourceError("invalid_response"); }
}

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
      const root = object(await boundedJson(url, options, combined));
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

export type WalkingMatrix = {
  schemaVersion: 1; provider: "geoapify"; mode: "walk"; units: "metres_seconds";
  origin: Point; snappedOrigin: [number, number]; retrievedAt: string; routingVersion: null;
  targets: { id: string; point: Point; snappedPoint: [number, number]; outcome: "success" | "unavailable";
    metres: number | null; seconds: number | null; missingReason: "no_route" | null }[];
  credits: { expected: number; observed: null };
};
export function geoapifyWalkingMatrix(options: { key: string | undefined; fetcher?: typeof fetch; now?: () => Date }) {
  return async (origin: Point, targets: { id: string; point: Point }[], signal?: AbortSignal): Promise<WalkingMatrix> => {
    if (!validPoint(origin) || origin.precision === "unknown" || origin.precision === "postcode_centroid" || !Array.isArray(targets) ||
        targets.length < 1 || targets.length > 8 || new Set(targets.map(t => t.id)).size !== targets.length ||
        targets.some(t => typeof t.id !== "string" || !/^[A-Za-z0-9:_-]{1,120}$/.test(t.id) || !validPoint(t.point))) throw new SourceError("invalid_request");
    if (!options.key || options.key.length > 256 || /\s/.test(options.key)) throw new SourceError("configuration_missing");
    const timeout = AbortSignal.timeout(8_000), combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    if (combined.aborted) throw new SourceError("cancelled");
    try {
      const url = new URL("https://api.geoapify.com/v1/routematrix"); url.searchParams.set("apiKey", options.key);
      const location = (p: Point): [number, number] => [p.longitude, p.latitude];
      const root = object(await boundedJson(url, options, combined, { mode: "walk", units: "metric",
        sources: [{ location: location(origin) }], targets: targets.map(t => ({ location: location(t.point) })) }));
      if (root.mode !== "walk" || root.units !== "metric" || root.distance_units !== "meters" ||
          !Array.isArray(root.sources) || root.sources.length !== 1 || !Array.isArray(root.targets) || root.targets.length !== targets.length ||
          !Array.isArray(root.sources_to_targets) || root.sources_to_targets.length !== 1 || !Array.isArray(root.sources_to_targets[0]) || root.sources_to_targets[0].length !== targets.length) throw new SourceError("invalid_response");
      const snapped = (value: unknown, original: Point): [number, number] => {
        const row = object(value), point = row.location;
        if (JSON.stringify(row.original_location) !== JSON.stringify(location(original)) || !Array.isArray(point) || point.length !== 2 ||
            !validPoint({ longitude: point[0], latitude: point[1], crs: "EPSG:4326", precision: "unknown", source: "geoapify-snap" })) throw new SourceError("invalid_response");
        return [...point] as [number, number];
      };
      const cells = root.sources_to_targets[0], returnedTargets = root.targets;
      const resultTargets = targets.map((t, i): WalkingMatrix["targets"][number] => {
        const snappedPoint = snapped(returnedTargets[i], t.point), cell = cells[i];
        if (cell === null) return { id: t.id, point: structuredClone(t.point), snappedPoint, outcome: "unavailable", metres: null, seconds: null, missingReason: "no_route" };
        const r = object(cell);
        if (r.source_index !== 0 || r.target_index !== i || typeof r.time !== "number" || typeof r.distance !== "number" ||
            !Number.isFinite(r.time) || !Number.isFinite(r.distance) || r.time < 0 || r.distance < 0 || r.time > 86400 || r.distance > 100000) throw new SourceError("invalid_response");
        return { id: t.id, point: structuredClone(t.point), snappedPoint, outcome: "success", metres: r.distance, seconds: r.time, missingReason: null };
      });
      return { schemaVersion: 1, provider: "geoapify", mode: "walk", units: "metres_seconds", origin: structuredClone(origin),
        snappedOrigin: snapped(root.sources[0], origin), retrievedAt: (options.now ?? (() => new Date()))().toISOString(), routingVersion: null,
        targets: resultTargets, credits: { expected: targets.length, observed: null } };
    } catch (error) {
      if (error instanceof SourceError) throw error;
      throw new SourceError(signal?.aborted ? "cancelled" : timeout.aborted ? "timeout" : "network_error");
    }
  };
}

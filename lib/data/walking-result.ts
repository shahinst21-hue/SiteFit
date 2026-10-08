import { object, timestamp } from "./validation.ts";
import { validPoint, type Point } from "../spatial/model.ts";
import { validatePolygonGeometry } from "../spatial/polygon.ts";
import { SourceError } from "./errors.ts";
import type { WalkingCatchments } from "./adapters/geoapify.ts";
function demand(v: unknown): asserts v { if (!v) throw new SourceError("invalid_response"); }
const fields = (r: Record<string, unknown>, names: string) => {
  const expected = names.split(" "); demand(Object.keys(r).length === expected.length && expected.every(k => k in r));
};
export function validateWalkingCatchments(value: unknown, expectedOrigin?: Point): WalkingCatchments {
  const r = object(value); fields(r, "schemaVersion provider mode type origin retrievedAt routingVersion snappedOrigin polygons credits");
  demand(r.schemaVersion === 1 && r.provider === "geoapify" && r.mode === "walk" && r.type === "time" &&
    timestamp(r.retrievedAt) && r.routingVersion === null && r.snappedOrigin === null && validPoint(r.origin));
  const origin = r.origin;
  demand(origin.source === "os-open-uprn" && origin.precision === "building");
  if (expectedOrigin) demand(validPoint(expectedOrigin) && origin.longitude === expectedOrigin.longitude && origin.latitude === expectedOrigin.latitude &&
    origin.precision === expectedOrigin.precision && origin.source === expectedOrigin.source && origin.crs === expectedOrigin.crs);
  const credits = object(r.credits); fields(credits, "expected observed"); demand(credits.expected === 6 && credits.observed === null);
  demand(Array.isArray(r.polygons) && r.polygons.length === 3);
  r.polygons.forEach((value, index) => { const p = object(value); fields(p, "seconds geometry");
    demand(p.seconds === [300,600,900][index]); validatePolygonGeometry(p.geometry); });
  return structuredClone(value) as WalkingCatchments;
}
export type WalkingTopology = {
  schemaVersion: 1; geographyReleaseId: string; method: "postgis-bng-topology-1";
  parts: { seconds: 300 | 600 | 900; areaM2: number; londonAreaM2: number; londonCoverageFraction: number;
    originCovered: true; outsideNextFraction: number | null; vertices: number; polygons: number }[];
};
export function validateWalkingTopology(value: unknown, geographyReleaseId: string): WalkingTopology {
  const r = object(value); fields(r, "schemaVersion geographyReleaseId method parts");
  demand(r.schemaVersion === 1 && r.geographyReleaseId === geographyReleaseId && r.method === "postgis-bng-topology-1" &&
    Array.isArray(r.parts) && r.parts.length === 3);
  r.parts.forEach((value, index) => {
    const p = object(value); fields(p, "seconds areaM2 londonAreaM2 londonCoverageFraction originCovered outsideNextFraction vertices polygons");
    demand(p.seconds === [300,600,900][index] && p.originCovered === true && typeof p.areaM2 === "number" && Number.isFinite(p.areaM2) && p.areaM2 > 0 && p.areaM2 <= 100_000_000 &&
      typeof p.londonAreaM2 === "number" && Number.isFinite(p.londonAreaM2) && p.londonAreaM2 >= 0 && p.londonAreaM2 <= p.areaM2 * (1 + 1e-8) &&
      typeof p.londonCoverageFraction === "number" && p.londonCoverageFraction >= 0 && p.londonCoverageFraction <= 1 &&
      Math.abs(p.londonCoverageFraction - p.londonAreaM2 / p.areaM2) <= 1e-8 &&
      Number.isSafeInteger(p.vertices) && Number(p.vertices) >= 4 && Number(p.vertices) <= 20000 &&
      Number.isSafeInteger(p.polygons) && Number(p.polygons) >= 1 && Number(p.polygons) <= 100 &&
      (index === 2 ? p.outsideNextFraction === null : typeof p.outsideNextFraction === "number" && p.outsideNextFraction >= 0 && p.outsideNextFraction <= 1e-8));
  });
  return structuredClone(value) as WalkingTopology;
}

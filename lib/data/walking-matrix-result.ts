import { object, timestamp } from "./validation.ts";
import { validPoint, type Point } from "../spatial/model.ts";
import { SourceError } from "./errors.ts";
import type { WalkingMatrix } from "./adapters/geoapify.ts";

function demand(v: unknown): asserts v { if (!v) throw new SourceError("invalid_response"); }
function fields(v: Record<string, unknown>, names: string) {
  const keys = names.split(" "); demand(Object.keys(v).length === keys.length && keys.every(k => k in v));
}
function snap(value: unknown) {
  demand(Array.isArray(value) && value.length === 2 && validPoint({longitude: value[0], latitude: value[1], crs: "EPSG:4326", precision: "unknown", source: "geoapify-snap"}));
}
function samePoint(a: Point, b: Point) {
  return a.longitude === b.longitude && a.latitude === b.latitude && a.crs === b.crs && a.precision === b.precision && a.source === b.source;
}
/** Closed retained matrix representation; null routes remain unknown rather
 * than zero, and source coordinates cannot be swapped between target IDs. */
export function validateWalkingMatrix(value: unknown, origin: Point, targets: {id: string; point: Point}[]): WalkingMatrix {
  const r = object(value); fields(r, "schemaVersion provider mode units origin snappedOrigin retrievedAt routingVersion targets credits");
  demand(r.schemaVersion === 1 && r.provider === "geoapify" && r.mode === "walk" && r.units === "metres_seconds" &&
    validPoint(r.origin) && samePoint(r.origin, origin) && origin.precision === "building" && origin.source === "os-open-uprn" &&
    timestamp(r.retrievedAt) && r.routingVersion === null && targets.length > 0 && targets.length <= 8 &&
    new Set(targets.map(t => t.id)).size === targets.length && Array.isArray(r.targets) && r.targets.length === targets.length);
  snap(r.snappedOrigin);
  const credits = object(r.credits); fields(credits, "expected observed"); demand(credits.expected === targets.length && credits.observed === null);
  r.targets.forEach((value, index) => {
    const t = object(value), expected = targets[index];
    fields(t, "id point snappedPoint outcome metres seconds missingReason");
    demand(t.id === expected.id && validPoint(t.point) && samePoint(t.point, expected.point)); snap(t.snappedPoint);
    if (t.outcome === "success") demand(t.missingReason === null && typeof t.metres === "number" && Number.isFinite(t.metres) &&
      t.metres >= 0 && t.metres <= 100000 && typeof t.seconds === "number" && Number.isFinite(t.seconds) && t.seconds >= 0 && t.seconds <= 86400);
    else demand(t.outcome === "unavailable" && t.metres === null && t.seconds === null && t.missingReason === "no_route");
  });
  return structuredClone(value) as WalkingMatrix;
}

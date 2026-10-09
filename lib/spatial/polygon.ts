import { SourceError } from "../data/errors.ts";

export type Position = [number, number];
export type PolygonCoordinates = Position[][];
export type PolygonGeometry =
  | { type: "Polygon"; coordinates: PolygonCoordinates }
  | { type: "MultiPolygon"; coordinates: PolygonCoordinates[] };

function invalid(): never { throw new SourceError("invalid_response"); }

/** Preserve rings and disconnected parts. Topology and projected area are checked in PostGIS. */
export function validatePolygonGeometry(value: unknown): PolygonGeometry {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const g = value as Record<string, unknown>;
  if (Object.keys(g).length !== 2 || !["type", "coordinates"].every(k => k in g)) invalid();
  if (g.type !== "Polygon" && g.type !== "MultiPolygon") invalid();
  const polygons = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  if (!Array.isArray(polygons) || !polygons.length || polygons.length > 100) invalid();
  let vertices = 0;
  let rings = 0;
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) invalid();
    for (const ring of polygon) {
      if (++rings > 256 || !Array.isArray(ring) || ring.length < 4) invalid();
      for (const position of ring) {
        if (++vertices > 20_000 || !Array.isArray(position) || position.length !== 2 ||
            !position.every(v => typeof v === "number" && Number.isFinite(v)) ||
            position[0] < -180 || position[0] > 180 || position[1] < -90 || position[1] > 90) invalid();
      }
      const first = ring[0], last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) invalid();
      if (new Set(ring.slice(0, -1).map(p => `${p[0]},${p[1]}`)).size < 3) invalid();
    }
  }
  return structuredClone(value) as PolygonGeometry;
}

import type { CollectionContext, StoredSnapshot } from "../data/contracts.ts";
import { validatePolygonGeometry, type PolygonGeometry } from "../spatial/polygon.ts";
import { validPoint, type Point } from "../spatial/model.ts";
import { object, text, reference } from "../data/validation.ts";

export type EnrichedSpatialProjection = {schemaVersion: 1; origin: Point | null;
  catchments: {seconds: 300 | 600 | 900; geometry: PolygonGeometry}[];
  stations: {id: string; name: string; mode: string; point: Point; seconds: number | null; metres: number | null; outcome: "success" | "no_route"}[];
  notices: string[]; references: string[]; limitations: string[]};
export function validateEnrichedSpatialProjection(value: unknown): EnrichedSpatialProjection {
  const p = object(value);
  const fail = () => {throw new Error("invalid_enriched_spatial_projection");};
  if (Object.keys(p).sort().join() !== "catchments,limitations,notices,origin,references,schemaVersion,stations" || p.schemaVersion !== 1 ||
    p.origin !== null && !validPoint(p.origin) || !Array.isArray(p.catchments) || ![0,3].includes(p.catchments.length) ||
    !Array.isArray(p.stations) || p.stations.length > 8 || new Set(p.stations.map(s => object(s).id)).size !== p.stations.length) fail();
  (p.catchments as unknown[]).forEach((c, i) => {const r = object(c);
    if (Object.keys(r).sort().join() !== "geometry,seconds" || r.seconds !== [300,600,900][i] || p.origin === null) fail();
    validatePolygonGeometry(r.geometry);
  });
  for (const s of p.stations as unknown[]) {
    const r = object(s), positive = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0;
    if (Object.keys(r).sort().join() !== "id,metres,mode,name,outcome,point,seconds" || !text(r.id,120) || !text(r.name,300) || !text(r.mode,50) || !validPoint(r.point) ||
      !(r.outcome === "success" && positive(r.seconds) && positive(r.metres) || r.outcome === "no_route" && r.seconds === null && r.metres === null)) fail();
  }
  for (const key of ["notices","limitations","references"]) if (!Array.isArray(p[key]) || (p[key] as unknown[]).length > 32 ||
    !(p[key] as unknown[]).every(v => key === "references" ? reference(v) : text(v,1000))) fail();
  if (JSON.stringify(p).length > 700_000) fail();
  return structuredClone(p) as EnrichedSpatialProjection;
}
/** Input snapshots must first pass enrichedEvidence's owned checksum/parent guards. */
export function enrichedSpatialProjection(context: CollectionContext, snapshots: readonly StoredSnapshot[]): EnrichedSpatialProjection {
  const walking = snapshots.find(s => s.result.payload?.kind === "walking_geometry"), matrix = snapshots.find(s => s.result.payload?.kind === "station_walking");
  const w = walking?.result.payload, m = matrix?.result.payload;
  const parent = m?.kind === "station_walking" ? snapshots.find(s => s.id === m.parent.snapshotId)?.result.payload : null;
  return validateEnrichedSpatialProjection({schemaVersion: 1, origin: context.enrichment?.identity.point ?? null,
    catchments: w?.kind === "walking_geometry" ? w.walking.polygons : [],
    stations: m?.kind === "station_walking" && parent?.kind === "transport_access_points" ? m.matrix.targets.map(t => {
      const station = parent.items.find(s => s.id === t.id);
      if (!station?.point) throw new Error("spatial_station_identity_missing");
      return {id: t.id, name: station.name, mode: station.mode, point: station.point, seconds: t.seconds, metres: t.metres, outcome: t.outcome};
    }) : [],
    notices: [...new Set([walking,matrix].flatMap(s => s?.result.meta.licence.attribution ?? []))],
    references: [...new Set([walking,matrix].flatMap(s => s?.result.observations.map(o => o.reference) ?? []))],
    limitations: ["Stored provider-modelled walking geometry; routing vintage is unknown.", "Building and station register points are not confirmed entrances; routes do not establish step-free access.", "No street basemap or measured pedestrian footfall is supplied."]});
}

import "server-only";
import { object, timestamp, uuid } from "./validation.ts";
import { SourceError } from "./errors.ts";
import type { PolygonGeometry } from "../spatial/polygon.ts";

export const constraintDatasets = ["conservation-area", "article-4-direction-area"] as const;
export type ConstraintDataset = typeof constraintDatasets[number];
export type ConstraintFeature = {
  entity: string; reference: string | null; organisation: string; quality: "authoritative" | "some";
  name: string | null; sourceEntryDate: string; startDate: string; endDate: string;
  description: string | null; notes: string | null; geometry: PolygonGeometry;
};
export type ConstraintProfile = Omit<ConstraintFeature, "geometry">;
const nativeText = (v: unknown, limit: number) => v === null || typeof v === "string" && v.length <= limit && Array.from(v).every(c => {
  const code = c.charCodeAt(0); return code >= 32 && code !== 127 || [9, 10, 13].includes(code);
});
const nativeDate = (v: unknown) => typeof v === "string" && (v === "" || Number(v.slice(0, 4)) > 0 && (/^\d{4}$/.test(v) || /^\d{4}-(0[1-9]|1[0-2])$/.test(v) || /^\d{4}-\d{2}-\d{2}$/.test(v) && timestamp(`${v}T00:00:00Z`)));
const demand = (v: unknown) => { if (!v) throw new SourceError("invalid_response"); };

/** Point lookup returns the permitted native profile, not a designation polygon.
 * Validate it directly rather than fabricating geometry to satisfy an importer. */
export function validateConstraintProfile(value: unknown): ConstraintProfile {
  const r = object(value);
  const fields = "entity reference organisation quality name sourceEntryDate startDate endDate description notes".split(" ");
  demand(Object.keys(r).length === fields.length && fields.every(k => k in r));
  demand(typeof r.entity === "string" && /^[1-9]\d{0,13}$/.test(r.entity) && typeof r.organisation === "string" && /^[1-9]\d{0,9}$/.test(r.organisation));
  demand(["authoritative", "some"].includes(String(r.quality)) && nativeText(r.reference, 1000) && nativeText(r.name, 2000) &&
    nativeText(r.description, 10000) && nativeText(r.notes, 10000));
  demand(nativeDate(r.sourceEntryDate) && nativeDate(r.startDate) && nativeDate(r.endDate));
  return structuredClone(value) as ConstraintProfile;
}

/** Native publisher features have larger bounded multipart geometry than user
 * walking polygons (actual Article 4 has 609 parts). Preserve source topology;
 * PostGIS must separately validate topology, 2D SRID and London intersection.
 * This does not relax the existing user/catchment polygon validator. */
export function validateConstraintFeature(value: unknown): ConstraintFeature {
  const r = object(value);
  const fields = "entity reference organisation quality name sourceEntryDate startDate endDate description notes geometry".split(" ");
  demand(Object.keys(r).length === fields.length && fields.every(k => k in r));
  const profile = Object.fromEntries(fields.filter(k => k !== "geometry").map(k => [k, r[k]]));
  validateConstraintProfile(profile);
  const g = object(r.geometry);
  demand(Object.keys(g).length === 2 && "coordinates" in g && ["Polygon", "MultiPolygon"].includes(String(g.type)));
  const polygons = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  demand(Array.isArray(polygons) && polygons.length > 0 && polygons.length <= 1000);
  let vertices = 0, rings = 0;
  for (const polygon of polygons as unknown[]) {
    demand(Array.isArray(polygon) && polygon.length > 0);
    for (const ring of polygon as unknown[]) {
      demand(++rings <= 2000 && Array.isArray(ring) && ring.length >= 4);
      for (const position of ring as unknown[]) {
        demand(++vertices <= 20000 && Array.isArray(position) && position.length === 2 && position.every(v => typeof v === "number" && Number.isFinite(v)));
        const [x, y] = position as number[];
        demand(x >= -180 && x <= 180 && y >= -90 && y <= 90);
      }
      const points = ring as [number, number][];
      demand(points[0][0] === points.at(-1)![0] && points[0][1] === points.at(-1)![1] && new Set(points.slice(0, -1).map(p => `${p[0]},${p[1]}`)).size >= 3);
    }
  }
  return structuredClone(value) as ConstraintFeature;
}

export function constraintOutcome(dataset: ConstraintDataset, features: ConstraintFeature[], observedOn: string) {
  if (!constraintDatasets.includes(dataset) || !timestamp(observedOn) || features.length > 500 || new Set(features.map(f => f.entity)).size !== features.length) throw new SourceError("invalid_response");
  const known = features.map(validateConstraintFeature);
  return { dataset, observedOn, state: known.length ? "potential_constraint_found" as const : "no_record_found_coverage_unconfirmed" as const,
    features: known.map(f => ({ ...f, sourceReference: `https://www.planning.data.gov.uk/entity/${f.entity}`,
      applicability: f.endDate ? "end_date_requires_review" as const : "legal_scope_requires_review" as const })),
    absenceIsClearance: false as const, permittedUseConfirmed: false as const };
}

export function validateConstraintLookup(value: unknown, releaseId: string, dataset: ConstraintDataset, observedOn: string) {
  const r = object(value);
  const fields = "releaseId dataset features coverage absenceIsClearance spatialBasis".split(" ");
  demand(uuid(releaseId) && constraintDatasets.includes(dataset) && timestamp(observedOn) &&
    Object.keys(r).length === fields.length && fields.every(k => k in r) && r.releaseId === releaseId && r.dataset === dataset &&
    r.coverage === "published_features_coverage_unconfirmed" && r.absenceIsClearance === false &&
    r.spatialBasis === "address_building_point_not_premises_extent" && Array.isArray(r.features) && r.features.length <= 500);
  const profiles = (r.features as unknown[]).map(validateConstraintProfile);
  demand(new Set(profiles.map(f => f.entity)).size === profiles.length);
  return { releaseId, dataset, observedOn, coverage: "published_features_coverage_unconfirmed" as const,
    spatialBasis: "address_building_point_not_premises_extent" as const,
    state: profiles.length ? "potential_constraint_found" as const : "no_record_found_coverage_unconfirmed" as const,
    features: profiles.map(f => ({ ...f, sourceReference: `https://www.planning.data.gov.uk/entity/${f.entity}`,
      applicability: f.endDate ? "end_date_requires_review" as const : "legal_scope_requires_review" as const })),
    absenceIsClearance: false as const, permittedUseConfirmed: false as const };
}

/** Revalidate stored derived states against the frozen native profiles. */
export function validateStoredConstraintLookup(value: unknown, releaseId: string, dataset: ConstraintDataset) {
  const r = object(value);
  const fields = "releaseId dataset observedOn coverage spatialBasis state features absenceIsClearance permittedUseConfirmed".split(" ");
  demand(Object.keys(r).length === fields.length && fields.every(k => k in r) && timestamp(r.observedOn) && Array.isArray(r.features));
  const profiles = (r.features as unknown[]).map(value => {
    const f = object(value);
    demand(Object.keys(f).length === 12 && "sourceReference" in f && "applicability" in f);
    const { sourceReference, applicability, ...profile } = f;
    validateConstraintProfile(profile);
    demand(sourceReference === `https://www.planning.data.gov.uk/entity/${profile.entity}` &&
      applicability === (profile.endDate ? "end_date_requires_review" : "legal_scope_requires_review"));
    return profile;
  });
  const validated = validateConstraintLookup({ releaseId: r.releaseId, dataset: r.dataset, features: profiles,
    coverage: r.coverage, absenceIsClearance: r.absenceIsClearance, spatialBasis: r.spatialBasis }, releaseId, dataset, r.observedOn as string);
  demand(r.state === validated.state && r.permittedUseConfirmed === false);
  return validated;
}

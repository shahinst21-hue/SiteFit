export type Precision = "unknown" | "postcode_centroid" | "building" | "rooftop";
export type Point = { longitude: number; latitude: number; crs: "EPSG:4326"; precision: Precision; source: string };
export type Geography = { code: string; type: "OA2021"; releaseId: string; method: "point_in_polygon" | "centroid_proxy"; ambiguous: boolean };

export function validPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return Object.keys(p).every(k => ["longitude", "latitude", "crs", "precision", "source"].includes(k)) && typeof p.longitude === "number" && Number.isFinite(p.longitude) && p.longitude >= -180 && p.longitude <= 180 &&
    typeof p.latitude === "number" && Number.isFinite(p.latitude) && p.latitude >= -90 && p.latitude <= 90 &&
    p.crs === "EPSG:4326" && ["unknown", "postcode_centroid", "building", "rooftop"].includes(String(p.precision)) &&
    typeof p.source === "string" && p.source.length > 0 && p.source.length <= 100;
}

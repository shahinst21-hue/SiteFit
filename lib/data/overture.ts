import { SourceError } from "./errors.ts";
import { object, text, timestamp, uuid } from "./validation.ts";

export const overtureLicences: Readonly<Record<string, string>> = {
  Microsoft: "CDLA-Permissive-2.0", meta: "CDLA-Permissive-2.0", Overture: "CDLA-Permissive-2.0",
  "Overture-signals": "CDLA-Permissive-2.0", PinMeTo: "CDLA-Permissive-2.0", DAC: "CDLA-Permissive-2.0",
  RenderSEO: "CDLA-Permissive-2.0", Foursquare: "Apache-2.0", AllThePlaces: "CC0-1.0",
};
export type PlaceSource = [property: string, dataset: string, licence: string, recordId: string | null,
  updateTime: string, confidence: number | null, nativeVersion: string];
export type PlaceAddress = [freeform: string | null, locality: string | null, postcode: string | null, region: string | null, country: string | null];
export type CompactPlace = [id: string, version: number, name: string, category: string | null,
  taxonomy: { primary: string; hierarchy: string[]; alternates: string[] | null } | null,
  longitude: number, latitude: number, confidence: number | null, status: "open" | "temporarily_closed" | "permanently_closed" | null,
  addresses: PlaceAddress[], sources: PlaceSource[]];
const nullableText = (v: unknown, max: number) => v === null || typeof v === "string" && (v === "" || text(v, max));
const addressText = (v: unknown) => v === null || typeof v === "string" && v.length <= 1000 &&
  !Array.from(v).some(c => c.charCodeAt(0) < 32 && ![9, 10, 13].includes(c.charCodeAt(0)) || c.charCodeAt(0) === 127);
const confidence = (v: unknown) => v === null || typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const slug = (v: unknown) => typeof v === "string" && /^[a-z0-9][a-z0-9_]{0,99}$/.test(v);
// Some native Foursquare timestamps omit an offset. Preserve them verbatim;
// their timezone is unknown, so they cannot establish a precise freshness instant.
const sourceTime = (v: unknown) => timestamp(v) || typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?$/.test(v) &&
  Number.isFinite(Date.parse(v + "Z")) && new Date(v + "Z").toISOString().slice(0, 10) === v.slice(0, 10);
function demand(v: unknown): asserts v { if (!v) throw new SourceError("invalid_response"); }
/** Private compact normalised inventory. Native source confidence is not evidence strength or completeness. */
export function validatePlace(value: unknown): CompactPlace {
  demand(Array.isArray(value) && value.length === 11);
  const r = value as unknown[];
  demand(uuid(r[0]) && Number.isSafeInteger(r[1]) && Number(r[1]) >= 0 && text(r[2], 200));
  demand(r[3] === null || slug(r[3]));
  if (r[4] !== null) {
    const t = object(r[4]);
    demand(Object.keys(t).length === 3 && ["primary", "hierarchy", "alternates"].every(k => k in t) && slug(t.primary) &&
      Array.isArray(t.hierarchy) && t.hierarchy.length <= 20 && t.hierarchy.every(slug) &&
      (t.alternates === null || Array.isArray(t.alternates) && t.alternates.length <= 30 && t.alternates.every(slug)));
  }
  demand(typeof r[5] === "number" && Number.isFinite(r[5]) && r[5] >= -180 && r[5] <= 180 &&
    typeof r[6] === "number" && Number.isFinite(r[6]) && r[6] >= -90 && r[6] <= 90 && confidence(r[7]));
  demand(r[8] === null || ["open", "temporarily_closed", "permanently_closed"].includes(String(r[8])));
  demand(Array.isArray(r[9]) && r[9].length <= 20 && r[9].every(a => Array.isArray(a) && a.length === 5 && a.every(addressText)));
  demand(Array.isArray(r[10]) && r[10].length >= 1 && r[10].length <= 20 && r[10].every(s => Array.isArray(s) && s.length === 7 &&
    nullableText(s[0], 300) && typeof s[1] === "string" && Object.hasOwn(overtureLicences, s[1]) && s[2] === overtureLicences[s[1]] &&
    nullableText(s[3], 300) && sourceTime(s[4]) && confidence(s[5]) && nullableText(s[6], 100)));
  return structuredClone(value) as CompactPlace;
}
export function validatePlaceChunk(value: unknown): CompactPlace[] {
  demand(Array.isArray(value) && value.length >= 1 && value.length <= 500);
  const result = value.map(validatePlace);
  demand(new Set(result.map(r => r[0])).size === result.length);
  return result;
}

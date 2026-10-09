import { object, timestamp, uuid } from "./validation.ts";
import { validPoint, type Point } from "../spatial/model.ts";
import { SourceError } from "./errors.ts";
import type { EnrichmentReleaseBindings } from "./enrichment-repository.ts";

export type EnrichmentInput = {
  schemaVersion: 1;
  releases: EnrichmentReleaseBindings & { osReleaseId: string; numbatReleaseId: string;
    householdReleaseId: string; carsReleaseId: string; economicActivityReleaseId: string };
  identity: {
    state: "matched" | "unresolved" | "ambiguous" | "unavailable";
    uprn: string | null; point: Point | null;
    coordinateBasis: "address_building_not_entrance" | null;
    method: "exact_selected_address_components" | null;
    retrievedAt: string;
    selectedParts: { primary: string | null; secondary: string | null; street: string | null; town: string | null; postcode: string } | null;
    observedCredits: number | null;
    missingReason: string | null;
  };
};
export const enrichmentReleaseKeys = ["geographyReleaseId", "nativeReleaseId", "censusReleaseId", "incomeReleaseId", "bresReleaseId",
  "placesReleaseId", "conservationReleaseId", "article4ReleaseId", "osReleaseId", "numbatReleaseId",
  "householdReleaseId", "carsReleaseId", "economicActivityReleaseId"] as const;
function demand(v: unknown): asserts v { if (!v) throw new SourceError("invalid_response"); }
function keys(v: Record<string, unknown>, names: readonly string[]) {
  demand(Object.keys(v).length === names.length && names.every(k => k in v));
}
const nullable = (v: unknown, max: number) => v === null || typeof v === "string" && v.length > 0 && v.length <= max &&
  Array.from(v).every(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127);

/** Private new-input representation only. Database admission must also verify
 * selected postal components, exact OS lookup and ready release parentage.
 * Runtime validation alone cannot authorise a property identity or a release. */
export function validateEnrichmentInput(value: unknown): EnrichmentInput {
  const e = object(value), r = object(e.releases), i = object(e.identity);
  keys(e, ["schemaVersion", "releases", "identity"]); keys(r, enrichmentReleaseKeys);
  keys(i, ["state", "uprn", "point", "coordinateBasis", "method", "retrievedAt", "selectedParts", "observedCredits", "missingReason"]);
  demand(e.schemaVersion === 1 && enrichmentReleaseKeys.every(k => uuid(r[k])) && timestamp(i.retrievedAt));
  demand(i.observedCredits === null || Number.isSafeInteger(i.observedCredits) && Number(i.observedCredits) >= 0 && Number(i.observedCredits) <= 20);
  demand(["matched", "unresolved", "ambiguous", "unavailable"].includes(String(i.state)));
  if (i.state === "matched") {
    demand(typeof i.uprn === "string" && /^[1-9]\d{0,11}$/.test(i.uprn) && validPoint(i.point) &&
      i.point.source === "os-open-uprn" && i.point.precision === "building" && i.coordinateBasis === "address_building_not_entrance" &&
      i.method === "exact_selected_address_components" && i.missingReason === null);
    const p = object(i.selectedParts);
    keys(p, ["primary", "secondary", "street", "town", "postcode"]);
    demand(nullable(p.primary, 200) && p.primary !== null && nullable(p.secondary, 200) &&
      nullable(p.street, 200) && p.street !== null && nullable(p.town, 200) && p.town !== null &&
      typeof p.postcode === "string" && /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(p.postcode));
  } else {
    demand(i.uprn === null && i.point === null && i.coordinateBasis === null && i.method === null && i.selectedParts === null &&
      nullable(i.missingReason, 300) && i.missingReason !== null);
  }
  return structuredClone(value) as EnrichmentInput;
}

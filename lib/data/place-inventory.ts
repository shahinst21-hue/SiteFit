import { SourceError } from "./errors.ts";
import { object, uuid } from "./validation.ts";
import { validatePlace, validatePlaceTaxonomy, overtureLicences } from "./overture.ts";
import type { CompactPlace } from "./overture.ts";
import type { Category } from "./contracts.ts";

export const placeFamilyVersion = "overture-native-family-1";
const coffee = new Set(["coffee_shop", "cafe", "tea_room"]);
const coffeeSubstitutes = new Set(["bakery", "bubble_tea_shop", "coffee_roastery", "cafeteria"]);
const salon = new Set(["hair_salon", "barber", "hair_stylist", "kids_hair_salon", "beauty_salon", "nail_salon"]);
export type PlaceRole = "primary" | "substitute" | "context" | "unknown" | "excluded_closed";
/** A reviewed native taxonomy family, not a claim about offer, quality or trading status. */
export function placeRole(place: CompactPlace, category: Category): PlaceRole {
  return taxonomyRole(place[4], place[8], category);
}
function taxonomyRole(taxonomy: CompactPlace[4], status: CompactPlace[8], category: Category): PlaceRole {
  if (status === "permanently_closed") return "excluded_closed";
  if (!taxonomy) return "unknown";
  const primary = taxonomy.primary;
  if (category === "coffee-shop") {
    if (coffee.has(primary)) return "primary";
    if (coffeeSubstitutes.has(primary) || taxonomy.hierarchy.includes("restaurant")) return "substitute";
  } else if (category === "restaurant") {
    if (taxonomy.hierarchy.includes("restaurant")) return "primary";
    if (coffee.has(primary) || coffeeSubstitutes.has(primary)) return "substitute";
  } else if (salon.has(primary)) return "primary";
  // A coarse beauty-service category includes unrelated activities. Do not
  // silently count cosmetics suppliers, tattoo shops or hair-loss clinics as salons.
  if (primary === "personal_or_beauty_service" || primary === "casual_eatery") return "unknown";
  return "context";
}

type FullInventory = { schemaVersion: 1; releaseId: string; geographyReleaseId: string;
  membership: "native-point-closed-polygon"; inventoryCompleteness: "unknown"; items: CompactPlace[] };
type AggregateInventory = {schemaVersion: 2; releaseId: string; geographyReleaseId: string;
  membership: "native-point-closed-polygon"; inventoryCompleteness: "unknown"; nativeRecords: number; recordSetSha256: string;
  groups: {taxonomy: CompactPlace[4]; operatingStatus: CompactPlace[8]; count: number}[]; sourceCoverage: Record<string,number>};
export type PlaceInventory = FullInventory | AggregateInventory;
export function validatePlaceInventory(value: unknown, releaseId: string, geographyReleaseId: string): PlaceInventory {
  const v = object(value);
  if (v.schemaVersion === 2) {
    if (Object.keys(v).sort().join() !== "geographyReleaseId,groups,inventoryCompleteness,membership,nativeRecords,recordSetSha256,releaseId,schemaVersion,sourceCoverage" ||
      !uuid(releaseId) || !uuid(geographyReleaseId) || v.releaseId !== releaseId || v.geographyReleaseId !== geographyReleaseId ||
      v.membership !== "native-point-closed-polygon" || v.inventoryCompleteness !== "unknown" ||
      !Number.isSafeInteger(v.nativeRecords) || Number(v.nativeRecords)<0 || Number(v.nativeRecords)>25000 ||
      typeof v.recordSetSha256 !== "string" || !/^[a-f0-9]{64}$/.test(v.recordSetSha256) || !Array.isArray(v.groups) || v.groups.length>25000) throw new SourceError("invalid_response");
    const seen = new Set<string>(); let count = 0;
    for (const value of v.groups) {
      const g = object(value), key=JSON.stringify([g.taxonomy,g.operatingStatus]);
      if (Object.keys(g).sort().join() !== "count,operatingStatus,taxonomy" || !Number.isSafeInteger(g.count) || Number(g.count)<=0 || seen.has(key)) throw new SourceError("invalid_response");
      validatePlaceTaxonomy(g.taxonomy);
      if (g.operatingStatus !== null && !["open","temporarily_closed","permanently_closed"].includes(String(g.operatingStatus))) throw new SourceError("invalid_response");
      seen.add(key); count += Number(g.count);
    }
    const coverage = object(v.sourceCoverage);
    if (count !== v.nativeRecords || Object.keys(coverage).length>100 || Object.entries(coverage).some(([k,n])=>!Object.hasOwn(overtureLicences,k) || !Number.isSafeInteger(n) || Number(n)<0) ||
      Object.values(coverage).reduce<number>((sum,n)=>sum+Number(n),0)<Number(v.nativeRecords)) throw new SourceError("invalid_response");
    return structuredClone(value) as AggregateInventory;
  }
  if (!uuid(releaseId) || !uuid(geographyReleaseId) || Object.keys(v).length !== 6 || v.schemaVersion !== 1 ||
    v.releaseId !== releaseId || v.geographyReleaseId !== geographyReleaseId || v.membership !== "native-point-closed-polygon" ||
    v.inventoryCompleteness !== "unknown" || !Array.isArray(v.items) || v.items.length > 25000) throw new SourceError("invalid_response");
  const items = v.items.map(validatePlace);
  if (new Set(items.map(p => p[0])).size !== items.length) throw new SourceError("invalid_response");
  return { schemaVersion: 1, releaseId, geographyReleaseId, membership: "native-point-closed-polygon", inventoryCompleteness: "unknown", items };
}

/** Native records stay distinct unless a release-bound, evidence-backed review
 * explicitly maps them to one entity. Never collapse neighbours or chains by name. */
export function inventoryOperands(inventory: PlaceInventory, category: Category) {
  const roles = { primary: 0, substitute: 0, context: 0, unknown: 0, excluded_closed: 0 };
  if (inventory.schemaVersion === 1) for (const item of inventory.items) roles[placeRole(item, category)]++;
  else for (const group of inventory.groups) roles[taxonomyRole(group.taxonomy, group.operatingStatus, category)] += group.count;
  return { releaseId: inventory.releaseId, geographyReleaseId: inventory.geographyReleaseId,
    familyVersion: placeFamilyVersion, membership: inventory.membership, nativeRecords: inventory.schemaVersion === 1 ? inventory.items.length : inventory.nativeRecords,
    roles, uniqueBusinessCount: null, uniqueBusinessMissingReason: "entity_review_required" as const,
    completeness: "unknown" as const, percentile: null, percentileMissingReason: "cohort_admission_required" as const };
}

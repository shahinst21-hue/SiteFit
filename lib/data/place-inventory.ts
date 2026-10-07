import { SourceError } from "./errors.ts";
import { object, uuid } from "./validation.ts";
import { validatePlace } from "./overture.ts";
import type { CompactPlace } from "./overture.ts";
import type { Category } from "./contracts.ts";

export const placeFamilyVersion = "overture-native-family-1";
const coffee = new Set(["coffee_shop", "cafe", "tea_room"]);
const coffeeSubstitutes = new Set(["bakery", "bubble_tea_shop", "coffee_roastery", "cafeteria"]);
const salon = new Set(["hair_salon", "barber", "hair_stylist", "kids_hair_salon", "beauty_salon", "nail_salon"]);
export type PlaceRole = "primary" | "substitute" | "context" | "unknown" | "excluded_closed";
/** A reviewed native taxonomy family, not a claim about offer, quality or trading status. */
export function placeRole(place: CompactPlace, category: Category): PlaceRole {
  if (place[8] === "permanently_closed") return "excluded_closed";
  const taxonomy = place[4];
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

export type PlaceInventory = { schemaVersion: 1; releaseId: string; geographyReleaseId: string;
  membership: "native-point-closed-polygon"; inventoryCompleteness: "unknown"; items: CompactPlace[] };
export function validatePlaceInventory(value: unknown, releaseId: string, geographyReleaseId: string): PlaceInventory {
  const v = object(value);
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
  for (const item of inventory.items) roles[placeRole(item, category)]++;
  return { releaseId: inventory.releaseId, geographyReleaseId: inventory.geographyReleaseId,
    familyVersion: placeFamilyVersion, membership: inventory.membership, nativeRecords: inventory.items.length,
    roles, uniqueBusinessCount: null, uniqueBusinessMissingReason: "entity_review_required" as const,
    completeness: "unknown" as const, percentile: null, percentileMissingReason: "cohort_admission_required" as const };
}

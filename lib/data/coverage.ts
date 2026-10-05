import type { CollectionContext, Eligibility, SourceId } from "./contracts.ts";
export function coverage(source: SourceId, context: CollectionContext): Eligibility {
  if (source === "fsa-establishments" && context.category === "hair-beauty-salon") return { eligible: false, outcome: "not_applicable", code: "not_applicable" };
  if (!context.selectedProperty.point || context.selectedProperty.point.precision === "unknown") return { eligible: false, outcome: "unsupported", code: "insufficient_precision" };
  if (!context.region.eligible) return { eligible: false, outcome: "unsupported", code: "unsupported_geography" };
  if (source === "ons-population" && (!context.geography || context.geography.ambiguous)) return { eligible: false, outcome: "unsupported", code: "unsupported_geography" };
  return { eligible: true };
}

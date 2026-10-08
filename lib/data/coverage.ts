import type { CollectionContext, Eligibility, SourceId } from "./contracts.ts";
export function coverage(source: SourceId, context: CollectionContext): Eligibility {
  if (source === "planning-conservation" || source === "planning-article4" || source === "geoapify-walking") {
    if (context.schemaVersion !== 2 || context.enrichment?.identity.state !== "matched") return { eligible: false, outcome: "unsupported", code: "insufficient_precision" };
    return context.region.eligible ? { eligible: true } : { eligible: false, outcome: "unsupported", code: "unsupported_geography" };
  }
  if (source === "fsa-establishments" && context.category === "hair-beauty-salon") return { eligible: false, outcome: "not_applicable", code: "not_applicable" };
  if (!context.selectedProperty.point || context.selectedProperty.point.precision === "unknown") return { eligible: false, outcome: "unsupported", code: "insufficient_precision" };
  if (!context.region.eligible) return { eligible: false, outcome: "unsupported", code: "unsupported_geography" };
  if (source === "ons-population" && (!context.geography || context.geography.ambiguous)) return { eligible: false, outcome: "unsupported", code: "unsupported_geography" };
  return { eligible: true };
}

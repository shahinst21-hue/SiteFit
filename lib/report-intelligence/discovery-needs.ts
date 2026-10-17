import type { Catalog } from "./catalog.ts";
import { competitionBrief } from "./competition.ts";

/** A preparation-stage task, never an automatic request on report reopening.
 * Search is a lead finder. Rights, identity and factual validation are separate. */
export function competitionDiscoveryNeeds(catalog: Catalog) {
  const comparison = competitionBrief(catalog);
  return { version: "competition-discovery-needs-v1", paidPreparationOnly: true, maxSearchCalls: 1, automaticRetries: false,
    state: !comparison.applicable ? "not_applicable" : comparison.profiles.some(p => p.currentOffer.state === "unknown" ||
      p.customerRating.state === "unknown" || p.brand.state === "unknown") ? "evidence_gap" : "stored_evidence_sufficient",
    operators: comparison.profiles.slice(0, 6).map(p => ({ recordId: p.recordId, name: p.name,
      expectedFields: ["exact trading branch", "offer", "brand affiliation", "dated customer rating and review count"] })),
    admission: ["Verify the actual operator and unit against original source, not a name match or search snippet.",
      "Review commercial representation/retention rights separately for each source; public access is not a licence.",
      "Retain compact permitted facts, date, source URL and identity proof; discard page text and personal contact data.",
      "Preserve conflicting or stale evidence; do not prefer newest automatically.",
      "An unsuccessful search leaves explicit unknowns and does not remove successful structured source results."],
    dispatchGate: "A phase-wide reservation and persisted one-shot intent must exist before any paid search. Discovery proposals cannot enter the admitted report directly." };
}

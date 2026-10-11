import type { Catalog } from "./catalog.ts";
import { object } from "../data/validation.ts";

/** These are comparisons of evidenced attributes, never a fabricated competitor score. */
export function competitionBrief(catalog: Catalog) {
  const operators = catalog.operators?.items ?? [];
  const profiles = operators.map(operator => {
    const factIds = [catalog.operators!.sources[operator.sourceIndex].sourceFactId];
    // Additional attributes must have survived the ordinary scoped evidence admission.
    // Names, FSA categories and model knowledge cannot establish these fields.
    const attribute = (kind: string) => {
      const f = catalog.facts.find(f => {
        if (f.section !== "competition" || !f.statistical) return false;
        const s = object(f.statistical);
        return s.operatorRecordId === operator.recordId && s.attribute === kind && s.exactTradingUnit === true &&
          s.verification === "source-verified" && f.retrievedAt !== null;
      });
      if (!f) return { state: "unknown", value: null, factId: null };
      if (kind === "customer-rating") {
        const s = object(f.statistical);
        if (s.ratingKind !== "customer-review" || !Number.isFinite(s.scale) || Number(s.scale) <= 0 ||
          !Number.isSafeInteger(s.reviewCount) || Number(s.reviewCount) < 1 || typeof f.value !== "number" ||
          f.value < 0 || f.value > Number(s.scale) || !f.effectiveAt) return { state: "unknown", value: null, factId: null };
        return { state: "source-reported", value: f.value, factId: f.id, scale: s.scale, reviewCount: s.reviewCount,
          asOf: f.effectiveAt, provider: f.source.provider };
      }
      return { state: "source-reported", value: f.value, factId: f.id };
    };
    return { recordId: operator.recordId, name: operator.name, registeredCategory: operator.businessType,
      factIds, currentOffer: attribute("offer"), brand: attribute("brand"), customerRating: attribute("customer-rating"),
      hygieneRating: operator.hygiene ? { state: "dated-register-inspection", value: operator.hygiene.value, scale: 5,
        inspectedAt: operator.hygiene.inspectedAt, factId: factIds[0], meaning: "food hygiene, not customer reputation" } : attribute("hygiene-rating"), pricePosition: attribute("price-position"),
      tradingPeriods: attribute("trading-periods"), directOverlap: attribute("concept-overlap"),
      competitiveStrength: { state: "unassessed", score: null,
        reason: "Compare verified offer overlap, brand, price and reputation; do not rank strength from a name or hygiene inspection." } };
  });
  return { version: "competition-brief-v1", applicable: catalog.business !== "hair-beauty-salon",
    profiles: catalog.business === "hair-beauty-salon" ? [] : profiles,
    count: { state: "unavailable", total: null, reason: "Incomplete inventory and unverified current offer/identity cannot establish a complete unique competitor total." },
    identifiedLeads: catalog.business === "hair-beauty-salon" ? 0 : profiles.length,
    coverage: "Bounded registered leads; not a complete market census or unique active competitor count.",
    discoveryNeeds: ["Exact trading-unit identity and selected-premises exclusion", "Offer and meal/coffee occasion overlap",
      "Verified branch/brand affiliation", "Customer rating, scale, review count, source and date",
      "Price and service/trading periods where source-supported"],
    limitations: ["FSA hygiene ratings are not customer ratings or commercial strength.",
      "No national-brand label follows from a matching name; no weak-competition claim follows from missing reviews."] };
}

import "server-only";
import type { Catalog } from "./catalog.ts";
import { packetDigest } from "../analysis/canonical.ts";
import { reviewRent } from "../web-evidence/rent.ts";
import type { RentalFallback } from "../web-evidence/rental-fallback.ts";
import type { CollectionContext } from "../data/contracts.ts";

/** Only independently verified/permissioned findings enter a NEW preparation.
 * Preserve all dated conflicting observations; never choose by recency alone. */
export function applyRentalDiscovery(context: CollectionContext, catalog: Catalog, result: RentalFallback) {
  if (result.contextDigest !== packetDigest(context)) throw Error("foreign_rental_discovery");
  if (result.state !== "accepted") return;
  const parts = context.enrichment?.identity.selectedParts;
  if (!parts?.primary || !parts.street || !parts.secondary) throw Error("rental_discovery_identity");
  const target = { primary: parts.primary, street: parts.street, postcode: parts.postcode, unit: parts.secondary };
  if (result.findings.length > 3) throw Error("rental_discovery_bounds");
  for (const { id, sourceDigest, review, permission } of result.findings) {
    if (!/^[a-f0-9]{64}$/.test(sourceDigest) || id !== packetDigest({ review, policy: permission, sourceDigest }) || !reviewRent(review, target, permission).retainContent)
      throw Error("rental_discovery_invalid");
    const referenceId = `web-rent:${id}`;
    if (catalog.rentalObservations.some(r => r.id === referenceId)) continue;
    const kind = review.kind === "asking_rent" ? "source_asking_rent" : review.kind === "reported_contract_rent" ? "source_reported_contract_rent" : "source_market_estimate";
    const limitations = ["Dated original-source observation, not proof of current or agreed lease rent.",
      "Quoted VAT, charges, incentives, lease terms and area basis must be compared separately; no financial assumption.",
      "Reported contract rent is a source claim, not an independently inspected lease; market estimates are not asking rent."];
    catalog.rentalObservations.push({ id: referenceId, kind, annualValue: review.annualGbp, unit: "GBP per year",
      areaBasis: review.areaBasis, retrievedAt: review.observedAt, sourceDate: review.effectiveDate ?? review.publishedDate,
      reportedError: null, selectedUnitRent: true,
      web: { policyId: permission.id, sourceLabel: permission.sourceLabel, match: "exact_unit", publishedDate: review.publishedDate,
        effectiveDate: review.effectiveDate, amountQualifier: review.amountQualifier, vat: review.vat, limitations } });
    catalog.supplementReferences.push({ id: referenceId, bundleDigest: id, source: `rental-web:${permission.id}`,
      reference: review.url, retrievedAt: review.observedAt, effectiveAt: review.effectiveDate ?? review.publishedDate,
      scope: "exact-unit-dated-original-source-not-current-lease", licence: { policyId: permission.id, termsReference: permission.termsReference,
        reviewedAt: permission.reviewedAt, retention: permission.retention, attribution: permission.sourceLabel, sourceDigest } });
    catalog.atoms.push({ id: `rental-web-${id}`, section: "rental-context", role: "reason", factIds: [], rule: "verified-original-rent-source-v1",
      text: "Dated, exact-unit original-source rental context is available; asking, source-reported contract and market estimates remain distinct from agreed lease obligations." });
    for (const [i, text] of limitations.entries()) catalog.atoms.push({ id: `rental-web-${id}-limit-${i}`, section: "rental-context", role: "caution", factIds: [], rule: "verified-original-rent-source-v1", text });
  }
}

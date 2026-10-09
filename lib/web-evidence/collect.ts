import "server-only";
import { packetDigest } from "../analysis/canonical.ts";
import { validateContext } from "../data/validation.ts";
import type { CollectionContext } from "../data/contracts.ts";
import { validateDiscovery, type DiscoveryBundle, type AddressParts } from "./model.ts";
import { verifyPublicCandidate } from "./verify.ts";
import type { SearchCandidate, SearchReceipt } from "./search.ts";

/** Paid-only repository authorises before invoking this collector. Existing
 * sources are references to frozen outcomes, never refetched or overwritten. */
export async function collectDiscovery(context: CollectionContext, sourceBindings: DiscoveryBundle["sourceBindings"], options: {
  discover: () => Promise<{ candidates: SearchCandidate[]; receipt: SearchReceipt }>;
  structuredRentReferences?: { snapshotId: string; checksum: string }[];
  verify?: typeof verifyPublicCandidate; now?: () => Date;
}): Promise<DiscoveryBundle> {
  const c = validateContext(context); const now = options.now ?? (() => new Date());
  const b: DiscoveryBundle = { schemaVersion: 1, analysisId: c.analysisId, inputId: c.inputId, propertyId: c.selectedProperty.id,
    contextDigest: packetDigest(c), generatedAt: now().toISOString(), outcome: "unavailable", findings: [], references: [], sourceBindings, searchReceipt: null,
    limitations: ["Bounded discovery is not complete premises history or a tenancy register.", "Current register name does not establish opening, closure, occupation-change date or cause.",
      "Public source links do not establish permission to store expressive content or entire provider responses.", "No discovered rent is automatically a financial assumption; structured results remain unchanged."] };
  for (const rent of options.structuredRentReferences ?? []) {
    if (!sourceBindings.some(s => s.snapshotId===rent.snapshotId && s.checksum===rent.checksum)) throw new Error("discovery_parent_invalid");
    b.limitations.push(`Stored source ${rent.snapshotId} remains an unadmitted PropertyData market estimate, not an actual selected-unit asking or contracted rent. Do not select it automatically over web evidence.`);
  }
  const parts = c.enrichment?.identity.selectedParts;
  if (!c.region.eligible || !parts?.primary || !parts.street || c.selectedProperty.resolution !== "provider_verified") return validateDiscovery(b);
  const target: AddressParts = { primary: parts.primary, street: parts.street, postcode: parts.postcode, unit: parts.secondary };
  try {
    const result = await options.discover(); b.searchReceipt = result.receipt;
    if (result.candidates.length > 3) throw new Error("discovery_invalid");
    const seen = new Set<string>();
    for (const candidate of result.candidates) {
      if (seen.has(candidate.url)) continue;
      seen.add(candidate.url);
      // No proposedFact is copied into evidence; source adapter independently reads facts.
      const verified = await (options.verify ?? verifyPublicCandidate)(candidate.url, target);
      b.references.push({ url: verified.url, state: verified.state }); b.findings.push(...verified.findings);
    }
    b.outcome = b.findings.length ? "success" : "empty";
  } catch { b.outcome = b.findings.length ? "success" : "unavailable"; b.limitations.push("Discovery/verification failed or was disabled; successful structured sources and verified findings are preserved."); }
  return validateDiscovery(b);
}

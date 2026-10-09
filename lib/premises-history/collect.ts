import "server-only";
import { packetDigest } from "../analysis/canonical.ts";
import { propertyDataFacts } from "../data/adapters/propertydata-facts.ts";
import { safeError, SourceError } from "../data/errors.ts";
import { policy } from "../data/policy.ts";
import { validateContext } from "../data/validation.ts";
import type { CollectionContext } from "../data/contracts.ts";
import { epcHistory } from "./epc.ts";
import { normalisePlanning } from "./planning.ts";
import { validateHistory, type HistoryBundle, type HistoryReceipt } from "./model.ts";

/** No public collector. The repository must authorise and check stored replay
 * before this bounded operation. Source errors are safe outcomes, not logs. */
export async function collectHistory(context: CollectionContext, contextSources: HistoryBundle["contextSources"], options: {
  propertyDataKey?: string; epcKey?: string; fetcher?: typeof fetch; now?: () => Date;
}) {
  const c = validateContext(context), i = c.enrichment?.identity;
  const now = options.now ?? (() => new Date()), generatedAt = now().toISOString();
  const receipts: HistoryReceipt[] = [], events: HistoryBundle["events"] = [];
  const matched = c.region.eligible && i?.state === "matched" && i.uprn && i.point && i.selectedParts;
  for (const source of ["propertydata", "epc"] as const) {
    const receipt: HistoryReceipt = { source, operation: source === "propertydata" ? "planning-applications" : "non-domestic-history", retrievedAt: now().toISOString(),
      outcome: "unsupported", complete: false, candidates: 0, rejected: 0, credits: null, error: null,
      bounds: source === "propertydata" ? "10 candidates; 0.1 mile radius; no age filter; provider default application-type exclusions; no retries; historical completeness unproven" : "UPRN discovery page 1/10; at most 3 certificate details; no latest/current/unit claim",
      licence: policy(source === "propertydata" ? "propertydata-premises" : "govuk-non-domestic-epc") };
    receipts.push(receipt);
    if (!matched) { receipt.error = c.region.eligible ? "insufficient_precision" : "unsupported_geography"; continue; }
    try {
      const result = source === "propertydata" ? await (async () => {
        const r = await propertyDataFacts({ key: options.propertyDataKey, fetcher: options.fetcher, now }).planning({ uprn: i.uprn!, address: c.selectedProperty.formattedAddress,
          point: i.point!, osReleaseId: c.enrichment!.releases.osReleaseId, coordinateBasis: "address_building_not_entrance", selectedParts: i.selectedParts!, classificationCode: null, classificationDescription: null }, AbortSignal.timeout(8000));
        receipt.retrievedAt = r.retrievedAt;
        return normalisePlanning(r.value, i.selectedParts!);
      })() : await epcHistory(i.uprn!, { key: options.epcKey, fetcher: options.fetcher, now });
      receipt.candidates = result.candidates; receipt.rejected = result.rejected; receipt.complete = result.complete;
      receipt.credits = source === "propertydata" ? 1 : 0;
      receipt.outcome = result.events.length ? "success" : "empty";
      events.push(...result.events);
    } catch (error) { receipt.outcome = "unavailable"; receipt.error = safeError(error).code; }
  }
  if (c.schemaVersion !== 2) throw new SourceError("invalid_request");
  return validateHistory({ schemaVersion: 1, analysisId: c.analysisId, inputId: c.inputId, propertyId: c.selectedProperty.id, uprn: i?.uprn ?? null,
    contextDigest: packetDigest(c), generatedAt, receipts, events: [...new Map(events.map(e => [e.id, e])).values()], contextSources,
    unknowns: ["Verified past tenants and occupancy intervals", "Reasons for opening, closure or business change", "Current vacancy and duration", "Whether proposed works were implemented", "Current permitted use and selected trading-unit extent"],
    limitations: ["A bounded source search is not a complete premises history.", "Building-matched records and UPRN-matched certificates do not establish selected trading-unit suitability.", "FSA and Overture frozen observations are context, not evidence of opening or closure dates."] });
}

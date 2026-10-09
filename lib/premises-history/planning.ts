import "server-only";
import { SourceError } from "../data/errors.ts";
import { object, text } from "../data/validation.ts";
import type { EnrichmentInput } from "../data/enrichment-input.ts";
import { historyDate, historyEvent, historyReference, type HistoryEvent } from "./model.ts";

const canonical = (v: string) => v.normalize("NFKC").toUpperCase().replace(/[.]/g, "").replace(/\s+/g, " ").trim();
/** A radius discovers candidates only. Ambiguous sub-units/ranges are rejected,
 * not repaired with fuzzy matching. A match remains qualified building context. */
export function planningBuildingMatch(address: string, parts: NonNullable<EnrichmentInput["identity"]["selectedParts"]>): boolean {
  if (!parts.primary || !parts.street || !parts.postcode || parts.secondary) return false;
  const fields = address.split(",").map(canonical), target = canonical(`${parts.primary} ${parts.street}`);
  if (fields.some(f => /\b(FLAT|UNIT|SUITE|FLOOR|ROOM|APARTMENT)\b/.test(f))) return false;
  return fields.includes(target) && fields.some(f => f.replace(/\s/g, "") === parts.postcode.replace(/\s/g, "").toUpperCase());
}
export function normalisePlanning(value: unknown, parts: NonNullable<EnrichmentInput["identity"]["selectedParts"]>) {
  const root = object(value), data = object(root.data);
  if (root.status !== "success" || !Array.isArray(data.planning_applications) || data.planning_applications.length > 10 ||
    root.api_calls_cost !== 1 || !Number.isSafeInteger(root.result_count) || root.result_count !== data.planning_applications.length) throw new SourceError("invalid_response");
  const events: HistoryEvent[] = []; let rejected = 0;
  for (const item of data.planning_applications) {
    const row = object(item);
    if (!text(row.address, 1000)) throw new SourceError("invalid_response");
    if (!planningBuildingMatch(row.address, parts)) { rejected++; continue; }
    const dates = object(row.dates), decision = object(row.decision);
    if (!text(row.reference, 100) || !text(row.proposal, 1200) || !historyReference(row.url) ||
      !historyDate(dates.received_at) || !(dates.decided_at === null || historyDate(dates.decided_at)) ||
      !(decision.text === null || text(decision.text, 200))) throw new SourceError("invalid_response");
    events.push(historyEvent({ source: "propertydata", recordId: row.reference, date: dates.received_at, dateMeaning: "application_received",
      fact: `Application recorded: ${row.proposal}`, reference: row.url, evidencePath: "receipts.0" }));
    if (dates.decided_at !== null && decision.text !== null) events.push(historyEvent({ source: "propertydata", recordId: row.reference,
      date: dates.decided_at as string, dateMeaning: "decision_recorded", fact: `Recorded application decision: ${decision.text}; implementation and current permitted use are unverified.`,
      reference: row.url, evidencePath: "receipts.0" }));
  }
  return { events: [...new Map(events.map(e => [e.id, e])).values()], candidates: data.planning_applications.length, rejected,
    // Fewer than ten is not proof of exhaustive history: types/radius/source coverage remain bounded.
    complete: false, credits: 1 };
}

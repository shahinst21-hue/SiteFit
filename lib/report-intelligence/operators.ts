import type { CollectionContext, FoodEstablishments } from "../data/contracts.ts";
import type { AssessmentBundle } from "../analysis/assessment.ts";
import type { Catalog } from "./catalog.ts";
import { object, uuid, validateResult } from "../data/validation.ts";
import { packetDigest } from "../analysis/canonical.ts";

export type OperatorDirectory = { version: "register-shortlist-v1" | "register-shortlist-v2"; selection: string; returnedRecords: number;
  excludedSelectedRecordIds?: string[];
  sources: { sourceFactId: string; snapshotId: string; checksum: string }[];
  omittedFromShortlist: number; complete: false; items: { recordId: string; name: string; businessType: string;
    authorityId: string; point: FoodEstablishments["items"][number]["point"]; observedAt: string | null;
    sourceIndex: number; reference: string; hygiene?: FoodEstablishments["items"][number]["hygiene"] }[] };

/** Preserve permitted register fields; never infer offers, trading status or direct competition.
 * The full source remains immutable. Only a bounded, explicitly labelled shortlist enters AI.
 */
export function projectOperators(context: CollectionContext, assessment: AssessmentBundle, catalog: Catalog, rows: unknown[], at: Date) {
  const items: OperatorDirectory["items"] = [], sources: OperatorDirectory["sources"] = [], excludedSelectedRecordIds: string[] = [];
  const normal = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const selected = normal(context.selectedProperty.formattedAddress); let returnedRecords = 0;
  for (const value of rows) {
    const row = object(value), result = validateResult({ ...object(row.provider_metadata), payload: row.normalised_data });
    if (!uuid(row.id) || row.analysis_id !== context.analysisId || row.input_id !== context.inputId ||
      result.meta.source !== "fsa-establishments" || result.payload?.kind !== "food_establishments" ||
      !result.meta.checksum || packetDigest({ payload: result.payload, observations: result.observations }) !== result.meta.checksum ||
      !assessment.sourceBindings.some(b => b.snapshotId === row.id && b.checksum === result.meta.checksum))
      throw Error("operator_source_binding_invalid");
    const fact = catalog.facts.find(f => f.source.provider === "fsa" &&
      assessment.evidence.some(e => e.id === f.evidenceId && e.snapshotId === row.id));
    if (!fact) continue; // Admission was denied: do not smuggle fields into the packet.
    const licence = result.meta.licence;
    if ([licence.normalised, licence.references, licence.timestamps].some(p => !p.allowed ||
      p.maxDays !== null && Date.parse(result.meta.sourceRetrievedAt) + p.maxDays * 86400000 <= at.getTime())) continue;
    returnedRecords += result.payload.items.length;
    const sourceIndex = sources.length;
    sources.push({ sourceFactId: fact.id, snapshotId: String(row.id), checksum: result.meta.checksum });
    for (const item of result.payload.items) {
      // The selected operator cannot compete with itself. Shared-point market
      // stalls are not merged into one business, and brand names are not inferred.
      if (normal(item.name).length >= 5 && selected.includes(normal(item.name))) { excludedSelectedRecordIds.push(item.id); continue; }
      if (items.some(i => i.recordId === item.id && i.authorityId === item.authorityId)) continue;
      items.push({ recordId: item.id, name: item.name, businessType: item.businessType, authorityId: item.authorityId,
        point: structuredClone(item.point), observedAt: item.observedAt,
        sourceIndex, reference: `https://ratings.food.gov.uk/business/${encodeURIComponent(item.id)}`,
        ...(item.hygiene ? { hygiene: structuredClone(item.hygiene) } : {}) });
    }
    const retained = items.filter(i => i.sourceIndex === sourceIndex);
    if (retained.length) {
      const atom = { section: "competition" as const, role: "reason" as const,
        text: "Named register leads and registered categories are preserved in the operator directory for an offer audit. Actual offers, direct competition and current activity are unverified.",
        factIds: [fact.id], rule: "register-operator-context-v1" };
      catalog.atoms.push({ ...atom, id: `operator-${packetDigest({ snapshot: row.id, records: retained.map(i => i.recordId) }).slice(0, 16)}` });
    }
  }
  const priority = (i: OperatorDirectory["items"][number]) => /Restaurant.?Cafe|Pub.?bar/i.test(i.businessType) ? 0 : /caterer/i.test(i.businessType) ? 1 : 2;
  const first = items.slice(0, 6), ranked = items.map((item, ordinal) => ({ item, ordinal })).filter(v => !first.includes(v.item))
    .toSorted((a, b) => priority(a.item) - priority(b.item) || a.ordinal - b.ordinal).slice(0, 6).map(v => v.item);
  const shortlist = [...first, ...ranked];
  const directory: OperatorDirectory = { version: "register-shortlist-v2", selection: "First six frozen provider leads plus six registered cafe/restaurant/pub-first leads; selected-name matches excluded. Not ranked by strength or verified walking distance. Full records remain immutable.",
    returnedRecords, excludedSelectedRecordIds, omittedFromShortlist: returnedRecords - shortlist.length - excludedSelectedRecordIds.length, complete: false, sources, items: shortlist };
  if (shortlist.length) catalog.operators = directory;
  return directory;
}

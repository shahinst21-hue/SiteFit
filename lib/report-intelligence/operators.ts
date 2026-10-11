import type { CollectionContext, FoodEstablishments } from "../data/contracts.ts";
import type { AssessmentBundle } from "../analysis/assessment.ts";
import type { Catalog } from "./catalog.ts";
import { object, uuid, validateResult } from "../data/validation.ts";
import { packetDigest } from "../analysis/canonical.ts";

export type OperatorDirectory = { version: "register-shortlist-v1"; selection: string; returnedRecords: number;
  sources: { sourceFactId: string; snapshotId: string; checksum: string }[];
  omittedFromShortlist: number; complete: false; items: { recordId: string; name: string; businessType: string;
    authorityId: string; point: FoodEstablishments["items"][number]["point"]; observedAt: string | null;
    sourceIndex: number; reference: string }[] };

/** Preserve permitted register fields; never infer offers, trading status or direct competition.
 * The full source remains immutable. Only a bounded, explicitly labelled shortlist enters AI.
 */
export function projectOperators(context: CollectionContext, assessment: AssessmentBundle, catalog: Catalog, rows: unknown[], at: Date) {
  const items: OperatorDirectory["items"] = [], sources: OperatorDirectory["sources"] = []; let returnedRecords = 0;
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
      if (items.length >= 12) break;
      items.push({ recordId: item.id, name: item.name, businessType: item.businessType, authorityId: item.authorityId,
        point: structuredClone(item.point), observedAt: item.observedAt,
        sourceIndex, reference: `https://ratings.food.gov.uk/business/${encodeURIComponent(item.id)}` });
    }
    const selected = items.filter(i => i.sourceIndex === sourceIndex);
    if (selected.length) {
      const atom = { section: "competition" as const, role: "reason" as const,
        text: "Named register leads and registered categories are preserved in the operator directory for an offer audit. Actual offers, direct competition and current activity are unverified.",
        factIds: [fact.id], rule: "register-operator-context-v1" };
      catalog.atoms.push({ ...atom, id: `operator-${packetDigest({ snapshot: row.id, records: selected.map(i => i.recordId) }).slice(0, 16)}` });
    }
  }
  const directory: OperatorDirectory = { version: "register-shortlist-v1", selection: "First 12 in frozen provider order; not ranked by proximity/strength. Full records remain in immutable source snapshots.",
    returnedRecords, omittedFromShortlist: returnedRecords - items.length, complete: false, sources, items };
  if (items.length) catalog.operators = directory;
  return directory;
}

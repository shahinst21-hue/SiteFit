import { enrichmentMetrics } from "../analysis/enrichment-metrics.ts";
import type { AssessmentBundle } from "../analysis/assessment.ts";
import type { CollectionContext, StoredSnapshot } from "../data/contracts.ts";
import { object, uuid, validateResult } from "../data/validation.ts";
import { packetDigest } from "../analysis/canonical.ts";
import type { Catalog, Atom } from "./catalog.ts";

/** Descriptive chart operands already implemented in Phase 8. No new cohort,
 * score, current-demand estimate or provider lookup. Freeze once with the edition. */
export function storedProfiles(context: CollectionContext, assessment: AssessmentBundle, rows: unknown[]) {
  if (context.schemaVersion !== 2) return { version: "stored-profiles-v1", state: "unavailable", reason: "enriched_context_unavailable", tables: [], sources: [] };
  const snapshots: StoredSnapshot[] = rows.map(value => {
    const r = object(value), result = validateResult({ ...object(r.provider_metadata), payload: r.normalised_data });
    if (!uuid(r.id) || r.analysis_id !== context.analysisId || r.input_id !== context.inputId ||
      !assessment.sourceBindings.some(b => b.snapshotId === r.id && b.checksum === result.meta.checksum) ||
      result.meta.source !== "ons-catchments" || result.payload?.kind !== "catchment_statistics" ||
      !result.meta.licence.normalised.allowed || !result.meta.licence.derived.allowed || !result.meta.licence.references.allowed || !result.meta.licence.timestamps.allowed ||
      result.meta.licence.derived.maxDays !== null) throw Error("profile_source_not_admitted");
    return { id: String(r.id), analysisId: context.analysisId, inputId: context.inputId,
      collectionKey: String(r.collection_key), requestHash: String(r.request_sha256), result };
  });
  const metrics = enrichmentMetrics(context, snapshots);
  const tables = metrics.flatMap(m => m.id !== "census.walking-native-operands" ? [] : m.ranges.flatMap(range => range.tables.map(t => {
    if (t.series === null) return { dataset: t.dataset, releaseId: t.releaseId, seconds: range.seconds,
      state: t.state, missingReason: t.missingReason, sourceSnapshotId: m.sourceSnapshotId, columns: [], values: [] };
    return { dataset: t.dataset, releaseId: t.releaseId, seconds: range.seconds, state: t.state,
      referencePeriod: "2021-03-21", universe: t.universe, method: "area-uniform-bng1", sourceSnapshotId: m.sourceSnapshotId,
      // Keep published ordinals. Parent and child categories and cumulative
      // contours are not combined, and partial contributions are not totals.
      columns: t.series.map(s => ({ ordinal: s.columnOrdinal, label: s.label })),
      valueFields: ["state", "value", "knownContribution", "missingAreaM2", "share", "ratioMissingReason"],
      values: t.series.map(s => [s.state, s.value, s.knownContribution, s.missingAreaM2, s.shareOfSameTableTotal, s.ratioMissingReason]) };
  })));
  const columnSets = Object.fromEntries(tables.filter(t => t.columns.length).map(t => [t.dataset, t.columns]));
  const compactTables = tables.map(t => { const table = { ...t }; delete (table as Partial<typeof t>).columns; return table; });
  const sources = snapshots.map(s => ({ snapshotId: s.id, checksum: s.result.meta.checksum,
    releaseId: s.result.meta.datasetReleaseId, retrievedAt: s.result.meta.sourceRetrievedAt,
    freshness: s.result.meta.freshness, licence: s.result.meta.licence, limitations: s.result.meta.quality.limitations }));
  return { version: "stored-profiles-v1", state: tables.length ? "available" : "unavailable",
    reason: tables.length ? null : "stored_profile_unavailable", tables: compactTables, columnSets, sources,
    limitations: ["Dated Census context, not actual customers or current demand.",
      "Area-uniform allocation; never sum hierarchical categories or cumulative walking contours.",
      "No invented local comparator or customer conversion assumption."] };
}

/** One supported descriptive focus, never an invented target market or a new
 * score transform. Complete profiles remain available outside the AI packet. */
export function profileFocus(catalog: Catalog, profiles: ReturnType<typeof storedProfiles>) {
  if (!("columnSets" in profiles)) return;
  const table = profiles.tables.find(t => t.dataset === "TS007A" && t.seconds === 600 && t.state === "available");
  const base = catalog.facts.find(f => f.dataset.includes("TS007A") && /600|10.?min/i.test(f.scope));
  if (!table || !base || !table.values.length) return;
  const bands = table.values.slice(1).map((cell, i) => ({ cell, ordinal: i + 2 }));
  if (bands.some(b => b.cell[0] !== "available" || typeof b.cell[1] !== "number")) return;
  const focus = bands.toSorted((a, b) => Number(b.cell[1]) - Number(a.cell[1]) || a.ordinal - b.ordinal)[0];
  if (!focus || Number(focus.cell[1]) <= 0) return;
  const column = profiles.columnSets?.TS007A?.find(c => c.ordinal === focus.ordinal);
  if (!column) return;
  const fact = { ...base, id: `profile-${packetDigest({ source: table.sourceSnapshotId, ordinal: focus.ordinal }).slice(0, 16)}`,
    value: Number(focus.cell[1]), units: `estimated residents; ${column.label}`, statistical: {
      profileOrdinal: focus.ordinal, profileDataset: "TS007A", referencePeriod: "2021-03-21", seconds: 600,
      method: "area-uniform-bng1", sourceSnapshotId: table.sourceSnapshotId, parentEvidenceId: base.evidenceId } };
  catalog.facts.push(fact);
  const atom = (role: Atom["role"], text: string, rule: string): Atom => ({ id: `a-${packetDigest({ text, fact: fact.id }).slice(0, 16)}`,
    section: "customer-context", role, text, factIds: [fact.id], rule });
  catalog.atoms.push(atom("reason", `Within the dated 10-minute modelled catchment, ${column.label} is one of the largest published age bands: ${fact.value} estimated residents. It is not measured custom.`, "dated-age-focus-v1"));
  const concept = catalog.business === "coffee-shop" ? "coffee menu and service occasions" : catalog.business === "restaurant" ? "restaurant offer and trading occasions" : "salon services and appointment patterns";
  catalog.atoms.push(atom("implication", `The ${column.label} segment provides a specific local profile to test against the proposed ${concept}. Its size does not establish purchasing power, preferences or customer conversion.`, "business-profile-hypothesis-v1"));
}

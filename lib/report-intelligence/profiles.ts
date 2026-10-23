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
      referencePeriod: "2021-03-21", universe: t.universe, method: t.allocation.methodVersion, sourceSnapshotId: m.sourceSnapshotId,
      allocation: { releases: t.allocation.releases, boundaryResidualAreaM2: t.allocation.boundaryResidualAreaM2,
        allocationCoveredAreaM2: t.allocation.allocationCoveredAreaM2, londonCoverageFraction: t.allocation.londonCoverageFraction,
        limitations: t.allocation.limitations },
      // Keep published ordinals. Parent and child categories and cumulative
      // contours are not combined, and partial contributions are not totals.
      columns: t.series.map(s => ({ ordinal: s.columnOrdinal, label: s.label })),
      valueFields: ["state", "value", "knownContribution", "missingAreaM2", "share", "ratioMissingReason"],
      values: t.series.map(s => [s.state, s.value, s.knownContribution, s.missingAreaM2, s.shareOfSameTableTotal, s.ratioMissingReason]) };
  })));
  const columnSets = Object.fromEntries(tables.filter(t => t.columns.length).map(t => [t.dataset, t.columns]));
  const allocationReleases: unknown[] = [], releasePositions = new Map<string, number>(),
    allocationLimitations: string[][] = [], limitationPositions = new Map<string, number>();
  const compactTables = tables.map(t => {
    const table = { ...t }; delete (table as Partial<typeof t>).columns;
    delete (table as Partial<typeof t>).valueFields;
    if (!("allocation" in table) || !table.allocation) return table;
    const { releases, limitations, ...allocation } = table.allocation, digest = packetDigest(releases);
    let releaseIndex = releasePositions.get(digest);
    if (releaseIndex === undefined) { releaseIndex = allocationReleases.length; releasePositions.set(digest, releaseIndex); allocationReleases.push(releases); }
    const limitationsDigest = packetDigest(limitations);
    let limitationsIndex = limitationPositions.get(limitationsDigest);
    if (limitationsIndex === undefined) { limitationsIndex = allocationLimitations.length; limitationPositions.set(limitationsDigest, limitationsIndex); allocationLimitations.push(limitations); }
    const compact = table.values.length > 0 && table.values.every(v => v[0] === "available" &&
      typeof v[1] === "number" && v[1] === v[2] && v[3] === 0 && (v[5] === null || typeof v[5] === "string"));
    return { ...table, ...(compact ? { cellCodec: "available-equal-contribution-v1",
      values: table.values.map(v => [v[1], v[4], v[5]]) } : {}), allocation: { ...allocation, releaseIndex, limitationsIndex } };
  });
  const sources = snapshots.map(s => ({ snapshotId: s.id, checksum: s.result.meta.checksum,
    releaseId: s.result.meta.datasetReleaseId, retrievedAt: s.result.meta.sourceRetrievedAt,
    freshness: s.result.meta.freshness, licence: s.result.meta.licence, limitations: s.result.meta.quality.limitations }));
  return { version: "stored-profiles-v3", state: tables.length ? "available" : "unavailable",
    reason: tables.length ? null : "stored_profile_unavailable", tables: compactTables, columnSets, allocationReleases, allocationLimitations, sources,
    valueFields: ["state", "value", "knownContribution", "missingAreaM2", "share", "ratioMissingReason"],
    limitations: ["Dated Census context, not actual customers or current demand.",
      "Area-uniform allocation; never sum hierarchical categories or cumulative walking contours.",
      "No invented local comparator or customer conversion assumption."] };
}

/** Section consumers receive full method metadata. Historical v1 is unchanged. */
export function expandedProfiles(value: unknown) {
  const p = object(value);
  if (p.version !== "stored-profiles-v2" && p.version !== "stored-profiles-v3") return p;
  if (!Array.isArray(p.tables) || !Array.isArray(p.allocationReleases) || !Array.isArray(p.allocationLimitations) ||
    !Array.isArray(p.valueFields) || !p.valueFields.length || p.valueFields.some(v => typeof v !== "string")) throw Error("invalid_profile_metadata");
  return { ...p, tables: p.tables.map(value => {
    const table = { ...object(value) }; if (!table.allocation) return table;
    if (table.cellCodec !== undefined) {
      if (p.version !== "stored-profiles-v3" || table.cellCodec !== "available-equal-contribution-v1" || !Array.isArray(table.values) ||
        table.values.some(v => !Array.isArray(v) || ![2, 3].includes(v.length) || !Number.isFinite(v[0]) || !(v[1] === null || Number.isFinite(v[1])) ||
          v.length === 3 && !(v[2] === null || typeof v[2] === "string"))) throw Error("invalid_profile_metadata");
      table.values = table.values.map(v => ["available", v[0], v[0], 0, v[1], v.length === 3 ? v[2] : null]);
    }
    const { releaseIndex, limitationsIndex, ...allocation } = object(table.allocation);
    if (!Number.isInteger(releaseIndex) || Number(releaseIndex) < 0 || Number(releaseIndex) >= (p.allocationReleases as unknown[]).length ||
      !Number.isInteger(limitationsIndex) || Number(limitationsIndex) < 0 || Number(limitationsIndex) >= (p.allocationLimitations as unknown[]).length) throw Error("invalid_profile_metadata");
    return { ...table, valueFields: p.valueFields, allocation: { ...allocation, releases: (p.allocationReleases as unknown[])[Number(releaseIndex)],
      limitations: (p.allocationLimitations as unknown[])[Number(limitationsIndex)] } };
  }) };
}

/** One supported descriptive focus, never an invented target market or a new
 * score transform. Complete profiles remain available outside the AI packet. */
export function profileFocus(catalog: Catalog, profiles: ReturnType<typeof storedProfiles>) {
  if (!("columnSets" in profiles)) return;
  const table = (expandedProfiles(profiles).tables as Record<string, unknown>[]).find(t => t.dataset === "TS007A" && t.seconds === 600 && t.state === "available");
  const base = catalog.facts.find(f => f.dataset.includes("TS007A") && /600|10.?min/i.test(f.scope));
  if (!table || !base || !Array.isArray(table.values) || !table.values.length) return;
  const bands = (table.values as unknown[][]).slice(1).map((cell, i) => ({ cell, ordinal: i + 2 }));
  if (bands.some(b => b.cell[0] !== "available" || typeof b.cell[1] !== "number")) return;
  const focus = bands.toSorted((a, b) => Number(b.cell[1]) - Number(a.cell[1]) || a.ordinal - b.ordinal)[0];
  if (!focus || Number(focus.cell[1]) <= 0) return;
  const column = profiles.columnSets?.TS007A?.find(c => c.ordinal === focus.ordinal);
  if (!column) return;
  const fact = { ...base, id: `profile-${packetDigest({ source: table.sourceSnapshotId, ordinal: focus.ordinal }).slice(0, 16)}`,
    dataset: `TS007A ${column.label}, 10 minute walking estimate`,
    value: Number(focus.cell[1]), units: `estimated residents; ${column.label}`, statistical: {
      profileOrdinal: focus.ordinal, profileDataset: "TS007A", referencePeriod: "2021-03-21", seconds: 600,
      method: "method" in table ? table.method : null, sourceSnapshotId: table.sourceSnapshotId, parentEvidenceId: base.evidenceId } };
  catalog.facts.push(fact);
  const atom = (role: Atom["role"], text: string, rule: string): Atom => ({ id: `a-${packetDigest({ text, fact: fact.id }).slice(0, 16)}`,
    section: "customer-context", role, text, factIds: [fact.id], rule });
  catalog.atoms.push(atom("reason", `Within the dated 10-minute modelled catchment, ${column.label} is one of the largest published age bands: ${fact.value} estimated residents. It is not measured custom.`, "dated-age-focus-v1"));
  const concept = catalog.business === "coffee-shop" ? "coffee menu and service occasions" : catalog.business === "restaurant" ? "restaurant offer and trading occasions" : "salon services and appointment patterns";
  catalog.atoms.push(atom("implication", `The ${column.label} segment provides a specific local profile to test against the proposed ${concept}. Its size does not establish purchasing power, preferences or customer conversion.`, "business-profile-hypothesis-v1"));
}

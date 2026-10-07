import { SourceError } from "./errors.ts";
import { object, text, uuid, reference } from "./validation.ts";

export type StatisticalDataset = "TS007A" | "TS003" | "TS045" | "TS066" | "income-AHC-FYE2023" | "BRES2024";
export type NativeStatistic = {
  schemaVersion: 2; releaseId: string; geographyReleaseId: string;
  geography: { type: "OA2021" | "LSOA2011" | "LSOA2021" | "MSOA2021"; code: string };
  measure: { dataset: StatisticalDataset; variable: string; unit: "persons" | "households" | "employee_jobs" | "GBP_household_year";
    universe: "usual_residents" | "households" | "residents_16_plus" | "employee_jobs" | "equivalised_household_income_AHC";
    aggregation: "additive_count" | "non_additive_mean"; referencePeriod: string };
  value: number | null; interval: { lower: number; upper: number; level: number } | null;
  state: "available" | "missing" | "suppressed" | "unavailable" | "not_applicable"; missingReason: string | null;
  quality: { sourceKind: "measured" | "modelled"; disclosureControl: string; roundingIncrement: number | null };
  lineage: { sourceReference: string; sourceRecord: string; methodVersion: string; parentIds: string[] };
};
const semantics = {
  TS007A: ["persons", "usual_residents", "additive_count", "measured"],
  TS003: ["households", "households", "additive_count", "measured"],
  TS045: ["households", "households", "additive_count", "measured"],
  TS066: ["persons", "residents_16_plus", "additive_count", "measured"],
  "income-AHC-FYE2023": ["GBP_household_year", "equivalised_household_income_AHC", "non_additive_mean", "modelled"],
  BRES2024: ["employee_jobs", "employee_jobs", "additive_count", "measured"],
} as const;
function demand(value: unknown): asserts value { if (!value) throw new SourceError("invalid_response"); }
function keys(value: Record<string, unknown>, names: string) {
  const expected = names.split(" "); demand(Object.keys(value).length === expected.length && expected.every(k => k in value));
}

/** Native scope only: neither income means nor employee jobs are catchment spending/footfall. */
export function validateNativeStatistic(value: unknown): NativeStatistic {
  const r = object(value), g = object(r.geography), m = object(r.measure), q = object(r.quality), l = object(r.lineage);
  keys(r, "schemaVersion releaseId geographyReleaseId geography measure value interval state missingReason quality lineage");
  keys(g, "type code"); keys(m, "dataset variable unit universe aggregation referencePeriod");
  keys(q, "sourceKind disclosureControl roundingIncrement"); keys(l, "sourceReference sourceRecord methodVersion parentIds");
  demand(r.schemaVersion === 2 && uuid(r.releaseId) && uuid(r.geographyReleaseId));
  demand(["OA2021", "LSOA2011", "LSOA2021", "MSOA2021"].includes(String(g.type)));
  demand(new RegExp(g.type === "OA2021" ? "^E00\\d{6}$" : g.type === "MSOA2021" ? "^E02\\d{6}$" : "^E01\\d{6}$").test(String(g.code)));
  demand(typeof m.dataset === "string" && Object.hasOwn(semantics, m.dataset));
  const policy = semantics[m.dataset as StatisticalDataset];
  demand(m.unit === policy[0] && m.universe === policy[1] && m.aggregation === policy[2] && q.sourceKind === policy[3]);
  demand(text(m.variable, 300) && text(m.referencePeriod, 20));
  if (m.dataset.startsWith("TS")) demand(g.type === "OA2021" && m.referencePeriod === "2021-03-21");
  if (m.dataset === "income-AHC-FYE2023") demand(g.type === "MSOA2021" && m.referencePeriod === "FYE2023");
  if (m.dataset === "BRES2024") demand(["LSOA2011", "LSOA2021"].includes(String(g.type)) && m.referencePeriod === "2024");
  demand(["available", "missing", "suppressed", "unavailable", "not_applicable"].includes(String(r.state)));
  if (r.state === "available") demand(typeof r.value === "number" && Number.isFinite(r.value) && r.value >= 0 && r.missingReason === null &&
    (m.aggregation === "non_additive_mean" || Number.isSafeInteger(r.value)));
  else demand(r.value === null && text(r.missingReason, 300) && r.interval === null);
  if (r.interval !== null) {
    const i = object(r.interval); keys(i, "lower upper level");
    demand(m.aggregation === "non_additive_mean" && r.state === "available" &&
      [i.lower, i.upper, i.level].every(v => typeof v === "number" && Number.isFinite(v)) &&
      Number(i.lower) >= 0 && Number(i.lower) <= Number(r.value) && Number(i.upper) >= Number(r.value) && Number(i.level) > 0 && Number(i.level) < 100);
  }
  demand(text(q.disclosureControl, 1000) && (q.roundingIncrement === null || typeof q.roundingIncrement === "number" && Number.isFinite(q.roundingIncrement) && q.roundingIncrement > 0));
  demand(reference(l.sourceReference) && text(l.sourceRecord, 300) && text(l.methodVersion, 100));
  demand(Array.isArray(l.parentIds) && l.parentIds.length <= 32 && l.parentIds.every(uuid) && new Set(l.parentIds).size === l.parentIds.length);
  return structuredClone(value) as NativeStatistic;
}

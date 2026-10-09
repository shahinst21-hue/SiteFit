import { csv, digest } from "./london-import.ts";
import { validateNativeStatistic, type NativeStatistic } from "../../lib/data/statistics.ts";
import bresColumns from "../../lib/data/bres-columns.json" with { type: "json" };
import { canonicalJSON } from "../../lib/analysis/canonical.ts";

export type NativeMembership = { oa: string; lsoa: string; msoa: string; lad: string };
const incomeUrl = "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/smallareaincomeestimatesformiddlelayersuperoutputareasenglandandwales";
const bresUrl = "https://www.nomisweb.co.uk/datasets/newbres6pub";
function invalid(): never { throw new Error("Native source admission failed; no release activation."); }
function row(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const r = value as Record<string, unknown>;
  if (Object.keys(r).length !== keys.length || keys.some(k => !(k in r))) invalid();
  return r;
}

/** Native identifiers only. No new polygons, vintage relabelling or geographic interpolation. */
export function nativeMemberships(value: unknown, frozenOas: ReadonlySet<string>): NativeMembership[] {
  if (!Array.isArray(value) || !value.length || value.length > 40000 || value.length !== frozenOas.size) invalid();
  const seen = new Set<string>(), lsoaParents = new Map<string, string>(), msoaParents = new Map<string, string>();
  const result = value.map(v => {
    const r = row(v, ["OA21CD", "LSOA21CD", "MSOA21CD", "LAD22CD"]);
    if (typeof r.OA21CD !== "string" || !/^E00\d{6}$/.test(r.OA21CD) || !frozenOas.has(r.OA21CD) || seen.has(r.OA21CD) ||
      typeof r.LSOA21CD !== "string" || !/^E01\d{6}$/.test(r.LSOA21CD) || typeof r.MSOA21CD !== "string" || !/^E02\d{6}$/.test(r.MSOA21CD) ||
      typeof r.LAD22CD !== "string" || !/^E09\d{6}$/.test(r.LAD22CD)) invalid();
    seen.add(r.OA21CD);
    if (lsoaParents.has(r.LSOA21CD) && lsoaParents.get(r.LSOA21CD) !== r.MSOA21CD ||
      msoaParents.has(r.MSOA21CD) && msoaParents.get(r.MSOA21CD) !== r.LAD22CD) invalid();
    lsoaParents.set(r.LSOA21CD, r.MSOA21CD); msoaParents.set(r.MSOA21CD, r.LAD22CD);
    return { oa: r.OA21CD, lsoa: r.LSOA21CD, msoa: r.MSOA21CD, lad: r.LAD22CD };
  });
  return result.sort((a, b) => a.oa.localeCompare(b.oa));
}

export function incomeProfiles(value: unknown, releaseId: string, geographyReleaseId: string, nativeMsoas: ReadonlySet<string>): NativeStatistic[] {
  if (!Array.isArray(value) || !value.length || value.length !== nativeMsoas.size || value.length > 2000) invalid();
  const seen = new Set<string>();
  return value.map(v => {
    const r = row(v, ["code", "mean", "upper", "lower", "intervalWidth", "ladCode"]);
    if (typeof r.code !== "string" || !nativeMsoas.has(r.code) || seen.has(r.code) ||
      typeof r.ladCode !== "string" || !/^E09\d{6}$/.test(r.ladCode) ||
      [r.mean, r.upper, r.lower, r.intervalWidth].some(n => typeof n !== "number" || !Number.isFinite(n) || n < 0) ||
      Number(r.upper) - Number(r.lower) !== r.intervalWidth) invalid();
    seen.add(r.code);
    return validateNativeStatistic({ schemaVersion: 2, releaseId, geographyReleaseId, geography: { type: "MSOA2021", code: r.code },
      measure: { dataset: "income-AHC-FYE2023", variable: "Disposable net annual household income after housing costs, equivalised",
        unit: "GBP_household_year", universe: "equivalised_household_income_AHC", aggregation: "non_additive_mean", referencePeriod: "FYE2023" },
      value: r.mean, interval: { lower: r.lower, upper: r.upper, level: 95 }, state: "available", missingReason: null,
      quality: { sourceKind: "modelled", disclosureControl: "ONS model-based MSOA estimate and published 95% confidence interval; not a spending estimate.", roundingIncrement: null },
      lineage: { sourceReference: incomeUrl, sourceRecord: r.code, methodVersion: "ons-fye2023-AHC-native1", parentIds: [geographyReleaseId] } });
  }).sort((a, b) => a.geography.code.localeCompare(b.geography.code));
}

export function bresProfiles(contents: string, releaseId: string, geographyReleaseId: string, nativeLsoas: ReadonlySet<string>): NativeStatistic[] {
  if (contents.length > 5000000 || !nativeLsoas.size || nativeLsoas.size > 10000) invalid();
  const rows = csv(contents.replace(/^\uFEFF/, "")), headers = rows.shift();
  if (!headers || JSON.stringify(headers) !== JSON.stringify(bresColumns.columns)) invalid();
  const required = ["DATE", "GEOGRAPHY_CODE", "GEOGRAPHY_TYPECODE", "INDUSTRY", "EMPLOYMENT_STATUS", "MEASURE", "MEASURES", "OBS_VALUE", "OBS_STATUS", "OBS_CONF", "URN"];
  if (required.some(k => !headers.includes(k)) || rows.length !== nativeLsoas.size) invalid();
  const seen = new Set<string>();
  return rows.map(values => {
    if (values.length !== headers.length) invalid();
    const r = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    if (r.DATE !== "2024" || r.GEOGRAPHY_TYPECODE !== "151" || r.INDUSTRY !== "37748736" || r.EMPLOYMENT_STATUS !== "1" ||
      r.MEASURE !== "1" || r.MEASURES !== "20100" || r.OBS_STATUS !== "T" || r.OBS_CONF !== "F" ||
      !nativeLsoas.has(r.GEOGRAPHY_CODE) || seen.has(r.GEOGRAPHY_CODE) || !/^\d+$/.test(r.OBS_VALUE) || !Number.isSafeInteger(Number(r.OBS_VALUE))) invalid();
    seen.add(r.GEOGRAPHY_CODE);
    return validateNativeStatistic({ schemaVersion: 2, releaseId, geographyReleaseId, geography: { type: "LSOA2021", code: r.GEOGRAPHY_CODE },
      measure: { dataset: "BRES2024", variable: "Total employees, excluding farm agriculture SIC subclass 01000", unit: "employee_jobs",
        universe: "employee_jobs", aggregation: "additive_count", referencePeriod: "2024" }, value: Number(r.OBS_VALUE), interval: null,
      state: "available", missingReason: null,
      quality: { sourceKind: "measured", disclosureControl: "Nomis OBS_STATUS=T (farm agriculture excluded); OBS_CONF=F (free publication); provisional 2024 rounded public counts. Specific cell rounding increment unavailable; zero is a published rounded value.", roundingIncrement: null },
      lineage: { sourceReference: bresUrl, sourceRecord: r.URN, methodVersion: "nomis-NM1891-employees2024-native1", parentIds: [geographyReleaseId] } });
  }).sort((a, b) => a.geography.code.localeCompare(b.geography.code));
}

// Database JSON key order cannot change the content checksum; generated release
// identity is a binding, not part of the source-content address.
export const nativeProfilesDigest = (profiles: readonly NativeStatistic[]) => digest(canonicalJSON(profiles.map(p => {
  const { releaseId: _releaseId, ...content } = p;
  void _releaseId;
  return content;
})));

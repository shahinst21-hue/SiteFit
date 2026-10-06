import type { Category } from "../data/contracts.ts";

export const scoringVersions = Object.freeze({ scoring: "dimension-v1", weights: "business-hypothesis-v1", comparison: "same-authority-oa-v1", normalisation: "percentile-midrank-v1" });
export type Dimension = "customer-base" | "market-position" | "customer-access" | "premises";
export type EvidenceStrength = "insufficient" | "limited" | "sufficient";
const components = {
  "customer-base": ["residential", "daytime-workplace", "purchasing-power", "customer-fit", "time-specific-transport"],
  "market-position": ["direct-competition", "complementary-trade", "cluster-context", "differentiation"],
  "customer-access": ["walking-reach", "service-hours", "useful-journeys", "travel-fit"],
  premises: ["permitted-use", "physical-fit", "planning-environment-licences", "lease-rates-history"],
} as const;
export type ComponentId = (typeof components)[Dimension][number];
const weights: Record<Dimension, Record<Category, readonly number[]>> = {
  "customer-base": { "coffee-shop": [25, 30, 15, 20, 10], restaurant: [25, 20, 25, 20, 10], "hair-beauty-salon": [40, 10, 20, 25, 5] },
  "market-position": { "coffee-shop": [35, 20, 25, 20], restaurant: [30, 25, 25, 20], "hair-beauty-salon": [40, 15, 15, 30] },
  "customer-access": { "coffee-shop": [30, 30, 25, 15], restaurant: [25, 25, 25, 25], "hair-beauty-salon": [35, 15, 20, 30] },
  premises: { "coffee-shop": [40, 25, 20, 15], restaurant: [40, 30, 20, 10], "hair-beauty-salon": [40, 20, 20, 20] },
};
export function weightManifest(dimension: Dimension, category: Category) {
  return { dimension, category, version: scoringVersions.weights, basis: "initial product hypothesis; future calibration required" as const,
    components: components[dimension].map((id, index) => ({ id, weight: weights[dimension][category][index], required: true as const })) };
}

export type Cohort = {
  definition: string; releaseId: string; effectiveAt: string; units: string; geographyUnit: string;
  authorityCode: string; eligibleCount: number; members: { id: string; value: number }[];
};
export type Ranking = { value: number | null; reason: string | null; cohort: Cohort; target: number; version: string; less: number; equal: number };
/** Descriptive position in a fixed distribution, not a commercial attractiveness score. */
export function percentileMidrank(target: number, cohort: Cohort): Ranking {
  let reason: string | null = null;
  const ids = new Set(cohort.members.map(row => row.id));
  if (!Number.isFinite(target) || target < 0 || cohort.members.some(row => !Number.isFinite(row.value) || row.value < 0)) reason = "invalid_values";
  else if (!cohort.definition || !cohort.releaseId || !cohort.authorityCode || !cohort.units || !cohort.geographyUnit || !Number.isFinite(Date.parse(cohort.effectiveAt))) reason = "undefined_comparator";
  else if (ids.size !== cohort.members.length || cohort.members.some(row => !row.id)) reason = "invalid_membership";
  else if (cohort.members.length < 30) reason = "cohort_too_small";
  else if (!Number.isInteger(cohort.eligibleCount) || cohort.eligibleCount < cohort.members.length || cohort.members.length / cohort.eligibleCount < 0.9) reason = "insufficient_coverage";
  else if (new Set(cohort.members.map(row => row.value)).size < 2) reason = "no_distribution_variation";
  const less = cohort.members.filter(row => row.value < target).length;
  const equal = cohort.members.filter(row => row.value === target).length;
  // Copy membership so later caller mutation cannot rewrite the stored calculation operands.
  return { value: reason ? null : (less + equal / 2) / cohort.members.length * 100, reason,
    cohort: { ...cohort, members: cohort.members.map(row => ({ ...row })) }, target,
    version: scoringVersions.normalisation, less, equal };
}

export type Subscore = {
  id: ComponentId; value: number | null; evidenceIds: string[]; coverage: number;
  precisionFits: boolean; comparisonValid: boolean; directionReviewed: boolean;
  metricVersion: string; normalisationVersion: string; comparisonVersion: string;
};
export function composeDimension(dimension: Dimension, category: Category, supplied: readonly Subscore[]) {
  const manifest = weightManifest(dimension, category);
  const reasons: string[] = [];
  const accepted = new Map<ComponentId, Subscore>();
  for (const item of supplied) {
    if (!manifest.components.some(component => component.id === item.id)) reasons.push(`unexpected_component:${item.id}`);
    if (accepted.has(item.id)) reasons.push(`duplicate_component:${item.id}`);
    accepted.set(item.id, item);
  }
  for (const { id } of manifest.components) {
    const item = accepted.get(id);
    if (!item || item.value === null) { reasons.push(`missing_component:${id}`); continue; }
    if (!Number.isFinite(item.value) || item.value < 0 || item.value > 100) reasons.push(`invalid_subscore:${id}`);
    if (!Number.isFinite(item.coverage) || item.coverage < 0.9 || item.coverage > 1) reasons.push(`insufficient_coverage:${id}`);
    if (!item.precisionFits) reasons.push(`insufficient_precision:${id}`);
    if (!item.comparisonValid) reasons.push(`invalid_comparison:${id}`);
    if (!item.directionReviewed) reasons.push(`unreviewed_direction:${id}`);
    if (!item.metricVersion || !item.normalisationVersion || !item.comparisonVersion) reasons.push(`missing_version:${id}`);
    if (!item.evidenceIds.length || item.evidenceIds.some(id => !id)) reasons.push(`missing_evidence:${id}`);
  }
  const value = reasons.length ? null : Math.round(manifest.components.reduce((sum, component) => sum + accepted.get(component.id)!.value! * component.weight, 0) / 100);
  return { dimension, value, reasons, manifest, versions: { ...scoringVersions },
    components: supplied.map(item => ({ ...item, evidenceIds: [...item.evidenceIds] })),
    evidenceIds: [...new Set(supplied.flatMap(item => item.evidenceIds))] };
}

export function evidenceStrength(input: { present: boolean; valid: boolean; partial: boolean; datedForClaim: boolean; approximateForClaim: boolean; comparatorWeak: boolean; materialGap: boolean }): { strength: EvidenceStrength; reasons: string[] } {
  if (!input.present || !input.valid) return { strength: "insufficient", reasons: [!input.present ? "required_support_missing" : "invalid_support"] };
  const reasons = (["partial", "datedForClaim", "approximateForClaim", "comparatorWeak", "materialGap"] as const).filter(key => input[key]);
  return { strength: reasons.length ? "limited" : "sufficient", reasons };
}

export function residentDensity(count: number | null, areaSquareMetres: number | null): number | null {
  if (count === null || areaSquareMetres === null || !Number.isInteger(count) || count < 0 || !Number.isFinite(areaSquareMetres) || areaSquareMetres <= 0) return null;
  const density = count / areaSquareMetres * 1_000_000;
  return Number.isFinite(density) ? density : null;
}

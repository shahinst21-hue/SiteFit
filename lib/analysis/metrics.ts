import type { CollectionContext, StoredSnapshot } from "../data/contracts.ts";
import { residentDensity, percentileMidrank, type Cohort } from "./scoring.ts";

export const metricRegistry = Object.freeze({
  "residential-density": { version: "census-oa-density-v1", units: "usual residents per square kilometre",
    source: "ons-population", scope: "whole Census output area", normalisation: "percentile-midrank-v1",
    interpretation: "descriptive residential context", prohibited: ["current demand", "footfall", "customers", "commercial peers", "success probability"],
    precision: "unambiguous Census area around supplied point", comparator: "same authority, release, vintage and geographic unit",
    minimumPeers: 30, minimumCoverage: 0.9 },
  "transport-records": { version: "tfl-observed-records-v1", units: "observed stop records", source: "tfl-stop-points",
    scope: "provider lookup around approximate supplied point", normalisation: null,
    interpretation: "observed transport context", prohibited: ["walking time", "frequency", "trading-hour fit", "full catchment", "access rank"] },
  "food-register-records": { version: "fsa-observed-records-v1", units: "observed food registration records", source: "fsa-establishments",
    scope: "bounded provider search around approximate supplied point", normalisation: null,
    interpretation: "partial food-register context", prohibited: ["exhaustive competitors", "saturation", "category attractiveness", "salon inventory"] },
});

export type ResidentialComparison = { targetCode: string; targetCount: number | null; targetAreaSquareMetres: number;
  authorityCode: string; eligibleCount: number; members: { id: string; value: number; count: number; areaSquareMetres: number }[];
  effectiveAt: string; populationReleaseId: string; geographyReleaseId: string; definition: string; units: string; geographyUnit: string };
export function validateComparison(value: unknown): ResidentialComparison {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_comparison");
  const row = value as ResidentialComparison;
  if (!/^E00\d{6}$/.test(row.targetCode) || !/^E09\d{6}$/.test(row.authorityCode) || !Number.isInteger(row.eligibleCount) || row.eligibleCount < 0 ||
    residentDensity(row.targetCount, row.targetAreaSquareMetres) === null && row.targetCount !== null ||
    !Number.isFinite(row.targetAreaSquareMetres) || row.targetAreaSquareMetres <= 0 || !Number.isFinite(Date.parse(row.effectiveAt)) ||
    !row.populationReleaseId || !row.geographyReleaseId || row.units !== metricRegistry["residential-density"].units || row.geographyUnit !== "OA2021" ||
    typeof row.definition !== "string" || !row.definition || !Array.isArray(row.members) || row.members.length > 5000 || row.members.length > row.eligibleCount) throw new Error("invalid_comparison");
  const ids = new Set<string>();
  for (const member of row.members) {
    const expected = residentDensity(member.count, member.areaSquareMetres);
    if (!/^E00\d{6}$/.test(member.id) || member.id === row.targetCode || ids.has(member.id) || expected === null ||
      !Number.isFinite(member.value) || Math.abs(expected - member.value) > Math.max(1e-8, expected * 1e-10)) throw new Error("invalid_comparison_operands");
    ids.add(member.id);
  }
  return structuredClone(row);
}

export function residentialMetric(context: CollectionContext, snapshot: StoredSnapshot, comparison: ResidentialComparison | null) {
  const descriptor = metricRegistry["residential-density"];
  const reasons: string[] = [];
  const payload = snapshot.result.payload;
  if (snapshot.analysisId !== context.analysisId || snapshot.inputId !== context.inputId || snapshot.result.meta.source !== "ons-population") throw new Error("invalid_metric_binding");
  if (!context.region.eligible || !context.geography || context.geography.ambiguous || !context.selectedProperty.point) reasons.push("geography_not_resolved");
  if (!payload || payload.kind !== "area_population" || payload.count === null) reasons.push("population_unavailable");
  if (!comparison) reasons.push("comparator_unavailable");
  if (comparison && payload?.kind === "area_population" && (comparison.targetCode !== payload.geographyCode || comparison.targetCount !== payload.count ||
    comparison.populationReleaseId !== context.releases.population || comparison.geographyReleaseId !== context.releases.geography ||
    payload.releaseId !== comparison.populationReleaseId || payload.geographyReleaseId !== comparison.geographyReleaseId ||
    Date.parse(payload.effectiveAt) !== Date.parse(comparison.effectiveAt))) throw new Error("comparison_lineage_mismatch");
  const density = reasons.length || !comparison ? null : residentDensity(comparison.targetCount, comparison.targetAreaSquareMetres);
  const cohort: Cohort | null = comparison ? { definition: comparison.definition, releaseId: comparison.populationReleaseId,
    effectiveAt: comparison.effectiveAt, units: comparison.units, geographyUnit: comparison.geographyUnit, authorityCode: comparison.authorityCode,
    eligibleCount: comparison.eligibleCount, members: comparison.members.map(member => ({ id: member.id, value: member.value })) } : null;
  const ranking = density === null || !cohort ? null : percentileMidrank(density, cohort);
  return { id: "residential-density" as const, version: descriptor.version, sourceSnapshotId: snapshot.id,
    density, units: descriptor.units, ranking, reasons: [...reasons, ...(ranking?.reason ? [ranking.reason] : [])],
    operands: comparison ? structuredClone(comparison) : null,
    limitations: ["Census 2021 usual residents, not current customers or demand", "Whole-area density masks variation within the area",
      ...(context.selectedProperty.point?.precision === "postcode_centroid" ? ["Area assigned from approximate postcode centroid, not the premises"] : [])],
    interpretation: descriptor.interpretation, prohibited: [...descriptor.prohibited] };
}

export function observedContextMetrics(context: CollectionContext, snapshots: readonly StoredSnapshot[]) {
  return snapshots.flatMap(snapshot => {
    if (snapshot.analysisId !== context.analysisId || snapshot.inputId !== context.inputId) throw new Error("invalid_metric_binding");
    const result = snapshot.result;
    if (!result.payload) return [];
    if (result.payload.kind === "transport_access_points") return [{ id: "transport-records", value: result.payload.items.length,
      complete: result.payload.complete, snapshotId: snapshot.id, version: metricRegistry["transport-records"].version, units: metricRegistry["transport-records"].units }];
    if (result.payload.kind === "food_establishments") {
      if (context.category === "hair-beauty-salon") throw new Error("food_register_not_salon_evidence");
      return [{ id: "food-register-records", value: result.payload.items.length, complete: result.payload.complete,
        snapshotId: snapshot.id, version: metricRegistry["food-register-records"].version, units: metricRegistry["food-register-records"].units }];
    }
    return [];
  });
}

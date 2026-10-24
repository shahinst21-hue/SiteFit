import { object, uuid } from "../data/validation.ts";

export type CatchmentReleaseBindings = {
  geographyReleaseId: string; nativeReleaseId: string; censusReleaseId: string;
  incomeReleaseId: string; bresReleaseId: string;
};
function requireOperand(condition: unknown): asserts condition {
  if (!condition) throw new Error("invalid_catchment_operands");
}
const nonnegative = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-7, Math.abs(b) * 1e-8);

/** Reproducible allocation diagnostics, not a confidence interval, score or
 * comparison with whole-area cohorts. The caller supplies the admitted native
 * column count and release vector; neither can be inferred from a UI slot. */
export function catchmentAllocationOperands(value: unknown, releases: CatchmentReleaseBindings, columns: number) {
  const r = object(value);
  requireOperand(Number.isSafeInteger(columns) && columns > 0 && columns <= 200);
  for (const key of ["geographyReleaseId", "nativeReleaseId", "censusReleaseId", "incomeReleaseId", "bresReleaseId"] as const) {
    const id = releases[key]; requireOperand(uuid(id) && r[key] === id);
  }
  const version4 = r.schemaVersion === 4 && r.methodVersion === "area-uniform-bng4";
  const version3 = r.schemaVersion === 3 && r.methodVersion === "area-uniform-bng3" || version4;
  const version2 = r.schemaVersion === 2 && r.methodVersion === "area-uniform-bng2" || version3;
  requireOperand((r.schemaVersion === 1 && r.methodVersion === "area-uniform-bng1" || version2) &&
    r.allocation === "uniform_within_native_area_estimate" && nonnegative(r.catchmentAreaM2) && r.catchmentAreaM2 > 0 &&
    nonnegative(r.londonCoveredAreaM2) && r.londonCoveredAreaM2 <= r.catchmentAreaM2 * (1 + 1e-8) &&
    nonnegative(r.londonCoverageFraction) && r.londonCoverageFraction <= 1 &&
    close(r.londonCoverageFraction, r.londonCoveredAreaM2 / r.catchmentAreaM2));
  requireOperand(Array.isArray(r.oaOperands) && r.oaOperands.length <= 26369 &&
    Array.isArray(r.censusEstimates) && r.censusEstimates.length === columns);
  const diagnostics = Array.from({ length: columns }, (_, i) => ({ columnOrdinal: i + 1,
    fullyIncludedCount: 0, partiallyAllocatedCount: 0, intersectingAreaUpperEnvelope: 0,
    knownContribution: 0, missingAreaM2: 0 }));
  const ids = new Set<string>();
  let area = 0;
  for (const item of r.oaOperands) {
    const o = object(item);
    requireOperand(typeof o.code === "string" && /^E00\d{6}$/.test(o.code) && !ids.has(o.code));
    ids.add(o.code);
    requireOperand(nonnegative(o.intersectionAreaM2) && o.intersectionAreaM2 > 0 &&
      nonnegative(o.nativeAreaM2) && o.nativeAreaM2 > 0 && o.intersectionAreaM2 <= o.nativeAreaM2 * (1 + 1e-8) &&
      nonnegative(o.allocationFraction) && o.allocationFraction > 0 && o.allocationFraction <= 1 &&
      close(o.allocationFraction, Math.min(1, o.intersectionAreaM2 / o.nativeAreaM2)) &&
      Array.isArray(o.values) && o.values.length === columns && Array.isArray(o.missingReasons) && o.missingReasons.length === columns);
    area += o.intersectionAreaM2;
    const fraction = o.allocationFraction;
    for (let i = 0; i < columns; i++) {
      const v: unknown = o.values[i], reason: unknown = o.missingReasons[i], d = diagnostics[i];
      if (v === null) {
        requireOperand(typeof reason === "string" && reason.length > 0 && reason.length <= 300);
        d.missingAreaM2 += o.intersectionAreaM2;
      } else {
        requireOperand(nonnegative(v) && Number.isSafeInteger(v) && reason === null);
        d.intersectingAreaUpperEnvelope += v;
        d.knownContribution += v * fraction;
        if (close(fraction, 1)) d.fullyIncludedCount += v;
        else d.partiallyAllocatedCount += v * fraction;
      }
    }
  }
  if (version2) requireOperand(nonnegative(r.allocationCoveredAreaM2) && close(area, r.allocationCoveredAreaM2) &&
    typeof r.boundaryResidualAreaM2 === "number" && Number.isFinite(r.boundaryResidualAreaM2) &&
    close(r.boundaryResidualAreaM2, area - r.londonCoveredAreaM2));
  else requireOperand(close(area, r.londonCoveredAreaM2));
  // BNG overlay/union operations need an AREA tolerance, independently of
  // the strict operand reproduction tolerance above. Both the absolute cap
  // (0.1 m²) and relative cap (one part in ten million) must be satisfied.
  // Keep the signed residual; never redistribute population or mask missing OAs.
  const overlayToleranceM2 = Math.max(1e-7, Math.min(0.1, (r.londonCoveredAreaM2 as number) * 1e-7));
  let boundaryMismatch = version2 && Math.abs(area - (r.londonCoveredAreaM2 as number)) > overlayToleranceM2;
  if (version4) {
    const partition = object(r.allocationCoverage);
    requireOperand(Object.keys(partition).length === 6 && partition.version === 'ons-oa-partition-bng-v1' &&
      partition.geographyReleaseId === releases.geographyReleaseId && partition.boundaryToleranceMetres === 0.001 &&
      nonnegative(partition.unionAreaM2) && partition.unionAreaM2 <= r.catchmentAreaM2 * (1 + 1e-8) &&
      nonnegative(partition.regionalGapAreaM2) && partition.regionalGapAreaM2 <= r.londonCoveredAreaM2 &&
      nonnegative(partition.unexplainedGapAreaM2) && partition.unexplainedGapAreaM2 <= partition.regionalGapAreaM2);
    // Compare the allocation sum with the independent union of ALL official OA
    // intersections, not a differently tessellated region coastline. Missing
    // memberships/overlaps still fail. Only coverage diagnostics use the explicit
    // 1 mm source-boundary strip; allocation/catchment/provider polygons never do.
    boundaryMismatch = Math.abs(area - partition.unionAreaM2) > overlayToleranceM2 || partition.unexplainedGapAreaM2 > overlayToleranceM2;
  }
  let outsideCoverage = (r.londonCoverageFraction as number) < 1 - 1e-8;
  if (version3) {
    const extent = object(r.coverageExtent);
    requireOperand(Object.keys(extent).length === 4 && extent.version === 'ons-london-bfe-2021-v1' &&
      extent.sha256 === '955fbae44301c2191d0c20f1fdfefb53c07a953a19b484f99003b0f15cd135cd' &&
      nonnegative(extent.outsideAreaM2) && extent.outsideAreaM2 <= r.catchmentAreaM2 &&
      nonnegative(extent.clippedGapAreaM2) && close(extent.clippedGapAreaM2, Math.max(0, r.catchmentAreaM2 - r.londonCoveredAreaM2)));
    // This certificate is computed from the exact polygon by the private SQL
    // source adapter. Never infer administrative coverage from a percentage.
    outsideCoverage = extent.outsideAreaM2 > Math.max(1e-7, Math.min(0.1, r.catchmentAreaM2 * 1e-7));
  }
  const metrics = diagnostics.map((d, i) => {
    const published = object((r.censusEstimates as unknown[])[i]);
    requireOperand(published.columnOrdinal === d.columnOrdinal && nonnegative(published.knownContribution) &&
      nonnegative(published.missingAreaM2) && close(published.knownContribution, d.knownContribution) &&
      close(published.missingAreaM2, d.missingAreaM2) && published.state === (d.missingAreaM2 > 0 ? "partial" : "available"));
    return { ...d, state: boundaryMismatch || d.missingAreaM2 > 0 || outsideCoverage ? "partial" as const : "available" as const,
      partialAllocationShare: d.knownContribution === 0 ? null : d.partiallyAllocatedCount / d.knownContribution,
      upperEnvelopeScope: "known_intersecting_native_areas_only" as const };
  });
  return { methodVersion: version4 ? "area-uniform-bng4" : version3 ? "area-uniform-bng3" : version2 ? "area-uniform-bng2" : "area-uniform-bng1", releases: structuredClone(releases), metrics,
    boundaryResidualAreaM2: version2 ? r.boundaryResidualAreaM2 as number : null,
    allocationCoveredAreaM2: version2 ? r.allocationCoveredAreaM2 as number : null,
    londonCoverageFraction: r.londonCoverageFraction as number, comparator: null, score: null,
    limitations: ["Uniform area allocation is an estimate, not a measured walking population.",
      "Fully included and partially allocated counts are sensitivity diagnostics, not a statistical confidence interval.",
      ...(boundaryMismatch ? ["OA allocation footprint differs from the London region boundary; signed area residual is retained and this estimate is partial."] : []),
      "The upper envelope excludes missing and outside-London data; absence is not zero.",
      "Coverage describes the frozen source footprint; omitted water or other footprint gaps are not automatically outside-London locations."] };
}

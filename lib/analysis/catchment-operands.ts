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
  requireOperand(r.schemaVersion === 1 && r.methodVersion === "area-uniform-bng1" &&
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
  requireOperand(close(area, r.londonCoveredAreaM2));
  const metrics = diagnostics.map((d, i) => {
    const published = object((r.censusEstimates as unknown[])[i]);
    requireOperand(published.columnOrdinal === d.columnOrdinal && nonnegative(published.knownContribution) &&
      nonnegative(published.missingAreaM2) && close(published.knownContribution, d.knownContribution) &&
      close(published.missingAreaM2, d.missingAreaM2) && published.state === (d.missingAreaM2 > 0 ? "partial" : "available"));
    return { ...d, state: d.missingAreaM2 > 0 || (r.londonCoverageFraction as number) < 1 - 1e-8 ? "partial" as const : "available" as const,
      partialAllocationShare: d.knownContribution === 0 ? null : d.partiallyAllocatedCount / d.knownContribution,
      upperEnvelopeScope: "known_intersecting_native_areas_only" as const };
  });
  return { methodVersion: "area-uniform-bng1", releases: structuredClone(releases), metrics,
    londonCoverageFraction: r.londonCoverageFraction as number, comparator: null, score: null,
    limitations: ["Uniform area allocation is an estimate, not a measured walking population.",
      "Fully included and partially allocated counts are sensitivity diagnostics, not a statistical confidence interval.",
      "The upper envelope excludes missing and outside-London data; absence is not zero."] };
}

import "server-only";
import { object, uuid, validateResult, validateContext } from "../data/validation.ts";
import type { CollectionContext } from "../data/contracts.ts";
import type { AssessmentBundle } from "../analysis/assessment.ts";
import { packetDigest } from "../analysis/canonical.ts";
import { rentalReportProjection } from "../economics/rent.ts";
import { validateEconomicBundle, type EconomicBundle } from "../economics/bundle.ts";
import { commercialComparableTypes } from "../economics/rental-comparables.ts";

/** Frozen Phase 8 candidates -> approved Phase 10 qualified context, for NEW
 * Full preparations only. Neither the Phase 11 admission nor the source changes. */
export function storedRentalSupplements(input: CollectionContext, assessment: AssessmentBundle, rows: unknown[], at: Date): EconomicBundle[] {
  const context = validateContext(input);
  if (rows.length > 3 || assessment.contextDigest !== packetDigest(context)) throw Error("rental_source_bounds");
  const bundles: EconomicBundle[] = [], seen = new Set<string>();
  for (const raw of rows) {
    const row = object(raw), result = validateResult({ ...object(row.provider_metadata), payload: row.normalised_data });
    if (!uuid(row.id) || seen.has(row.id) || row.analysis_id !== context.analysisId || row.input_id !== context.inputId ||
      result.meta.source !== "propertydata-rent") throw Error("rental_source_binding_invalid");
    seen.add(row.id);
    if (!result.payload) continue;
    if (result.payload.kind !== "property_fact" || result.payload.operation !== "rents-commercial" ||
      !result.meta.checksum || packetDigest({ payload: result.payload, observations: result.observations }) !== result.meta.checksum ||
      !assessment.sourceBindings.some(b => b.snapshotId === row.id && b.checksum === result.meta.checksum) ||
      !context.enrichment || result.payload.binding.uprn !== context.enrichment.identity.uprn ||
      result.payload.binding.osReleaseId !== context.enrichment.releases.osReleaseId ||
      packetDigest(result.payload.binding.point) !== packetDigest(context.enrichment.identity.point)) throw Error("rental_source_binding_invalid");
    const permit = result.meta.licence, retrieved = result.payload.facts.retrievedAt;
    if ([permit.normalised, permit.references, permit.timestamps].some(p => !p.allowed ||
      p.maxDays !== null && Date.parse(retrieved) + p.maxDays * 86400000 <= at.getTime())) continue;
    const benchmark = result.payload.facts;
    if (!commercialComparableTypes(context.businessType).includes(benchmark.type) || benchmark.pointsAnalysed <= 0 || benchmark.poundsPerSqftYear <= 0) continue;
    if (assessment.supplements.some(s => s.kind === "rental" && s.bundle.sourceBindings.some(b => b.snapshotId === row.id))) continue;
    bundles.push(validateEconomicBundle({ schemaVersion: 1, kind: "rental_evidence", analysisId: context.analysisId,
      inputId: context.inputId, propertyId: context.selectedProperty.id, business: context.businessType,
      contextDigest: packetDigest(context), runId: row.id, parentRunId: null, generatedAt: at.toISOString(),
      sourceBindings: [{ snapshotId: row.id, checksum: result.meta.checksum }],
      result: rentalReportProjection(context.selectedProperty.id, benchmark, null) }));
  }
  return bundles;
}

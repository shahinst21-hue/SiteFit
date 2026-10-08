import "server-only";
import type { CollectionContext, StoredSnapshot } from "../data/contracts.ts";
import type { Evidence } from "./evidence.ts";
import { enrichedEvidence } from "./enriched-evidence.ts";
import { enrichedSpatialProjection } from "./enriched-spatial-projection.ts";
import { freeProjection, validateFreeProjection } from "./projection.ts";

export function enrichedProjection(context: CollectionContext, sections: Parameters<typeof freeProjection>[1], early: Parameters<typeof freeProjection>[2],
  evidence: readonly Evidence[], snapshots: readonly StoredSnapshot[], residential: Parameters<typeof freeProjection>[4], generatedAt: string) {
  enrichedEvidence(context, snapshots, new Date(generatedAt));
  const projection = freeProjection(context, sections, early, evidence.filter(e => e.schemaVersion === 1), residential, generatedAt);
  for (const d of projection.dimensions) {
    const scoped = evidence.filter(e => e.schemaVersion === 2 && e.sections.includes(d.id));
    const observations = scoped.filter(e => e.quality.available && (typeof e.value === "number" || e.source.dataset === "point-rivers-sea"))
      .sort((a,b) => Number(b.kind === "derived") - Number(a.kind === "derived")).slice(0,8);
    d.why.observations = observations.map(e => ({label: e.source.dataset, value: e.value, units: e.units, effectiveAt: e.effectiveAt, scope: e.scope,
      sourceType: e.kind === "modelled" || e.kind === "derived" && e.schemaVersion === 2 && e.geography.statistical.estimated ? "modelled" : e.kind === "ai_inference" ? "inferred" : e.sourceClass === "official_public" ? "official" : "observed"}));
    const sources = [...new Map(scoped.map(e => [`${e.source.provider}:${e.source.dataset}:${e.source.reference}`,e])).values()].slice(0,8);
    d.why.sources = sources.map(e => ({provider: e.source.provider, dataset: e.source.dataset,
      url: /^https:\/\//.test(e.source.reference) ? e.source.reference : null, retrievedAt: e.retrievedAt, notices: e.licence.notices}));
  }
  return validateFreeProjection({...projection, schemaVersion: 3,
    property: {...projection.property, precision: context.enrichment?.identity.point?.precision ?? projection.property.precision},
    spatial: enrichedSpatialProjection(context,snapshots)});
}

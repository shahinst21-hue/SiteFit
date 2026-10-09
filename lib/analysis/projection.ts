import { validateEnrichedSpatialProjection, type EnrichedSpatialProjection } from "./enriched-spatial-projection.ts";
import type { CollectionContext } from "../data/contracts.ts";
import type { interpretSections, synthesiseSections } from "./section-engine.ts";
import type { Evidence } from "./evidence.ts";
import type { Dimension, EvidenceStrength } from "./scoring.ts";
import type { residentialMetric } from "./metrics.ts";
type Sections = Awaited<ReturnType<typeof interpretSections>>["sections"];
type EarlyView = Awaited<ReturnType<typeof synthesiseSections>>;
export type LegacyFreeProjection = { schemaVersion: 2; analysisId: string; generatedAt: string;
  property: { address: string; resolution: string; precision: string }; businessType: string;
  earlyView: { headline: string; reason: string; meaning: string; strength: EvidenceStrength; keyQuestions: string[]; coverage: string };
  dimensions: { id: Dimension; title: string; conclusion: string; reason: string; strength: EvidenceStrength; meaning: string;
    score: number | null; scoreNote: string; question: string; implication: string;
    why: { support: string[]; opposition: string[]; alternatives: string[]; unknowns: string[];
      observations: { label: string; value: number | string | null; units: string | null; effectiveAt: string | null; scope: string;
        sourceType?: "official" | "observed" | "modelled" | "inferred" }[];
      comparison: { description: string; density: number | null; units: string; percentile: number | null; peers: number | null; limitations: string[] } | null;
      sources: { provider: string; dataset: string; url: string | null; retrievedAt: string | null; notices: string[] }[] } }[] };
export type EnrichedFreeProjection = Omit<LegacyFreeProjection, "schemaVersion"> & {schemaVersion: 3; spatial: EnrichedSpatialProjection};
export type FreeProjection = LegacyFreeProjection | EnrichedFreeProjection;
const labels: Record<Dimension, string> = { "customer-base": "Customer Base", "market-position": "Market Position", "customer-access": "Customer Access", premises: "Premises" };
const suppression: Record<Dimension, string> = {
  "customer-base": "Score needs current daytime demand, purchasing power and customer-fit evidence.",
  "market-position": "Score needs a relevant competition inventory, complementary trade and offer comparison.",
  "customer-access": "Score needs walking routes, useful journeys and service timing.",
  premises: "Score needs verified permitted use, physical fit, constraints and lease context.",
};
function sourceUrl(value: string): string | null {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash ? url.href : null; } catch { return null; }
}
export function freeProjection(context: CollectionContext, sections: Sections, early: EarlyView, evidence: readonly Evidence[], residential: ReturnType<typeof residentialMetric> | null, generatedAt: string): LegacyFreeProjection {
  if (sections.length !== 4) throw new Error("incomplete_projection");
  return { schemaVersion: 2, analysisId: context.analysisId, generatedAt,
    property: { address: context.selectedProperty.formattedAddress, resolution: context.selectedProperty.resolution, precision: context.selectedProperty.point?.precision ?? "unknown" }, businessType: context.businessType,
    earlyView: { headline: early.headline, reason: sections.find(section => section.section === "customer-base")!.reasons[0].text, meaning: early.meaning ?? "conditional", strength: sections.some(section => section.strength === "limited") ? "limited" : "insufficient", keyQuestions: early.keyQuestions, coverage: early.coverage },
    dimensions: sections.map(section => {
      const sources = evidence.filter(item => item.sections.includes(section.section) && item.sourceClass === "official_public");
      return { id: section.section, title: labels[section.section], conclusion: section.conclusion.text,
        reason: section.reasons.map(reason => reason.text).join(" "), strength: section.strength, meaning: section.conclusion.meaning ?? "no_basis",
        score: section.score, scoreNote: section.score === null ? suppression[section.section] : "A dimension assessment under initial business hypotheses, not a success probability.",
        question: section.question.text, implication: section.implication.text, why: {
          support: section.support.map(p => p.text), opposition: section.opposition.map(p => p.text), alternatives: section.alternatives.map(p => p.text), unknowns: section.unknowns.map(p => p.text),
          observations: sources.filter(source => source.quality.available).map(source => ({ label: source.source.dataset, value: source.value, units: source.units, effectiveAt: source.effectiveAt, scope: source.scope })),
          comparison: section.section === "customer-base" && residential ? { description: "Whole Census output areas in the same local authority; not comparable commercial locations.", density: residential.density,
            units: residential.units, percentile: residential.ranking?.value ?? null, peers: residential.ranking?.cohort.members.length ?? null, limitations: residential.limitations } : null,
          sources: sources.map(source => ({ provider: source.source.provider, dataset: source.source.dataset, url: sourceUrl(source.source.reference), retrievedAt: source.retrievedAt, notices: source.licence.notices })),
        } };
    }) };
}
export function validateFreeProjection(value: unknown): FreeProjection {
  // Exact reconstruction strips unknown/private fields instead of forwarding arbitrary stored JSON.
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_free_projection");
  const row = value as FreeProjection;
  const text = (value: unknown, max = 1000) => { if (typeof value !== "string" || !value || value.length > max || /[<>]/.test(value)) throw new Error("invalid_projection_text"); return value; };
  const list = (value: unknown): string[] => { if (!Array.isArray(value) || value.length > 32) throw new Error("invalid_projection_list"); return value.map(item => text(item)); };
  const strength = (value: unknown): EvidenceStrength => { if (value !== "limited" && value !== "sufficient" && value !== "insufficient") throw new Error("invalid_projection_strength"); return value; };
  const meaning = (value: unknown) => { if (!["favourable", "trade_off", "conditional", "no_basis"].includes(String(value))) throw new Error("invalid_projection_meaning"); return String(value); };
  if (![2,3].includes(row.schemaVersion) || !/^[0-9a-f-]{36}$/i.test(row.analysisId) || !Number.isFinite(Date.parse(row.generatedAt)) || !Array.isArray(row.dimensions) || row.dimensions.length !== 4 || new Set(row.dimensions.map(d => d.id)).size !== 4) throw new Error("invalid_free_projection");
  const numeric = (value: unknown): number | null => { if (value === null) return null; if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("invalid_projection_number"); return value; };
  if (!["coffee-shop", "restaurant", "hair-salon", "beauty-salon"].includes(row.businessType)) throw new Error("invalid_projection_business");
  const reconstructed: LegacyFreeProjection = { schemaVersion: 2, analysisId: row.analysisId, generatedAt: row.generatedAt,
    property: { address: text(row.property?.address, 500), resolution: text(row.property?.resolution), precision: text(row.property?.precision) }, businessType: text(row.businessType),
    earlyView: { headline: text(row.earlyView?.headline), reason: text(row.earlyView?.reason), meaning: meaning(row.earlyView?.meaning), strength: strength(row.earlyView?.strength), keyQuestions: list(row.earlyView?.keyQuestions), coverage: text(row.earlyView?.coverage) },
    dimensions: row.dimensions.map(d => {
      if (!Object.hasOwn(labels, d.id) || d.score !== null && (!Number.isInteger(d.score) || d.score < 0 || d.score > 100) || !Array.isArray(d.why?.observations) || d.why.observations.length > 8 || !Array.isArray(d.why?.sources) || d.why.sources.length > 8) throw new Error("invalid_projection_dimension");
      const comparison = d.why.comparison;
      if (comparison && (comparison.percentile !== null && (typeof comparison.percentile !== "number" || comparison.percentile > 100) ||
        comparison.peers !== null && !Number.isInteger(comparison.peers))) throw new Error("invalid_projection_comparison");
      return { id: d.id, title: labels[d.id], conclusion: text(d.conclusion), reason: text(d.reason), strength: strength(d.strength), meaning: meaning(d.meaning), score: d.score,
        scoreNote: text(d.scoreNote), question: text(d.question), implication: text(d.implication), why: {
          support: list(d.why.support), opposition: list(d.why.opposition), alternatives: list(d.why.alternatives), unknowns: list(d.why.unknowns),
          observations: d.why.observations.map(o => {
            if (row.schemaVersion === 3 && !["official", "observed", "modelled", "inferred"].includes(String(o.sourceType))) throw new Error("invalid_projection_source_type");
            return { label: text(o.label), value: o.value === null ? null : typeof o.value === "number" ? numeric(o.value) : text(o.value), units: o.units === null ? null : text(o.units), effectiveAt: o.effectiveAt === null ? null : text(o.effectiveAt), scope: text(o.scope),
              ...(row.schemaVersion === 3 ? {sourceType: o.sourceType} : {}) };
          }),
          comparison: comparison === null ? null : { description: text(comparison.description), density: numeric(comparison.density), units: text(comparison.units), percentile: numeric(comparison.percentile), peers: numeric(comparison.peers), limitations: list(comparison.limitations) },
          sources: d.why.sources.map(source => ({ provider: text(source.provider), dataset: text(source.dataset), url: source.url === null ? null : sourceUrl(text(source.url)), retrievedAt: source.retrievedAt === null ? null : text(source.retrievedAt), notices: list(source.notices) })),
        } };
    }) };
  return row.schemaVersion === 3 ? {...reconstructed, schemaVersion: 3, spatial: validateEnrichedSpatialProjection(row.spatial)} : reconstructed;
}

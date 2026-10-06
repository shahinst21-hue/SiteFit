import type { Dimension } from "./scoring.ts";

export type Evidence = {
  schemaVersion: 1; id: string; analysisId: string; inputId: string; snapshotId: string | null;
  sections: Dimension[]; source: { provider: string; dataset: string; releaseId: string | null; reference: string; adapterVersion: string };
  sourceClass: "official_public" | "commercial" | "community_open" | "user";
  kind: "measured" | "direct_register" | "modelled" | "derived" | "ai_inference" | "user_input" | "capability";
  scope: string; value: number | string | null; units: string | null;
  retrievedAt: string | null; effectiveAt: string | null;
  geography: { precision: "unknown" | "postcode_centroid" | "building" | "rooftop"; crs: "EPSG:4326"; scope: string; method: string };
  quality: { available: boolean; partial: boolean; freshness: "fresh" | "stale" | "unknown"; limitations: string[] };
  parents: string[]; observationIds: string[];
  licence: { policyId: string; version: number; representationAllowed: boolean; expiresAt: string | null; notices: string[] };
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dimensions = new Set<Dimension>(["customer-base", "market-position", "customer-access", "premises"]);
function keys(value: unknown, expected: string[]): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === expected.length && Object.keys(value).every(key => expected.includes(key));
}
function text(value: unknown, max = 500): value is string { return typeof value === "string" && value.length > 0 && value.length <= max && !/[<>]/.test(value) && [...value].every(character => character.charCodeAt(0) >= 32); }
function strings(value: unknown, max = 32): value is string[] { return Array.isArray(value) && value.length <= max && value.every(item => text(item)); }
function date(value: unknown): boolean { return value === null || typeof value === "string" && Number.isFinite(Date.parse(value)); }
export function validateEvidence(value: unknown): asserts value is Evidence {
  if (!keys(value, ["schemaVersion", "id", "analysisId", "inputId", "snapshotId", "sections", "source", "sourceClass", "kind", "scope", "value", "units", "retrievedAt", "effectiveAt", "geography", "quality", "parents", "observationIds", "licence"])) throw new Error("invalid_evidence_shape");
  const e = value;
  if (e.schemaVersion !== 1 || ![e.id, e.analysisId, e.inputId].every(id => typeof id === "string" && uuid.test(id)) || !(e.snapshotId === null || typeof e.snapshotId === "string" && uuid.test(e.snapshotId))) throw new Error("invalid_evidence_identity");
  if (!Array.isArray(e.sections) || !e.sections.length || e.sections.length > 4 || new Set(e.sections).size !== e.sections.length || !e.sections.every(section => dimensions.has(section))) throw new Error("invalid_evidence_sections");
  if (!keys(e.source, ["provider", "dataset", "releaseId", "reference", "adapterVersion"]) || ![e.source.provider, e.source.dataset, e.source.reference, e.source.adapterVersion].every(item => text(item)) || !(e.source.releaseId === null || text(e.source.releaseId))) throw new Error("invalid_evidence_source");
  if (!["official_public", "commercial", "community_open", "user"].includes(String(e.sourceClass)) || !["measured", "direct_register", "modelled", "derived", "ai_inference", "user_input", "capability"].includes(String(e.kind)) || !text(e.scope)) throw new Error("invalid_evidence_classification");
  if (!(e.value === null || typeof e.value === "number" && Number.isFinite(e.value) || text(e.value)) || !(e.units === null || text(e.units)) || !date(e.retrievedAt) || !date(e.effectiveAt)) throw new Error("invalid_evidence_value");
  if (!keys(e.geography, ["precision", "crs", "scope", "method"]) || !["unknown", "postcode_centroid", "building", "rooftop"].includes(String(e.geography.precision)) || e.geography.crs !== "EPSG:4326" || !text(e.geography.scope) || !text(e.geography.method)) throw new Error("invalid_evidence_geography");
  if (!keys(e.quality, ["available", "partial", "freshness", "limitations"]) || typeof e.quality.available !== "boolean" || typeof e.quality.partial !== "boolean" || !["fresh", "stale", "unknown"].includes(String(e.quality.freshness)) || !strings(e.quality.limitations)) throw new Error("invalid_evidence_quality");
  if (!strings(e.parents) || !e.parents.every(id => uuid.test(id)) || new Set(e.parents).size !== e.parents.length || !strings(e.observationIds, 256)) throw new Error("invalid_evidence_lineage");
  if (!keys(e.licence, ["policyId", "version", "representationAllowed", "expiresAt", "notices"]) || !text(e.licence.policyId) || !Number.isInteger(e.licence.version) || Number(e.licence.version) < 1 || typeof e.licence.representationAllowed !== "boolean" || !date(e.licence.expiresAt) || !strings(e.licence.notices)) throw new Error("invalid_evidence_licence");
}

export function evidenceIndex(items: readonly unknown[], analysisId: string, inputId: string, now: Date) {
  if (items.length > 512 || !Number.isFinite(now.getTime())) throw new Error("invalid_evidence_packet");
  const index = new Map<string, Evidence>();
  for (const item of items) {
    validateEvidence(item);
    if (item.analysisId !== analysisId || item.inputId !== inputId || index.has(item.id)) throw new Error("invalid_evidence_binding");
    if (!item.licence.representationAllowed || item.licence.expiresAt && Date.parse(item.licence.expiresAt) <= now.getTime()) throw new Error("unpermitted_evidence");
    index.set(item.id, structuredClone(item));
  }
  const visiting = new Set<string>(); const visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new Error("circular_evidence");
    if (visited.has(id)) return;
    const item = index.get(id); if (!item) throw new Error("dangling_evidence");
    if ((item.kind === "derived" || item.kind === "ai_inference") && !item.parents.length) throw new Error("unsupported_derived_evidence");
    visiting.add(id); for (const parent of item.parents) visit(parent); visiting.delete(id); visited.add(id);
  }
  for (const id of index.keys()) visit(id);
  return index;
}

export function requireClaimEvidence(index: ReadonlyMap<string, Evidence>, section: Dimension, ids: readonly string[], kind: "local_fact" | "inference" | "availability") {
  if (!ids.length || ids.length > 16 || new Set(ids).size !== ids.length) throw new Error("invalid_claim_references");
  for (const id of ids) {
    const evidence = index.get(id);
    if (!evidence || !evidence.sections.includes(section)) throw new Error("invalid_claim_scope");
    if (kind === "local_fact" && (!evidence.quality.available || ["capability", "ai_inference", "user_input"].includes(evidence.kind))) throw new Error("unsupported_local_fact");
    if (kind === "inference" && !evidence.quality.available) throw new Error("unsupported_inference");
  }
}

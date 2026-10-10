import { object } from "../data/validation.ts";
import { packetDigest } from "../analysis/canonical.ts";
import { sectionKeys, type SectionKey } from "./catalog.ts";

/** Shared content contract for later dashboard/PDF renderers; no PDF generation. */
export function validateFullProjection(value: unknown) {
  const p = object(value), { contentDigest, ...content } = p;
  if (p.version !== "full-report-v1" || p.financialEngineIncluded !== false || typeof p.bindingDigest !== "string" ||
    !/^[a-f0-9]{64}$/.test(p.bindingDigest) || contentDigest !== packetDigest(content) || !Array.isArray(p.sections) ||
    p.sections.length !== 8 || !Array.isArray(p.sourceDirectory) || !Array.isArray(p.supplementReferences) ||
    Buffer.byteLength(JSON.stringify(value)) > 131072) throw Error("invalid_full_projection");
  for (const [i, s] of p.sections.entries()) if (object(s).key !== sectionKeys[i]) throw Error("invalid_full_section_order");
  return p;
}
export function sectionExport(value: unknown, key: SectionKey) {
  const p = validateFullProjection(value), section = object((p.sections as unknown[]).find(s => object(s).key === key));
  const facts = p.sourceDirectory as { id: string; evidenceId: string }[], supplements = p.supplementReferences as { id: string }[];
  const ids = key === "appendix" ? facts.map(f => f.id) : section.factIds as string[];
  if (!Array.isArray(ids) || ids.some(id => !facts.some(f => f.id === id))) throw Error("invalid_export_evidence");
  const requiredSupplementIds = new Set(Array.isArray(section.supplementReferenceIds) ? section.supplementReferenceIds as string[] : []);
  for (const row of [ ...(Array.isArray(section.timeline) ? section.timeline : []),
    ...(Array.isArray(section.rentalObservations) ? section.rentalObservations : []) ]) {
    const record = object(row), reference = typeof record.referenceId === "string" ? record.referenceId : record.id;
    if (typeof reference !== "string" || !supplements.some(s => s.id === reference)) throw Error("invalid_export_supplement");
    requiredSupplementIds.add(reference);
  }
  return { version: "full-section-export-v1", contentDigest: p.contentDigest, bindingDigest: p.bindingDigest,
    generatedAt: p.generatedAt, business: p.business, presentation: p.presentation, section,
    sources: facts.filter(f => ids.includes(f.id)),
    supplementReferences: key === "appendix" ? supplements : supplements.filter(r => requiredSupplementIds.has(r.id)),
    financialEngineIncluded: false };
}

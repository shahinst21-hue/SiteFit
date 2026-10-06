import "server-only";
import { packetDigest } from "./canonical.ts";
import { analysisAIProvider, type AIReceipt } from "./ai-provider.ts";
import { interpretationInstructions, selectionSchema, validateSelection, type InterpretationPacket, type Selection } from "./interpretation.ts";
import type { Evidence } from "./evidence.ts";
export type ValidatedSection = ReturnType<typeof validateSelection> & { section: InterpretationPacket["section"]; receipt: AIReceipt | null; packetDigest: string };
type Provider = ReturnType<typeof analysisAIProvider>;
function deterministicSelection(packet: InterpretationPacket): Selection {
  const pick = (role: "conclusion" | "reason" | "question" | "implication") => packet.propositions.find(p => p.role === role)!.id;
  return { conclusionId: pick("conclusion"), reasonIds: [pick("reason")], supportIds: [], oppositionIds: [...packet.mandatoryOpposition],
    alternativeIds: packet.propositions.filter(p => p.role === "alternative").slice(0, 1).map(p => p.id), unknownIds: [...packet.mandatoryUnknowns],
    questionId: pick("question"), implicationId: pick("implication") };
}
export async function interpretSections(packets: readonly InterpretationPacket[], index: ReadonlyMap<string, Evidence>, provider: Provider, signal?: AbortSignal, previous: readonly ValidatedSection[] = []) {
  if (packets.length !== 4 || new Set(packets.map(p => p.section)).size !== 4) throw new Error("invalid_section_set");
  const results = await Promise.all(packets.map(async packet => {
    const digest = packetDigest(packet);
    const stored = previous.find(section => section.section === packet.section);
    if (stored) {
      if (stored.packetDigest !== digest) throw new Error("stored_section_packet_mismatch");
      const selection: Selection = { conclusionId: stored.conclusion.id, reasonIds: stored.reasons.map(p => p.id),
        supportIds: stored.support.map(p => p.id), oppositionIds: stored.opposition.map(p => p.id), alternativeIds: stored.alternatives.map(p => p.id),
        unknownIds: stored.unknowns.map(p => p.id), implicationId: stored.implication.id, questionId: stored.question.id };
      return { section: { ...validateSelection(selection, packet, index), section: packet.section, receipt: stored.receipt, packetDigest: digest }, error: null };
    }
    if (packet.strength === "insufficient") return { section: { ...validateSelection(deterministicSelection(packet), packet, index), section: packet.section, receipt: null, packetDigest: digest } as ValidatedSection, error: null };
    let repairCode: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await provider.interpret({ ...packet, ...(repairCode ? { validationFailure: repairCode } : {}) }, interpretationInstructions, selectionSchema, signal);
        try {
          return { section: { ...validateSelection(response.output, packet, index), section: packet.section, receipt: response.receipt, packetDigest: digest } as ValidatedSection, error: null };
        } catch { repairCode = "invalid_selection_or_omitted_material_evidence"; }
      } catch { return { section: null, error: { section: packet.section, code: "section_analysis_unavailable" } }; }
    }
    return { section: null, error: { section: packet.section, code: "section_validation_failed" } };
  }));
  return { sections: results.flatMap(result => result.section ? [result.section] : []), errors: results.flatMap(result => result.error ? [result.error] : []) };
}

const synthesisSchema = { type: "object", additionalProperties: false, required: ["headlineId", "supportingSectionIds", "unknownSectionIds"],
  properties: { headlineId: { type: "string", enum: ["customer-conclusion", "case-open"] },
    supportingSectionIds: { type: "array", items: { type: "string", enum: ["customer-base", "market-position", "customer-access", "premises"] }, maxItems: 4 },
    unknownSectionIds: { type: "array", items: { type: "string", enum: ["customer-base", "market-position", "customer-access", "premises"] }, maxItems: 4 } } };
export async function synthesiseSections(sections: readonly ValidatedSection[], provider: Provider, signal?: AbortSignal) {
  if (sections.length !== 4 || new Set(sections.map(section => section.section)).size !== 4) throw new Error("incomplete_synthesis_sections");
  const customer = sections.find(section => section.section === "customer-base")!;
  const packet = { version: "validated-synthesis-v1", choices: [
    { id: "customer-conclusion", text: customer.conclusion.text, meaning: customer.conclusion.meaning },
    { id: "case-open", text: customer.conclusion.kind === "inference" ? "The local-customer case is plausible, but unproven." : "Local evidence does not yet establish the customer case.", meaning: "conditional" },
  ], sections: sections.map(section => ({ id: section.section, conclusion: section.conclusion, support: section.support,
    opposition: section.opposition, unknowns: section.unknowns, alternatives: section.alternatives, strength: section.strength,
    score: section.score, scoreSuppression: section.scoreSuppression })) };
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await provider.interpret({ ...packet, ...(attempt ? { validationFailure: "retain_all_unresolved_section_gaps_and_valid_section_references" } : {}) },
      "Synthesise the validated SiteFit dimension results. Select one scoped headline; never calculate an overall score or clear premises. supportingSectionIds names the validated sections forming the reasoning basis, including negative findings and unresolved conditions; it does not mean every named section favours commitment. A customer-conclusion headline must reference customer-base. Retain every section with unresolved questions in unknownSectionIds. A customer hypothesis does not establish current demand or permitted use. Return only approved IDs.", synthesisSchema, signal);
    const row = response.output as Record<string, unknown> | null;
    if (!row || typeof row !== "object" || Object.keys(row).length !== 3 || !["customer-conclusion", "case-open"].includes(String(row.headlineId)) ||
      !Array.isArray(row.supportingSectionIds) || !Array.isArray(row.unknownSectionIds)) continue;
    const known = new Set(sections.map(section => section.section));
    const unknownSectionIds = row.unknownSectionIds;
    if ([...row.supportingSectionIds, ...row.unknownSectionIds].some(id => !known.has(id)) ||
      new Set(row.supportingSectionIds).size !== row.supportingSectionIds.length || new Set(row.unknownSectionIds).size !== row.unknownSectionIds.length ||
      sections.some(section => section.unknowns.length && !unknownSectionIds.includes(section.section)) ||
      row.headlineId === "customer-conclusion" && !row.supportingSectionIds.includes("customer-base")) continue;
    const choice = packet.choices.find(choice => choice.id === row.headlineId)!;
    return { headline: choice.text, meaning: choice.meaning, supportingSections: row.supportingSectionIds,
      unknownSections: row.unknownSectionIds, evidenceIds: [...new Set(sections.flatMap(section => section.conclusion.evidenceIds))], receipt: response.receipt,
      keyQuestions: [customer.unknowns[0]?.text ?? "Current demand remains unverified.", sections.find(section => section.section === "premises")!.unknowns[0].text],
      coverage: "Census residential context and partial register observations; current demand and premises checks remain incomplete." };
  }
  throw new Error("synthesis_validation_failed");
}

export function restoreSynthesis(stored: unknown, digest: string | undefined, sections: readonly ValidatedSection[], index: ReadonlyMap<string, Evidence>) {
  const value = stored as Awaited<ReturnType<typeof synthesiseSections>> | null;
  const known = new Set(sections.map(section => section.section));
  if (!value || digest !== packetDigest(sections) || typeof value.headline !== "string" || !value.headline || value.headline.length > 300 || /[<>]/.test(value.headline) ||
    !["favourable", "trade_off", "conditional", "no_basis"].includes(String(value.meaning)) ||
    !Array.isArray(value.evidenceIds) || !value.evidenceIds.length || value.evidenceIds.some(id => !index.has(id)) ||
    !Array.isArray(value.supportingSections) || !Array.isArray(value.unknownSections) ||
    [...value.supportingSections, ...value.unknownSections].some(id => !known.has(id)) ||
    new Set(value.supportingSections).size !== value.supportingSections.length || new Set(value.unknownSections).size !== value.unknownSections.length ||
    sections.some(section => section.unknowns.length && !value.unknownSections.includes(section.section))) throw new Error("stored_synthesis_binding_mismatch");
  return structuredClone(value);
}

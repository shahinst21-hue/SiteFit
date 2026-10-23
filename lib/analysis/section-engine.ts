import "server-only";
import {advisorContract,validateDecisionAdvice,validateSnapshotAdvice} from "./advisor.ts";
import {recommendationPacket,recommendationFromScores,validateRecommendation,type RecommendationDecision} from './recommendation.ts';
import {inControlledProof} from '../proof/context.ts';
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
export async function interpretSections(packets: readonly InterpretationPacket[], index: ReadonlyMap<string, Evidence>, provider: Provider, signal?: AbortSignal, previous: readonly ValidatedSection[] = [], onSection?:(id:InterpretationPacket['section'])=>void) {
  if (packets.length !== 4 || new Set(packets.map(p => p.section)).size !== 4) throw new Error("invalid_section_set");
  const results = await Promise.all(packets.map(async packet => {
    const confirmed=(section:ValidatedSection)=>{try{onSection?.(section.section);}catch{/* UI observers cannot invalidate analysis */}return {section,error:null};};
    const digest = packetDigest(packet);
    const stored = previous.find(section => section.section === packet.section);
    if (stored) {
      if (stored.packetDigest !== digest) throw new Error("stored_section_packet_mismatch");
      const selection: Selection = { conclusionId: stored.conclusion.id, reasonIds: stored.reasons.map(p => p.id),
        supportIds: stored.support.map(p => p.id), oppositionIds: stored.opposition.map(p => p.id), alternativeIds: stored.alternatives.map(p => p.id),
        unknownIds: stored.unknowns.map(p => p.id), implicationId: stored.implication.id, questionId: stored.question.id };
      return confirmed({ ...validateSelection(selection, packet, index), section: packet.section, receipt: stored.receipt, packetDigest: digest });
    }
    if (packet.strength === "insufficient") return confirmed({ ...validateSelection(deterministicSelection(packet), packet, index), section: packet.section, receipt: null, packetDigest: digest });
    let repairCode: string | null = null;
    for (let attempt = 0; attempt < (inControlledProof()?1:2); attempt++) {
      try {
        const response = await provider.interpret({ ...packet, ...(repairCode ? { validationFailure: repairCode } : {}) }, interpretationInstructions, selectionSchema, signal);
        try {
          return confirmed({ ...validateSelection(response.output, packet, index), section: packet.section, receipt: response.receipt, packetDigest: digest });
        } catch { repairCode = "invalid_selection_or_omitted_material_evidence"; }
      } catch { return { section: null, error: { section: packet.section, code: "section_analysis_unavailable" } }; }
    }
    return { section: null, error: { section: packet.section, code: "section_validation_failed" } };
  }));
  return { sections: results.flatMap(result => result.section ? [result.section] : []), errors: results.flatMap(result => result.error ? [result.error] : []) };
}

export async function synthesiseSections(sections: readonly ValidatedSection[], provider: Provider, signal?: AbortSignal, businessType='coffee-shop', evidence:readonly Evidence[]=[], policyDecision:RecommendationDecision=recommendationFromScores(null,undefined), walkingEvidence?:{populations:readonly number[]|null; similarBusinesses:readonly number[]|null; competitionState:string}) {
  if (sections.length !== 4 || new Set(sections.map(section => section.section)).size !== 4) throw new Error("incomplete_synthesis_sections");
  if (!['coffee-shop','restaurant','hair-salon','beauty-salon'].includes(businessType)) throw Error('invalid_advisor_business');
  // Selection-only IDs/roles/kinds are redundant after section validation. Keep
  // every statement, its meaning and evidence links, plus all qualified observations.
  // This also avoids wasting the bounded request budget on repeated metadata.
  const statement=(p:ValidatedSection['conclusion'])=>({text:p.text,meaning:p.meaning,evidenceIds:p.evidenceIds});
  // Intern repeated limitations once, retaining every qualification and its
  // per-observation binding. Source-presence placeholders are not findings.
  const observations=evidence.filter(e=>e.quality.available&&e.licence.representationAllowed&&
    !(typeof e.value==='string'&&e.value.startsWith('Retained ')&&e.value.endsWith(' observations')));
  const limitationNotes=[...new Set(observations.flatMap(e=>e.quality.limitations))];
  const decision=validateRecommendation(policyDecision), contract=advisorContract(decision);
  const packet = {version:'snapshot-advisor-v2',businessType,policyDecision:recommendationPacket(decision),...(walkingEvidence?{walkingEvidence:{...walkingEvidence,minutes:[5,10,15],scope:'Modelled cumulative walking catchments. Estimated Census residents and identified category-matched businesses, not observed customer demand or exhaustive competition.'}}:{}),limitationNotes,observations:observations.map(e=>({evidenceId:e.id,sectionIds:e.sections,dataset:e.source.dataset,value:e.value,units:e.units,scope:e.scope,effectiveAt:e.effectiveAt,limitationIds:e.quality.limitations.map(note=>limitationNotes.indexOf(note))})),sections:sections.map(section=>({id:section.section,
    conclusion:statement(section.conclusion),support:section.support.map(statement),opposition:section.opposition.map(statement),unknowns:section.unknowns.map(statement),
    alternatives:section.alternatives.map(statement),implication:statement(section.implication),question:statement(section.question),strength:section.strength}))};
  // One synthesis dispatch. Invalid or ambiguous output is never an automatic paid retry.
  const response=await provider.interpret(packet,contract.instructions,contract.schema,signal);
  const advisor=validateDecisionAdvice(response.output,decision);
  if(businessType==='coffee-shop' ? advisor.formats.length!==3 : advisor.formats.length!==0)throw Error('invalid_advisor_formats');
  return {headline:advisor.recommendation.text,meaning:advisor.stance==='recommended'?'favourable':advisor.stance==='not_recommended'?'trade_off':'conditional',
    supportingSections:[...new Set([...advisor.recommendation.sectionIds,...advisor.why.sectionIds])],
    unknownSections:sections.filter(s=>s.unknowns.length).map(s=>s.section),
    evidenceIds:[...new Set(sections.flatMap(s=>[s.conclusion,...s.support,...s.opposition,...s.unknowns].flatMap(p=>p.evidenceIds)))],
    receipt:response.receipt,keyQuestions:sections.flatMap(s=>s.unknowns.slice(0,1).map(p=>p.text)),
    coverage:'Recommendation about further pursuit, not verified demand, permitted use or lease readiness. Source scopes and limitations remain with each finding.',advisor,decision};
}

export function restoreSynthesis(stored: unknown, digest: string | undefined, sections: readonly ValidatedSection[], index: ReadonlyMap<string, Evidence>) {
  const value = stored as (Omit<Awaited<ReturnType<typeof synthesiseSections>>, "advisor"|"decision"> & {advisor?: ReturnType<typeof validateSnapshotAdvice>;decision?:RecommendationDecision}) | null;
  const known = new Set(sections.map(section => section.section));
  if (!value || digest !== packetDigest(sections) || typeof value.headline !== "string" || !value.headline || value.headline.length > 300 || /[<>]/.test(value.headline) ||
    !["favourable", "trade_off", "conditional", "no_basis"].includes(String(value.meaning)) ||
    !Array.isArray(value.evidenceIds) || !value.evidenceIds.length || value.evidenceIds.some(id => !index.has(id)) ||
    !Array.isArray(value.supportingSections) || !Array.isArray(value.unknownSections) ||
    [...value.supportingSections, ...value.unknownSections].some(id => !known.has(id)) ||
    new Set(value.supportingSections).size !== value.supportingSections.length || new Set(value.unknownSections).size !== value.unknownSections.length ||
    sections.some(section => section.unknowns.length && !value.unknownSections.includes(section.section))) throw new Error("stored_synthesis_binding_mismatch");
  if (value.advisor !== undefined) validateSnapshotAdvice(value.advisor);
  if(value.advisor?.version==='snapshot-advisor-v2'&&!value.decision)throw Error('stored_synthesis_binding_mismatch');
  if (value.decision !== undefined) {validateRecommendation(value.decision);if(value.advisor)validateDecisionAdvice(value.advisor,value.decision);}
  return structuredClone(value);
}

import {validateCompetition} from '../competition/model.ts';
import {bindRecommendation} from '../analysis/recommendation.ts';
import type {ResidentialScore} from '../analysis/residential-catchment.ts';
import type {CompetitionResult} from '../competition/model.ts';
import {validateResidentialScore} from '../analysis/residential-catchment.ts';
import { object } from "../data/validation.ts";
import { packetDigest } from "../analysis/canonical.ts";
import { sectionKeys, type SectionKey, type Fact, type Catalog } from "./catalog.ts";
import { scenarioSummary } from "./scenario-fit.ts";
import { decisionSummary } from "./decision-summary.ts";
import { expandedProfiles } from "./profiles.ts";
import { validateNarrative, renderCommentary, type ConsultantNarrative } from "./narrative.ts";
import type { ScenarioFit } from "./scenario-fit.ts";
import { operatingFormatTable } from "./operating-comparison.ts";

/** Lossless shared provenance: identical metadata is stored once, never omitted. */
export function compactSources(facts: Fact[]) {
  const sourceMetadata: unknown[] = [], positions = new Map<string, number>();
  const reference = (value: unknown) => {
    const digest = packetDigest(value), previous = positions.get(digest);
    if (previous !== undefined) return previous;
    const index = sourceMetadata.length; positions.set(digest, index); sourceMetadata.push(value); return index;
  };
  return { sourceDirectory: facts.map(({ source, licence, statistical, limitations, ...fact }) => ({ ...fact,
    metadata: { source: reference(source), licence: reference(licence), statistical: reference(statistical), limitations: reference(limitations) } })), sourceMetadata };
}
function expandedSources(p: Record<string, unknown>) {
  return (p.sourceDirectory as unknown[]).map(value => {
    const fact = object(value); if (!fact.metadata) return fact;
    const {metadata,...rest}=fact, refs=object(metadata);
    if (!Array.isArray(p.sourceMetadata) || Object.keys(refs).length!==4) throw Error("invalid_source_metadata");
    for (const key of ["source","licence","statistical","limitations"]) {
      const index=refs[key]; if (!Number.isInteger(index)||Number(index)<0||Number(index)>=p.sourceMetadata.length) throw Error("invalid_source_metadata");
      rest[key]=p.sourceMetadata[Number(index)];
    }
    return rest;
  });
}
export function compactSectionAtoms(sections: unknown[]) {
  const atomTexts: string[]=[], positions=new Map<string,number>();
  return { sections:sections.map(value=>{
    const section={...object(value)};
    for(const key of ["reasons","implications","actions","cautions"]) if(Array.isArray(section[key])) section[key]=(section[key] as unknown[]).map(value=>{
      const {text,...atom}=object(value); if(typeof text!=="string") throw Error("invalid_atom_text");
      let index=positions.get(text); if(index===undefined){index=atomTexts.length;positions.set(text,index);atomTexts.push(text);}
      return {...atom,textRef:index};
    });
    return section;
  }),atomTexts };
}
function expandedSection(p: Record<string,unknown>,value:unknown){
  const section={...object(value)};
  for(const key of ["reasons","implications","actions","cautions"]) if(Array.isArray(section[key])) section[key]=(section[key] as unknown[]).map(value=>{
    const atom=object(value); if(atom.textRef===undefined)return atom;
    const {textRef,...rest}=atom;
    if(!Array.isArray(p.atomTexts)||!Number.isInteger(textRef)||Number(textRef)<0||typeof p.atomTexts[Number(textRef)]!=="string")throw Error("invalid_atom_text");
    return {...rest,text:p.atomTexts[Number(textRef)]};
  });
  return section;
}
function narrativeCatalog(p: Record<string, unknown>) {
  const competition = object((p.sections as unknown[])[2]);
  return { facts: expandedSources(p), operators: competition.operators, supplementReferences: p.supplementReferences,
    rentalObservations: object((p.sections as unknown[])[5]).rentalObservations ?? [] } as Catalog;
}

/** Shared content contract for later dashboard/PDF renderers; no PDF generation. */
export function validateFullProjection(value: unknown) {
  const p = object(value), { contentDigest, ...content } = p;
  if (p.version !== "full-report-v1" || p.financialEngineIncluded !== false || typeof p.bindingDigest !== "string" ||
    !/^[a-f0-9]{64}$/.test(p.bindingDigest) || contentDigest !== packetDigest(content) || !Array.isArray(p.sections) ||
    p.sections.length !== 8 || !Array.isArray(p.sourceDirectory) || !Array.isArray(p.supplementReferences) ||
    Buffer.byteLength(JSON.stringify(value)) > 131072) throw Error("invalid_full_projection");
  const competition=object(p.presentation??{}).competition;
  if(competition!==undefined)validateCompetition(competition);
  const residential=object(p.presentation??{}).residentialCatchment;
  if(residential!==undefined&&residential!==null)validateResidentialScore(residential);
  const decision=object(p.presentation??{}).recommendation;
  if(decision!==undefined){const d=bindRecommendation(decision,residential as ResidentialScore|null|undefined,competition as CompetitionResult|undefined);
    if(p.narrative){const n=p.narrative as ConsultantNarrative;if(n.verdict[0].text!==d.title||n.sections[0].conclusion.text!==d.title)throw Error('full_recommendation_mismatch');}}
  for (const [i, s] of p.sections.entries()) {
    if (object(s).key !== sectionKeys[i]) throw Error("invalid_full_section_order");
    const section = expandedSection(p,s);
    if (section.profiles) expandedProfiles(section.profiles);
  }
  if (p.scenarioFit && !p.narrative) {
    const fit = p.scenarioFit as Parameters<typeof scenarioSummary>[0];
    const overview = object(p.sections[0]), actions = object(p.sections[6]);
    const summary = object(overview.executiveSummary).version === "decision-summary-v2" ?
      decisionSummary(fit, expandedSources(p) as Fact[]) : scenarioSummary(fit);
    if (fit.version !== "scenario-fit-v1" || fit.numericalScore !== null ||
      packetDigest(overview.scenarioFit) !== packetDigest(fit) ||
      packetDigest(overview.executiveSummary) !== packetDigest(summary) ||
      overview.conclusion !== summary.consultantVerdict[0] || actions.conclusion !== summary.priorityNextAction ||
      !Array.isArray(overview.factIds) || [...summary.strengths, ...summary.weaknesses].some(s =>
        s.factIds.some(id => !(overview.factIds as string[]).includes(id)))) throw Error("scenario_summary_mismatch");
  }
  expandedSources(p);
  if (p.narrative) {
    if (!p.scenarioFit) throw Error("narrative_scenario_missing");
    const fit = p.scenarioFit as ScenarioFit;
    if (fit.version !== "scenario-fit-v1" || fit.numericalScore !== null ||
      !Array.isArray(fit.scenarios) || !["coffee-shop", "restaurant", "hair-salon", "beauty-salon"].includes(fit.businessType) ||
      (p.business === "hair-beauty-salon" ? !["hair-salon", "beauty-salon"].includes(fit.businessType) : p.business !== fit.businessType))
      throw Error("narrative_scenario_mismatch");
    validateNarrative(p.narrative, narrativeCatalog(p), fit);
  }
  return p;
}
export function sectionExport(value: unknown, key: SectionKey) {
  const p = validateFullProjection(value), section = expandedSection(p,(p.sections as unknown[]).find(s => object(s).key === key));
  const facts = expandedSources(p) as Fact[], supplements = p.supplementReferences as { id: string }[];
  const ids = key === "appendix" ? facts.map(f => f.id) : section.factIds as string[];
  if (!Array.isArray(ids) || ids.some(id => !facts.some(f => f.id === id))) throw Error("invalid_export_evidence");
  const requiredSupplementIds = new Set(Array.isArray(section.supplementReferenceIds) ? section.supplementReferenceIds as string[] : []);
  for (const row of [ ...(Array.isArray(section.timeline) ? section.timeline : []),
    ...(Array.isArray(section.rentalObservations) ? section.rentalObservations : []) ]) {
    const record = object(row), reference = typeof record.referenceId === "string" ? record.referenceId : record.id;
    if (typeof reference !== "string" || !supplements.some(s => s.id === reference)) throw Error("invalid_export_supplement");
    requiredSupplementIds.add(reference);
  }
  if (section.profiles) section.profiles = expandedProfiles(section.profiles);
  if (p.narrative) {
    const catalog = narrativeCatalog(p), narrative = validateNarrative(p.narrative, catalog, p.scenarioFit as ScenarioFit);
    const page = narrative.sections.find(s => s.key === key)!, render = (c: Parameters<typeof renderCommentary>[0]) => renderCommentary(c, catalog);
    section.conclusion = render(page.conclusion).text;
    section.analysis = page.analysis.map(render); section.decisionTest = render(page.decisionTest);
    if (key === "overview") section.executiveSummary = { version: "consultant-summary-v1",
      consultantVerdict: narrative.verdict.map(c => render(c).text), strengths: narrative.strengths.map(render),
      weaknesses: narrative.risks.map(render), priorityNextAction: render(narrative.priorityAction).text };
    if (key === "actions") section.rankedActions = narrative.actions.map((a, i) => ({ rank: i + 1,
      action: render(a.action).text, consequence: render(a.consequence).text, factIds: [...new Set([...a.action.factIds, ...a.consequence.factIds])] }));
    section.operatingComparison = p.operatingComparison;
    for (const c of [page.conclusion, ...page.analysis, page.decisionTest,
      ...(key === "overview" ? [...narrative.verdict, ...narrative.strengths, ...narrative.risks, narrative.priorityAction] : []),
      ...(key === "actions" ? narrative.actions.flatMap(a => [a.action, a.consequence]) : [])])
      for (const id of c.referenceIds) requiredSupplementIds.add(id);
  }
  if (key === "premises" && p.scenarioFit) section.operatingFormatTable = operatingFormatTable(p.scenarioFit as ScenarioFit);
  return { version: "full-section-export-v1", contentDigest: p.contentDigest, bindingDigest: p.bindingDigest,
    generatedAt: p.generatedAt, business: p.business, presentation: p.presentation, section,
    sources: facts.filter(f => ids.includes(f.id)),
    supplementReferences: key === "appendix" ? supplements : supplements.filter(r => requiredSupplementIds.has(r.id)),
    financialEngineIncluded: false };
}

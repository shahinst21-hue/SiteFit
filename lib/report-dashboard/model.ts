import {validateCompetition,type CompetitionResult} from '../competition/model.ts';
import {bindRecommendation,type RecommendationDecision} from '../analysis/recommendation.ts';
import 'server-only';
import {validateResidentialScore,type ResidentialScore} from '../analysis/residential-catchment.ts';
import {reportPages,sourceURL} from './display.ts';
export {reportPages,sourceURL,readableNumber,displayDate} from './display.ts';
import { sectionExport, validateFullProjection } from '../report-intelligence/export.ts';
import type { SectionKey, Fact } from '../report-intelligence/catalog.ts';
import type { ScenarioFit } from '../report-intelligence/scenario-fit.ts';
import type { OperatorDirectory } from '../report-intelligence/operators.ts';
import type { SnapshotMap, SnapshotTransport } from '../snapshot/model.ts';

export type Statement = {text:string; factIds:string[]; referenceIds:string[]; operatorIds:string[]; kind:string};
export type Source = {id:string; section:SectionKey; label:string; value:number|string; units:string|null; scope:string;
  kind:string; strength:string; precision:string; effectiveAt:string|null; retrievedAt:string|null; reference:string|null;
  provider:string; release:string|null; adapter:string; limitations:string[]; licence:string; notices:string[]; statistical:string};
export type Reference = {id:string; source:string; url:string|null; scope:string; retrievedAt:string; effectiveAt:string|null; licence:string};
export type Profile = {dataset:string; seconds:number; period:string; universe:string; method:string;
  limitations:string[]; columns:{label:string; state:string; value:number|null; share:number|null}[]};
export type Page = {key:SectionKey; conclusion:string; analysis:Statement[]; test:Statement|null; cautions:Statement[];
  factIds:string[]; referenceIds:string[]; unknowns:string[]; availability:string; direction:string};
export type Dashboard = {version:'report-dashboard-v1'; presentationMode?:'public-sample'; reportId:string|null; digest:string; generatedAt:string;
  recommendation?:RecommendationDecision; competition?:CompetitionResult; residentialCatchment?:ResidentialScore|null; structuredPreview?:{stage:string};
  address:string; business:string; businessLabel:string; precision:string; analysisTimestamp:string|null; editionLabel:string;
  pages:Page[]; sources:Source[]; references:Reference[]; summary:{verdict:string[]; strengths:Statement[]; risks:Statement[]; priority:string}|null;
  readiness:string; index:{label:string; value:number|null; scope:string; method:string; components:{label:string; weight:number; density:number|null; period:string; code:string}[]};
  scenarios:ScenarioFit|null; operators:OperatorDirectory|null; profiles:Profile[];
  timeline:{id:string; fact:string; date:string; dateMeaning:string; scope:string; referenceId:string}[];
  rental:import('../report-intelligence/catalog.ts').Catalog['rentalObservations'];
  actions:{rank:number; action:string; consequence:string; factIds:string[]}[];
  map:SnapshotMap|null; transport:SnapshotTransport[]; spatialNotices:string[]; demo:boolean};
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const array=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const str=(v:unknown,fallback=''):string=>typeof v==='string'?v:fallback;
const strings=(v:unknown)=>array(v).filter((x):x is string=>typeof x==='string');
function statement(v:unknown):Statement|null {
  const r=record(v); if(typeof r.text!=='string'||!r.text.trim())return null;
  return {text:r.text,factIds:strings(r.factIds),referenceIds:strings(r.referenceIds),operatorIds:strings(r.operatorIds),kind:str(r.kind,'interpretation')};
}
const statements=(v:unknown)=>array(v).map(statement).filter((x):x is Statement=>x!==null);
/** Presentation only. Original content and digests remain untouched; no calculation, inference or source retrieval. */
export function dashboardFromStored(value:unknown, options:{reportId?:string; editionLabel?:string; demo?:boolean}={}):Dashboard {
  const p=validateFullProjection(value), exports=reportPages.map(({key})=>sectionExport(value,key));
  const presentation=record(p.presentation), property=record(presentation.property);
  const competition=presentation.competition===undefined?undefined:validateCompetition(presentation.competition);
  const residentialCatchment=presentation.residentialCatchment===undefined?undefined:presentation.residentialCatchment===null?null:validateResidentialScore(presentation.residentialCatchment);
  const facts=exports[7].sources as Fact[], supplements=exports[7].supplementReferences as unknown[];
  // Expired/unlicensed representations cannot be exported with their dependent claims.
  // Withhold the edition rather than rewriting its immutable historical findings.
  if(facts.some(f=>!f.licence.representationAllowed||(f.licence.expiresAt!==null&&Date.parse(f.licence.expiresAt)<=Date.now())))throw Error('report_representation_unavailable');
  const sources:Source[]=facts.map(f=>({id:f.id,section:f.section,label:f.dataset,value:f.value,units:f.units,scope:f.scope,
    kind:f.kind,strength:f.strength,precision:f.precision,effectiveAt:f.effectiveAt,retrievedAt:f.retrievedAt,
    reference:sourceURL(f.source.reference),provider:f.source.provider,release:f.source.releaseId,adapter:str(f.source.adapterVersion,"not specified"),
    limitations:f.limitations,licence:f.licence.policyId,notices:f.licence.notices??[],statistical:JSON.stringify(f.statistical??{})}));
  const references:Reference[]=supplements.map(v=>{const r=record(v),l=record(r.licence);return {id:str(r.id),source:str(r.source),url:sourceURL(r.reference),scope:str(r.scope),retrievedAt:str(r.retrievedAt),effectiveAt:typeof r.effectiveAt==='string'?r.effectiveAt:null,licence:str(l.policyId,'Recorded source policy')};});
  const pages:Page[]=exports.map(e=>{
    const s=e.section, analysis=statements(s.analysis);
    return {key:s.key as SectionKey,conclusion:str(s.conclusion,'No supported conclusion is stored for this section.'),
      analysis:analysis.length?analysis:statements([ ...array(s.implications),...array(s.reasons)]),test:statement(s.decisionTest),
      cautions:statements(s.cautions),factIds:strings(s.factIds),referenceIds:strings(s.supplementReferenceIds),unknowns:strings(s.unknowns),
      availability:str(s.availability,'stored'),direction:str(s.direction,'conditional')};
  });
  const summary=record(exports[0].section.executiveSummary), index=record(p.index);
  const customer=exports[1].section, profiles=record(customer.profiles);
  const tables:Profile[]=array(profiles.tables).map(v=>{
    const t=record(v), columns=array(t.columns).length?array(t.columns):array(record(profiles.columnSets)[str(t.dataset)]),values=array(t.values);
    return {dataset:str(t.dataset),seconds:Number(t.seconds),period:str(t.referencePeriod,'Period unavailable'),universe:str(t.universe,'Universe unavailable'),method:str(t.method),limitations:strings(record(t.allocation).limitations),
      columns:columns.map((v,i)=>{const c=record(v),cell=array(values[i]);return {label:str(c.label),state:str(cell[0],'unavailable'),value:cell[0]==='available'&&typeof cell[1]==='number'?cell[1]:null,share:cell[0]==='available'&&typeof cell[4]==='number'?cell[4]:null};})};
  });
  const candidate=p.scenarioFit as ScenarioFit|undefined;
  const operators=record(exports[2].section.operators).version?structuredClone(exports[2].section.operators) as OperatorDirectory:null;
  if(operators?.items.some(o=>!sourceURL(o.reference)||new URL(o.reference).hostname!=='ratings.food.gov.uk'))throw Error('operator_reference_invalid');
  return {version:'report-dashboard-v1',reportId:options.reportId??null,digest:str(p.contentDigest),generatedAt:str(p.generatedAt),
    address:str(property.label,'Property identity not stored in this historical edition'),business:str(p.business),
    businessLabel:p.business==='coffee-shop'?'Coffee shop':p.business==='restaurant'?'Restaurant':'Hair & beauty salon',
    precision:str(property.precision,'unknown'),analysisTimestamp:typeof presentation.analysisTimestamp==='string'?presentation.analysisTimestamp:null,
    editionLabel:options.editionLabel??'Full Report V1',pages,sources,references,residentialCatchment,competition,
    ...(presentation.recommendation?{recommendation:bindRecommendation(presentation.recommendation,residentialCatchment,competition)}:{}),
    summary:strings(summary.consultantVerdict).length?{verdict:strings(summary.consultantVerdict),strengths:statements(summary.strengths),risks:statements(summary.weaknesses),priority:str(summary.priorityNextAction)}:null,
    readiness:str(p.readiness,'not assessed').replaceAll('_',' '),index:{label:'Resident & Workplace Context Index',
      value:index.state==='available'&&index.methodValidated===true&&index.hypotheticalPolicy===true&&typeof index.display==='number'?index.display:null,
      scope:str(index.scope,'Dated resident and workplace density context only'),method:str(index.methodVersion),components:array(index.components).map(v=>{const c=record(v),o=record(c.operand);return {label:str(o.component),weight:Number(c.weight),density:typeof o.density==='number'?o.density:null,period:str(o.referencePeriod),code:str(o.code)};})},
    scenarios:candidate??null,operators,
    profiles:tables,timeline:array(exports[4].section.timeline) as Dashboard['timeline'],rental:array(exports[5].section.rentalObservations) as Dashboard['rental'],
    actions:array(exports[6].section.rankedActions).length?array(exports[6].section.rankedActions) as Dashboard['actions']:
      statements(exports[6].section.actions).map((s,i)=>({rank:i+1,action:s.text,consequence:'Consequence not recorded in this historical edition.',factIds:s.factIds})),
    map:null,transport:[],spatialNotices:[],demo:options.demo??false};
}

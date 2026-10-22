import type {Dashboard, Source, Statement} from './model.ts';
import type {SectionKey} from '../report-intelligence/catalog.ts';
import {readableNumber,displayDate} from './display.ts';
import {bindRecommendation,recommendationFromScores} from '../analysis/recommendation.ts';
export function dashboardRecommendation(report:Dashboard){
 if(report.recommendation)return bindRecommendation(report.recommendation,report.residentialCatchment,report.competition);
 return report.residentialCatchment!==undefined||report.competition!==undefined?recommendationFromScores(report.residentialCatchment,report.competition):null;
}
export function dashboardDecisionNarrative(report:Dashboard){
 const decision=dashboardRecommendation(report);if(!decision)return null;
 const matched=report.recommendation&&report.summary?.verdict[0]===decision.title;
 return {why:matched?report.summary!.verdict[1]??decision.why:decision.why,nextMove:matched?report.summary!.priority||decision.nextMove:decision.nextMove};
}

/** An exact opening sentence/clause, never a new analytical conclusion.
 * The complete statement and decision-changing qualifications remain in the detail view. */
export function opening(text:string):string {
  const sentence=text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()??text;
  const colon=sentence.indexOf(':');
  return colon>0&&colon<140?sentence.slice(0,colon)+'.':sentence;
}
export function humanMeasure(label:string):string {
  if(/TS007A.*total/i.test(label))return 'Resident population estimate';
  if(/TS066.*total/i.test(label))return 'Economic-activity population estimate';
  if(/TS003.*total/i.test(label))return 'Household estimate';
  if(/TS001/i.test(label))return 'Published population record';
  if(/TS045.*total/i.test(label))return 'Households by vehicle availability';
  if(/BRES|employee.jobs/i.test(label))return 'Workplace jobs context';
  if(/income/i.test(label))return 'Household income context';
  return label.replace(/\bTS\d+[A-Z]?\b\s*/g,'').replace(/Native primary-family records/i,'Mapped business records').trim();
}
export function profileName(dataset:string):string {
  return ({TS007A:'Resident age',TS066:'Economic activity',TS003:'Households',TS045:'Car availability',TS021:'Ethnic group',TS030:'Household composition',TS054:'Housing tenure'})[dataset]??'Local profile';
}
export function estimateNumber(value:number,units:string|null):string {
  const step=Math.abs(value)>=10000?1000:Math.abs(value)>=1000?100:1;
  const formatted=readableNumber(Math.round(value/step)*step,units);
  return formatted.startsWith('About ')?formatted:`About ${formatted}`;
}
export function sourcePeriod(s:Source):string {
  if(s.effectiveAt)return displayDate(s.effectiveAt);
  return s.label.match(/FYE\d{4}|BRES\d{4}/)?.[0].replace('BRES','').replace('FYE','Year ending ')??'Period not recorded';
}
export function targetFor(ids:string[],report:Dashboard,fallback:SectionKey='premises'):SectionKey {
  return report.sources.find(s=>ids.includes(s.id)&&s.section!=='overview'&&s.section!=='appendix')?.section??fallback;
}
/** Highlight only an existing action: shared operands, or one unambiguous stored-topic match for missingness. */
export function linkedAction(statement:Pick<Statement,'factIds'>&{text?:string},report:Dashboard):number|null {
  const action=report.actions.find(a=>a.factIds.some(id=>statement.factIds.includes(id)));
  if(action)return action.rank;
  if(!statement.text||!/rent|lease|compet|offer|food.business|route|station|pedestrian|permission|layout|premises|selected.property/i.test(statement.text))return null;
  const matches=report.actions.filter(a=>topicFor(a.action)===topicFor(statement.text!));
  return matches.length===1?matches[0].rank:null;
}
export function customerMetrics(sources:Source[]):Source[] {
  const preferred=['TS007A','BRES','income','TS003'];
  const chosen:Source[]=[];
  for(const name of preferred){const candidates=sources.filter(s=>typeof s.value==='number'&&s.label.toLowerCase().includes(name.toLowerCase())&&(!/^TS/.test(name)||/total/i.test(s.label)));const s=candidates.find(s=>/10 minute/i.test(s.scope+' '+s.label))??candidates.find(s=>/BRES|income/i.test(s.label));if(s&&!chosen.includes(s))chosen.push(s);}
  return chosen.length?chosen:sources.filter(s=>typeof s.value==='number').slice(0,4);
}

/** Navigation fallback uses explicit stored topic words, never infers a new risk. */
export function topicFor(text:string):SectionKey {
  if(/rent|lease|service charge|contract terms/i.test(text))return 'rental-context';
  if(/competitor|proposition|alternative offer|named food.business leads|named cafe|bakery leads/i.test(text))return 'competition';
  if(/route|pedestrian|station|entrance|shopfront/i.test(text))return 'access';
  if(/resident|workplace|demographic|population/i.test(text))return 'customer-context';
  return 'premises';
}

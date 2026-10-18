import type {FactorId, SnapshotFactor, SnapshotMetric, SnapshotView} from './model.ts';

// Presentation only. Never re-score, strengthen or replace the frozen findings.
export const readinessLabels = {
 favourable: 'Supportive signals to verify', trade_off: 'Trade-offs to investigate',
 conditional: 'Investigate before committing', no_basis: 'More evidence needed',
} as const;
export const verification: Record<FactorId,{why:string;action:string}> = {
 premises:{why:'Use or layout restrictions could prevent the business you intend to operate.',action:'Ask the landlord for permitted-use documents and a measured plan; get specialist advice where needed.'},
 'customer-base':{why:'A resident population does not show who will buy, or when.',action:'Observe visits during your planned trading hours and test your offer with potential customers.'},
 'market-position':{why:'Register records alone cannot establish which offers customers would choose instead.',action:'Visit comparable businesses and compare their offer, opening hours and current prices.'},
 'customer-access':{why:'Nearby stops do not show whether practical journeys bring people past the premises.',action:'Walk the actual approach at your planned trading times; check crossings, entrances and usable services.'},
};
export function decisionChecks(snapshot:SnapshotView){
 const order:FactorId[]=['premises','customer-base','market-position','customer-access'];
 return order.flatMap(id=>{const f=snapshot.factors.find(f=>f.id===id);const question=f?.question??f?.details?.unknowns[0];return question?[{id,question,...verification[id]}]:[];}).slice(0,3);
}
export function meaningfulMetrics(factor:SnapshotFactor){return factor.metrics.filter(m=>m.status==='available'&&m.value!==null);}
export function metricLabel(metric:SnapshotMetric):string {
 if(metric.label==='TS001')return 'Census residents';
 if(metric.label==='FHRS')return 'Food-register records';
 if(metric.label==='StopPoint')return 'Transport-stop records';
 return metric.label;
}
export function metricLimit(factor:SnapshotFactor,metric:SnapshotMetric):string {
 if(metric.label==='TS001')return 'Usual residents in the Census area. Not current visitors or customers.';
 if(metric.label==='FHRS')return 'Returned by a bounded register search. Not a complete count of current or direct competitors.';
 if(metric.label==='StopPoint')return 'Returned stop records. Not confirmed walking times, usable services or footfall.';
 return metric.description??verification[factor.id].why;
}
export const cafeLenses={
 any:{label:'Still exploring',question:'Which layout and permissions would your intended service need?'},
 takeaway:{label:'Takeaway-led',question:'Where would ordering, collection and queues fit without obstructing access?'},
 specialty:{label:'Specialty coffee',question:'What would distinguish your coffee offer from the businesses customers can already choose?'},
 seated:{label:'Sit-in café',question:'Can a measured plan support circulation, preparation, storage and your intended customer experience?'},
} as const;
export type CafeLens=keyof typeof cafeLenses;
export function snapshotQuestions(snapshot:SnapshotView){
 const concept=snapshot.businessType==='coffee-shop'?'a café':snapshot.businessType==='restaurant'?'a restaurant':'a salon';
 const demand=snapshot.factors.find(f=>f.id==='customer-base');
 const checks=decisionChecks(snapshot);
 return [
  {id:'demand',question:`Is there enough evidence of demand for ${concept} here?`,answer:[demand?.reason,...(demand?.details?.opposition??[])].filter((v):v is string=>!!v),limit:demand?.question??'Current customer demand has not been established.',factor:'customer-base' as FactorId},
  {id:'risks',question:'What could make this location a poor choice?',answer:[...checks.map(c=>snapshot.factors.find(f=>f.id===c.id)),...snapshot.factors].flatMap(f=>f?.details?.opposition??[]).filter((v,i,a)=>a.indexOf(v)===i).slice(0,3),limit:'These are the saved qualifications, not a forecast that the business will fail.',factor:checks[0]?.id??'premises' as FactorId},
  {id:'lease',question:'What should I verify before signing a lease?',answer:checks.map(c=>c.question),limit:'These checks need documents, direct observation or professional advice. This Snapshot does not resolve them.',factor:checks[0]?.id??'premises' as FactorId},
 ];
}

import type {Dashboard} from './model.ts';
import {displayDate,readableNumber} from './display.ts';

/** Display admitted historical PropertyData observations only. Never fetch on read,
 * derive a unit total from a benchmark, or treat a search proposal as evidence. */
export function rentalCards(report:Pick<Dashboard,'rental'|'references'>) {
  return report.rental.map(r=>{
    const benchmark=r.kind==='local_asking_benchmark', estimate=r.kind==='property_estimate';
    const reference=report.references.find(s=>s.id===r.id);
    if(!reference||reference.source!=='propertydata'||(!benchmark&&!estimate)||
      !Number.isFinite(r.annualValue)||r.annualValue<=0||r.selectedUnitRent!==false||
      !['GIA','NIA'].includes(r.areaBasis)||!Number.isFinite(Date.parse(r.retrievedAt))||
      (r.sourceDate!==null&&!Number.isFinite(Date.parse(r.sourceDate)))||
      (benchmark&&(r.unit!=='GBP per square foot per year'||r.reportedError!==null))||
      (estimate&&(r.unit!=='GBP per year'||r.areaBasis!=='GIA'||r.reportedError===null||!Number.isFinite(r.reportedError)||r.reportedError<0)))throw Error('invalid_rental_display');
    return {id:r.id,label:benchmark?'PropertyData · local asking benchmark':'PropertyData · property rent estimate',
      amount:`About ${readableNumber(r.annualValue,'GBP')}`,unit:benchmark?'per sq ft / year':'per year',
      areaBasis:r.areaBasis,dates:`${r.sourceDate?`Source dated ${displayDate(r.sourceDate)}`:'Source/model date not supplied'} · Retrieved ${displayDate(r.retrievedAt)}`,
      margin:r.reportedError===null?null:`Provider-reported margin ±${readableNumber(r.reportedError,'GBP')}; not statistical confidence.`,
      qualification:benchmark?'Local market context, not this unit’s quoted or agreed rent. Do not interchange GIA and NIA.':'Modelled estimate, not this unit’s quoted or agreed rent. Charges and VAT are not established.'};
  });
}

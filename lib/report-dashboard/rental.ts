import type {Dashboard} from './model.ts';
import {displayDate,readableNumber} from './display.ts';

/** Display admitted historical PropertyData observations only. Never fetch on read,
 * derive a unit total from a benchmark, or treat a search proposal as evidence. */
export function rentalCards(report:Pick<Dashboard,'rental'|'references'>) {
  return report.rental.map(r=>{
    const benchmark=r.kind==='local_asking_benchmark', estimate=r.kind==='property_estimate';
    const reference=report.references.find(s=>s.id===r.id);
    if(r.web){
      const w=r.web, labels={source_asking_rent:'dated asking rent',source_reported_contract_rent:'source-reported contract rent',source_market_estimate:'dated market estimate'};
      const label=labels[r.kind as keyof typeof labels];
      if(!reference||reference.source!==`rental-web:${w.policyId}`||!reference.url||!label||w.match!=='exact_unit'||r.selectedUnitRent!==true||
        !Number.isFinite(r.annualValue)||r.annualValue<=0||r.unit!=='GBP per year'||r.reportedError!==null||
        !['GIA','NIA','unknown'].includes(r.areaBasis)||!Number.isFinite(Date.parse(r.retrievedAt))||r.sourceDate===null||
        !Number.isFinite(Date.parse(r.sourceDate))||![w.publishedDate,w.effectiveDate].every(d=>d===null||Number.isFinite(Date.parse(d)))||
        !['exact','offers_above','approximate'].includes(w.amountQualifier))throw Error('invalid_rental_display');
      return {id:r.id,label:`${w.sourceLabel} · ${label}`,amount:`${w.amountQualifier==='offers_above'?'Offers above':w.amountQualifier==='approximate'?'About':'Source quotes'} ${readableNumber(r.annualValue,'GBP')}`,
        unit:'per year',areaBasis:r.areaBasis==='unknown'?'Area basis not supplied':r.areaBasis,
        dates:`${w.publishedDate?`Published ${displayDate(w.publishedDate)} · `:''}${w.effectiveDate?`Effective ${displayDate(w.effectiveDate)} · `:''}Observed ${displayDate(r.retrievedAt)}`,
        margin:null,qualification:`Dated exact-unit source evidence, not verified current or agreed lease rent. VAT ${w.vat.replaceAll('_',' ')}; charges and lease terms need separate comparison. An asking quote, a reported contract and a market estimate are different evidence.`};
    }
    if(!reference||reference.source!=='propertydata'||(!benchmark&&!estimate)||
      !Number.isFinite(r.annualValue)||r.annualValue<=0||r.selectedUnitRent!==false||
      !['GIA','NIA'].includes(r.areaBasis)||!Number.isFinite(Date.parse(r.retrievedAt))||
      (r.sourceDate!==null&&!Number.isFinite(Date.parse(r.sourceDate)))||
      (benchmark&&(r.unit!=='GBP per square foot per year'||r.reportedError!==null))||
      (estimate&&(r.unit!=='GBP per year'||r.areaBasis!=='GIA'||r.reportedError===null||!Number.isFinite(r.reportedError)||r.reportedError<0)))throw Error('invalid_rental_display');
    if(r.comparison&&(!Number.isSafeInteger(r.comparison.sample)||r.comparison.sample<=0||!['restaurants','retail'].includes(r.comparison.type)))throw Error('invalid_rental_display');
    return {id:r.id,label:benchmark?'PropertyData · local asking benchmark':'PropertyData · property rent estimate',
      amount:`About ${readableNumber(r.annualValue,'GBP')}`,unit:benchmark?'per sq ft / year':'per year',
      areaBasis:r.areaBasis,dates:`${r.sourceDate?`Source dated ${displayDate(r.sourceDate)}`:'Source/model date not supplied'} · Retrieved ${displayDate(r.retrievedAt)}`,
      margin:r.reportedError===null?null:`Provider-reported margin ±${readableNumber(r.reportedError,'GBP')}; not statistical confidence.`,
      qualification:benchmark?`Local market context, not this unit’s quoted or agreed rent. Do not interchange GIA and NIA.${r.comparison?` Based on ${r.comparison.sample} ${r.comparison.type==='restaurants'?'restaurant':'retail'} properties; the geographic radius units, price spread and selected-format comparability are not supplied.`:''}`:'Modelled estimate, not this unit’s quoted or agreed rent. Charges and VAT are not established.'};
  });
}

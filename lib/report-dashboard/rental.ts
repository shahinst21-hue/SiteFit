import type {Dashboard} from './model.ts';
import {displayDate,readableNumber} from './display.ts';
import {comparableRelevance} from '../economics/rental-comparables.ts';

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
        details:[],relevance:null,margin:null,qualification:`Dated exact-unit source evidence, not verified current or agreed lease rent. VAT ${w.vat.replaceAll('_',' ')}; charges and lease terms need separate comparison. An asking quote, a reported contract and a market estimate are different evidence.`};
    }
    if(!reference||reference.source!=='propertydata'||(!benchmark&&!estimate)||
      !Number.isFinite(r.annualValue)||r.annualValue<=0||r.selectedUnitRent!==false||
      !['GIA','NIA'].includes(r.areaBasis)||!Number.isFinite(Date.parse(r.retrievedAt))||
      (r.sourceDate!==null&&!Number.isFinite(Date.parse(r.sourceDate)))||
      (benchmark&&(r.unit!=='GBP per square foot per year'||r.reportedError!==null))||
      (estimate&&(r.unit!=='GBP per year'||r.areaBasis!=='GIA'||r.reportedError===null||!Number.isFinite(r.reportedError)||r.reportedError<0)))throw Error('invalid_rental_display');
    if(r.comparison&&(!Number.isSafeInteger(r.comparison.sample)||r.comparison.sample<=0||!['restaurants','retail'].includes(r.comparison.type)))throw Error('invalid_rental_display');
    const c=r.comparison;
    if(c&&[c.averageSqft,c.averagePoundsYear,c.dispersion].some(v=>v!==undefined&&v!==null&&(!Number.isFinite(v)||v<0)))throw Error('invalid_rental_display');
    const details=c?[{label:'Analysed sample',value:`${c.sample} ${c.type==='restaurants'?'restaurant':'retail'} properties`},
      {label:'Geographic coverage',value:c.radiusUnits&&Number.isFinite(c.radius)&&c.radius>=0?`Provider radius ${new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(c.radius)} ${c.radiusUnits}`:'Radius units unavailable; extent cannot be compared'},
      ...(c.averageSqft? [{label:`Average comparable area (${r.areaBasis})`,value:`About ${new Intl.NumberFormat('en-GB',{maximumSignificantDigits:3}).format(c.averageSqft)} sq ft`}]:[]),
      ...(c.averagePoundsYear?[{label:'Average annual modelled quoting rent',value:`About ${new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumSignificantDigits:3}).format(c.averagePoundsYear)}`}]:[])]:[];
    return {id:r.id,label:benchmark?`PropertyData · ${c?.type==='restaurants'?'Food & drink':c?.type==='retail'?'Retail premises':'local'} benchmark`:'PropertyData · property rent estimate',
      amount:`About ${readableNumber(r.annualValue,'GBP')}`,unit:benchmark?'per sq ft / year':'per year',
      details,relevance:c?comparableRelevance(c.type):null,
      areaBasis:r.areaBasis,dates:`${r.sourceDate?`Source dated ${displayDate(r.sourceDate)}`:'Source/model date not supplied'} · Retrieved ${displayDate(r.retrievedAt)}`,
      margin:r.reportedError===null?null:`Provider-reported margin ±${readableNumber(r.reportedError,'GBP')}; not statistical confidence.`,
      qualification:benchmark?`Modelled headline quoting rent, not live asking listings or achieved rent; not this unit’s quoted or agreed rent. Do not interchange GIA and NIA.${c?` Based on ${c.sample} ${c.type==='restaurants'?'restaurant':'retail'} properties; ${c.radiusUnits?'':'the geographic radius units, '}${c.dispersion===null?'price spread and ':''}selected-format comparability are not supplied. Categories remain separate; sample overlap is unknown.`:''}`:'Modelled estimate, not this unit’s quoted or agreed rent. Charges and VAT are not established.'};
  });
}

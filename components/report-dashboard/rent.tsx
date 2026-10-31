import type {Dashboard} from '@/lib/report-dashboard/model';
import {readableNumber} from '@/lib/report-dashboard/display';
import {rentalCards} from '@/lib/report-dashboard/rental';

/** Missing pricing produces no customer-facing placeholder or speculative number. */
export function RentalEvidence({report}:{report:Dashboard}) {
  const r=report.presentationMode==='public-sample'?report.sampleRental:undefined;
  const cards=r?[{id:'sample-market',label:'Market rental context',amount:`About ${readableNumber(r.benchmark,'GBP')}`,unit:'per sq ft / year',areaBasis:'NIA',dates:'Basis: Sample dataset',margin:null,relevance:'A comparison for lease discussions, separate from the selected unit’s asking rent.',details:[{label:'Comparison cohort',value:`${r.cohort} commercial properties`},{label:'Average comparable area',value:`${r.averageSqft} sq ft`},{label:'Average annual quoting rent',value:readableNumber(r.averageAnnual,'GBP')}],qualification:'Indicative market context, not an agreed lease rent. Confirm rent, rates, service charges and repair obligations.'}]:rentalCards(report);
  if(report.presentationMode==='public-sample'&&!r)for(const card of cards){const source=report.rental.find(v=>v.id===card.id)!;card.dates=source.sourceDate?card.dates:'Retrieved '+new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}).format(new Date(source.retrievedAt));card.details=card.details.filter(d=>d.label!=='Geographic coverage'||!d.value.includes('unavailable'));card.qualification='Neighbourhood asking-rent context. Compare the cohort, area basis and proposed lease terms for your chosen unit.';}
  if(!cards.length)return null;
  return <div className="dw-rent-grid">{cards.map(r=><section className="dw-rent" key={r.id}>
    <span className="dw-eyebrow">{r.label}</span><strong>{r.amount}</strong><span>{r.unit}</span>
    <div><b>{r.areaBasis}</b>{' · '}<small>{r.dates}</small></div>{r.margin&&<p>{r.margin}</p>}
    {!!r.details.length&&<dl className="dw-rent-details">{r.details.map(d=><div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}</dl>}
    {r.relevance&&<p>{r.relevance}</p>}
    <div className="dw-essential">{r.qualification}</div>
  </section>)}{cards.length>1&&<p className="dw-essential">Separate dated observations, not an averaged rent or an automatically preferred newest figure.</p>}</div>;
}

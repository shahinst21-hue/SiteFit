import type {Dashboard} from '@/lib/report-dashboard/model';
import {rentalCards} from '@/lib/report-dashboard/rental';

/** Missing pricing produces no customer-facing placeholder or speculative number. */
export function RentalEvidence({report}:{report:Dashboard}) {
  const cards=rentalCards(report);
  if(!cards.length)return null;
  return <div className="dw-rent-grid">{cards.map(r=><section className="dw-rent" key={r.id}>
    <span className="dw-eyebrow">{r.label}</span><strong>{r.amount}</strong><span>{r.unit}</span>
    <div><b>{r.areaBasis}</b>{' · '}<small>{r.dates}</small></div>{r.margin&&<p>{r.margin}</p>}
    {!!r.details.length&&<dl className="dw-rent-details">{r.details.map(d=><div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}</dl>}
    {r.relevance&&<p>{r.relevance}</p>}
    <div className="dw-essential">{r.qualification}</div>
  </section>)}{cards.length>1&&<p className="dw-essential">Separate dated observations, not an averaged rent or an automatically preferred newest figure.</p>}</div>;
}

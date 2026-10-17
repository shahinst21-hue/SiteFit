"use client";
import {useState} from 'react';
import Link from 'next/link';
import {salePolicy,type SaleConsent} from '../lib/legal/sale';
import {PurchaseButton} from './purchase-button';

export type PurchaseConsentProps={report:string;disclosure:string;sellerDisclosure:string;formation:string;delivery:string;
 labels:{termsAccepted:string;immediateRequested:string;acknowledgement:string}};
/** Wording is supplied by the server only after publication and sale approval. */
export function PurchaseConsent({report,disclosure,sellerDisclosure,formation,delivery,labels}:PurchaseConsentProps){
 const [buyerKind,setBuyer]=useState<SaleConsent['buyerKind']>('consumer');
 const [terms,setTerms]=useState(false),[immediate,setImmediate]=useState(false),[ack,setAck]=useState(false);
 return <section aria-label="Purchase terms"><p>{disclosure}</p><p>{sellerDisclosure}</p><p>{formation} {delivery}</p>
 <label>Purchase purpose<select value={buyerKind} onChange={e=>setBuyer(e.target.value as SaleConsent['buyerKind'])}><option value="consumer">Personal / consumer purchase</option><option value="business">Business purchase</option></select></label>
 <p>A business selection does not itself remove applicable consumer rights.</p><p><Link href="/terms">Terms of Sale</Link> · <Link href="/privacy">Privacy information</Link></p>
 <label><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/>{labels.termsAccepted}</label>
 <label><input type="checkbox" checked={immediate} onChange={e=>setImmediate(e.target.checked)}/>{labels.immediateRequested}</label>
 <label><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>{labels.acknowledgement}</label>
 <PurchaseButton report={report} checkout consent={{version:salePolicy.version,buyerKind,termsAccepted:terms,immediateRequested:immediate,acknowledgement:ack}}/></section>;
}

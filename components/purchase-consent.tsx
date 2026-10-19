"use client";
import {useState} from 'react';
import Link from 'next/link';
import {salePolicy,type SaleConsent} from '../lib/legal/sale';
import {PurchaseButton} from './purchase-button';

export type PurchaseConsentProps={report:string;disclosure:string;sellerDisclosure:string;formation:string;delivery:string;
 labels:{termsAccepted:string;immediateRequested:string;acknowledgement:string}};
/** Wording is supplied by the server only after publication and sale approval. */
export function PurchaseConsent({report}:PurchaseConsentProps){
 const [buyerKind,setBuyer]=useState<SaleConsent['buyerKind']>('consumer');
 const [immediate,setImmediate]=useState(false);
 return <section className="sf-purchase-consent" aria-label="Purchase terms">
 <label className="sf-buyer-purpose">Buying for<select value={buyerKind} onChange={e=>setBuyer(e.target.value as SaleConsent['buyerKind'])}><option value="consumer">Personal use</option><option value="business">A business</option></select></label>
 <label className="sf-immediate-request"><input type="checkbox" checked={immediate} onChange={e=>setImmediate(e.target.checked)}/><span>I request preparation and supply before the cancellation period ends.<small>Starts after payment and contract confirmation. My 14-day consumer cancellation right remains protected.</small></span></label>
 <PurchaseButton report={report} checkout label="Continue to secure payment" consent={{version:salePolicy.version,buyerKind,termsAccepted:true,immediateRequested:immediate,acknowledgement:true}}/>
 <p className="sf-purchase-legal">By purchasing, you agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms of Sale</Link>. <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</Link> · <Link href="/terms#consumer-cancellation" target="_blank" rel="noopener noreferrer">Cancellation & refunds</Link>.</p>
 <p className="sf-purchase-rights">Your 14-day contractual consumer cancellation right remains protected, including after delivery. Statutory rights remain unaffected.</p>
 </section>;
}

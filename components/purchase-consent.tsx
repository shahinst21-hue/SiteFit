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
 <p className="sf-purchase-legal">By purchasing, you agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms of Sale</Link>. <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</Link> · <Link href="/terms#consumer-cancellation" target="_blank" rel="noopener noreferrer">Cancellation & refunds</Link>.</p>
 <p className="sf-purchase-rights">Your 14-day contractual consumer cancellation right remains protected, including after delivery. Statutory rights remain unaffected.</p>
 <button type="button" className="sf-supply-action" aria-pressed={immediate} onClick={()=>setImmediate(true)}><span>{immediate?'✓ ':''}I agree to immediate delivery and understand that my statutory cancellation right ends when it begins.</span></button>
 <p className="sf-supply-explanation">{immediate?'Immediate delivery agreed. Your separate contractual 14-day full-refund right remains available.':'This separate action authorises early digital delivery. Accepting the Terms alone does not authorise it.'}</p>
 <PurchaseButton report={report} checkout label="Continue to secure payment" consent={{version:salePolicy.version,buyerKind,termsAccepted:true,immediateRequested:immediate,acknowledgement:immediate}}/>

 </section>;
}

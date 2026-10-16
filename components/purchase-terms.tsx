"use client";
import {useState} from "react";
import Link from "next/link";
import {salePolicy,saleDisclosure,type SaleConsent} from "../lib/legal/sale";
import {PurchaseButton} from "./purchase-button";
import {consentLabels,formationRule,deliveryCommitment} from '../lib/legal/policy-text';
import {seller} from '../lib/legal/seller';
export function PurchaseTerms({report}:{report:string}) {
 const [buyerKind,setBuyer]=useState<SaleConsent["buyerKind"]>("consumer");
 const [terms,setTerms]=useState(false),[immediate,setImmediate]=useState(false),[ack,setAck]=useState(false);
 return <section aria-label="Purchase terms"><p>{saleDisclosure}</p>
 <p>{seller.name}, trading as {seller.tradingName}. {seller.address}. {seller.email}. Not VAT registered.</p>
 <p>{formationRule} {deliveryCommitment}</p>
 {!salePolicy.approved&&<p>Checkout is unavailable while final launch checks are completed. Policy review version: {salePolicy.version}.</p>}
 <label>Purchase purpose<select value={buyerKind} onChange={e=>setBuyer(e.target.value as SaleConsent["buyerKind"])}><option value="consumer">Personal / consumer purchase</option><option value="business">Business purchase</option></select></label>
 <p>A business selection does not itself remove applicable consumer rights.</p>
 <p><Link href="/terms">Terms of Sale</Link> · <Link href="/privacy">Privacy information</Link></p>
 <label><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/>{consentLabels.termsAccepted}</label>
 <label><input type="checkbox" checked={immediate} onChange={e=>setImmediate(e.target.checked)}/>{consentLabels.immediateRequested}</label>
 <label><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>{consentLabels.acknowledgement}</label>
 <PurchaseButton report={report} checkout consent={{version:salePolicy.version,buyerKind,termsAccepted:terms,immediateRequested:immediate,acknowledgement:ack}}/>
 </section>;
}

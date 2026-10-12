"use client";
import {useState} from "react";
import Link from "next/link";
import {salePolicy,saleDisclosure,type SaleConsent} from "../lib/legal/sale";
import {PurchaseButton} from "./purchase-button";
export function PurchaseTerms({report}:{report:string}) {
 const [buyerKind,setBuyer]=useState<SaleConsent["buyerKind"]>("consumer");
 const [terms,setTerms]=useState(false),[immediate,setImmediate]=useState(false),[ack,setAck]=useState(false);
 return <section aria-label="Purchase terms"><p>{saleDisclosure}</p>
 <p>Legal entity, tax treatment, supply classification and confirmation delivery are awaiting owner approval. New Checkout is unavailable until these are resolved.</p>
 <label>Purchase purpose<select value={buyerKind} onChange={e=>setBuyer(e.target.value as SaleConsent["buyerKind"])}><option value="consumer">Personal / consumer purchase</option><option value="business">Business purchase</option></select></label>
 <p>A business selection does not itself remove applicable consumer rights.</p>
 <label><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/>I have reviewed the <Link href="/terms">draft terms</Link> and <Link href="/privacy">privacy information</Link>.</label>
 <label><input type="checkbox" checked={immediate} onChange={e=>setImmediate(e.target.checked)}/>I request immediate preparation and supply before the cancellation period ends.</label>
 <label><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>I understand that immediate supply requires the legally applicable acknowledgement; SiteFit's contractual 14-day consumer cancellation right and statutory remedies remain protected. Final wording awaits classification approval.</label>
 <PurchaseButton report={report} checkout consent={{version:salePolicy.version,buyerKind,termsAccepted:terms,immediateRequested:immediate,acknowledgement:ack}}/>
 </section>;
}

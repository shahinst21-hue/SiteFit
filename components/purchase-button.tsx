"use client";
import { useCallback,useState } from "react";
import { formatPrice, site } from "../lib/site-config";
import { salePolicy, type SaleConsent } from "../lib/legal/sale";
import { purchaseNavigation,PurchaseNavigationError } from "../lib/payments/purchase-navigation";
export function PurchaseButton({report,checkout=false,controlId,consent,label,unavailableMessage}:{report?:string;checkout?:boolean;controlId?:string;consent?:SaleConsent;label?:string;unavailableMessage?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const start=useCallback(async()=>{
  if(!report||busy)return;
  setBusy(true);setError("");
  try{
   window.location.assign(await purchaseNavigation(report,checkout,window.location.origin,fetch,consent));
  }catch(error){setError(error instanceof PurchaseNavigationError?error.message:"Checkout could not be opened. Your Snapshot is still saved. Return to it and try again shortly.");setBusy(false);}
 },[report,checkout,consent,busy]);
 return <><button type="button" className="button button-primary" data-testid={controlId} data-snapshot-event={controlId?.startsWith('snapshot-')?'full_click':undefined} data-snapshot-detail={controlId?.replace('snapshot-purchase-','')} disabled={busy||!report||checkout&&(!salePolicy.approved||!consent?.termsAccepted||!consent.immediateRequested||!consent.acknowledgement)} onClick={start}>{busy?"Please wait…":checkout?`${label??"Continue to Checkout"} · ${formatPrice(site.pricing.fullReport)}`:label??`See the Full Report · ${formatPrice(site.pricing.fullReport)}`}</button><p role="status">{!report?unavailableMessage??"Purchasing is unavailable in this environment.":error}</p></>;
}

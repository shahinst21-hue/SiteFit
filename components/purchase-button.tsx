"use client";
import { useCallback,useState } from "react";
import { formatPrice, site } from "../lib/site-config";
import { salePolicy, type SaleConsent } from "../lib/legal/sale";
import { purchaseNavigation,PurchaseNavigationError } from "../lib/payments/purchase-navigation";
export function PurchaseButton({report,checkout=false,immediateOnContinue=false,controlId,consent,label,unavailableMessage}:{report?:string;checkout?:boolean;immediateOnContinue?:boolean;controlId?:string;consent?:SaleConsent;label?:string;unavailableMessage?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const start=useCallback(async()=>{
  if(!report||busy)return;
  setBusy(true);setError("");
  try{
   const recordedConsent=checkout&&immediateOnContinue&&consent?{...consent,immediateRequested:true,acknowledgement:true}:consent;
   window.location.assign(await purchaseNavigation(report,checkout,window.location.origin,fetch,recordedConsent));
  }catch(error){setError(error instanceof PurchaseNavigationError?error.message:"Checkout could not be opened. Your Snapshot is still saved. Return to it and try again shortly.");setBusy(false);}
 },[report,checkout,immediateOnContinue,consent,busy]);
 return <><button type="button" className="button button-primary" aria-describedby={immediateOnContinue?"sf-immediate-delivery-notice":undefined} data-testid={controlId} data-snapshot-event={controlId?.startsWith('snapshot-')?'full_click':undefined} data-snapshot-detail={controlId?.replace('snapshot-purchase-','')} disabled={busy||!report||checkout&&(!salePolicy.approved||!consent?.termsAccepted||!immediateOnContinue&&(!consent.immediateRequested||!consent.acknowledgement))} onClick={start}>{busy?"Please wait…":checkout?`${label??"Continue to Checkout"} · ${formatPrice(site.pricing.fullReport)}`:label??`See the Full Report · ${formatPrice(site.pricing.fullReport)}`}</button><p role="status">{!report?unavailableMessage??"Purchasing is unavailable in this environment.":error}</p></>;
}

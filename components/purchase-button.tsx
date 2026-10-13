"use client";
import { useCallback,useState } from "react";
import { salePolicy, type SaleConsent } from "../lib/legal/sale";
import { purchaseNavigation } from "../lib/payments/purchase-navigation";
export function PurchaseButton({report,checkout=false,controlId,consent}:{report?:string;checkout?:boolean;controlId?:string;consent?:SaleConsent}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const start=useCallback(async()=>{
  if(!report)return;
  setBusy(true);setError("");
  try{
   window.location.assign(await purchaseNavigation(report,checkout,window.location.origin,fetch,consent));
  }catch{setError("We could not continue to Checkout. Your Snapshot is still saved; please retry shortly.");setBusy(false);}
 },[report,checkout,consent]);
 return <><button type="button" className="button button-primary" data-testid={controlId} disabled={busy||!report||checkout&&(!salePolicy.approved||!consent?.termsAccepted||!consent.immediateRequested||!consent.acknowledgement)} onClick={start}>{busy?"Please wait…":checkout?"Continue to Test Checkout · £29":"Check the Full Case · £29"}</button><p role="status">{!report?"Purchasing is unavailable in this environment.":error}</p></>;
}

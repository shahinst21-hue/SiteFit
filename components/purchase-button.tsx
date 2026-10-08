"use client";
import { useCallback,useState } from "react";
import { purchaseNavigation } from "../lib/payments/purchase-navigation";
export function PurchaseButton({report,checkout=false,controlId}:{report?:string;checkout?:boolean;controlId?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const start=useCallback(async()=>{
  if(!report)return;
  setBusy(true);setError("");
  try{
   window.location.assign(await purchaseNavigation(report,checkout,window.location.origin));
  }catch{setError("We could not continue to Checkout. Your Snapshot is still saved; please retry shortly.");setBusy(false);}
 },[report,checkout]);
 return <><button type="button" className="button button-primary" data-testid={controlId} disabled={busy||!report} onClick={start}>{busy?"Please wait…":checkout?"Continue to Test Checkout · £29":"Check the Full Case · £29"}</button><p role="status">{!report?"Purchasing is unavailable in this environment.":error}</p></>;
}

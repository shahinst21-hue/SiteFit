"use client";
import { useCallback,useState } from "react";
export function PurchaseButton({report,checkout=false}:{report:string;checkout?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const start=useCallback(async()=>{
  setBusy(true);setError("");
  try{
   const response=await fetch(checkout?"/purchase/checkout":"/purchase/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reportId:report})});
   const data=await response.json();if(!response.ok||typeof data.url!=="string")throw Error("unavailable");
   const url=new URL(data.url,window.location.origin);
   if(checkout?url.origin!=="https://checkout.stripe.com"||!url.pathname.startsWith("/c/pay/"):url.origin!==window.location.origin||!['/purchase/auth','/purchase/resume'].includes(url.pathname))throw Error("invalid_redirect");
   window.location.assign(url.href);
  }catch{setError("We could not continue to Checkout. Your Snapshot is still saved; please retry shortly.");setBusy(false);}
 },[report,checkout]);
 return <><button type="button" className="button button-primary" disabled={busy} onClick={start}>{busy?"Please wait…":checkout?"Continue to Test Checkout · £29":"Check the Full Case · £29"}</button><p role="status">{error}</p></>;
}

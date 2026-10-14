"use client";
import {useState} from "react";
export function PurchaseRequest({purchase}:{purchase:string}){
 const [reason,setReason]=useState("change_of_mind"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function submit(){setBusy(true);try{
 const r=await fetch("/purchase/cancellation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({purchase,reason})});
 const value=await r.json();if(!r.ok||value.status!=="requested")throw Error();
 setMessage("Your request has been recorded for this purchase. A refund has not yet been issued.");
 }catch{setMessage("Your request could not be saved. Try again or contact info@sitefit.co.uk with your purchase reference. No payment or refund was made.");}finally{setBusy(false);}}
 return <section aria-label="Purchase assistance"><h2>Cancellation or delivery problem</h2>
 <p>Leaving Stripe cancels checkout only. For a confirmed purchase, record a separate request here. Applicable statutory rights remain unaffected.</p>
 <label>Request reason<select value={reason} onChange={e=>setReason(e.target.value)}><option value="change_of_mind">Cancellation / change of mind</option><option value="failed_delivery">Report not delivered</option><option value="report_problem">Problem with the report</option><option value="other">Other purchase assistance</option></select></label>
 <button type="button" className="button button-secondary" disabled={busy} onClick={submit}>{busy?"Recording…":"Submit request"}</button><p role="status">{message}</p></section>;
}

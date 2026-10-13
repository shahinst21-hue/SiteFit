"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import {PurchaseRequest} from "./purchase-request";
import { progressLabel, parseProgress, type Progress } from "@/lib/fulfilment/policy";
type State={test?:boolean;id:string;report:string;status:string;access:string;confirmationAvailable?:boolean;fulfilment?:Progress|null};
export function PurchaseStatus({initial,cancelled}:{initial:State;cancelled:boolean}){
 const [state,setState]=useState(initial),[finished,setFinished]=useState(false);
 useEffect(()=>{
  if(initial.status!=="pending"&&!(initial.access==='active'&&['queued','running'].includes(initial.fulfilment?.state??'')))return;
  const duration=initial.status==='pending'?30000:120000;
  const controller=new AbortController();const deadline=Date.now()+duration;let timer:ReturnType<typeof setTimeout>;
  const stopTimer=setTimeout(()=>{controller.abort();clearTimeout(timer);setFinished(true);},duration);
  const pause=()=>{if(document.hidden){controller.abort();clearTimeout(timer);clearTimeout(stopTimer);setFinished(true);}};
  document.addEventListener('visibilitychange',pause);
  async function poll(){
   if(controller.signal.aborted)return;
   if(Date.now()>=deadline||document.hidden){setFinished(true);return;}
   try{
    const response=await fetch(`/purchase/status?purchase=${encodeURIComponent(initial.id)}`,{cache:"no-store",signal:controller.signal});
    const value:unknown=await response.json();
    if(response.ok&&value&&typeof value==="object"&&"id" in value&&value.id===initial.id&&"status" in value&&typeof value.status==="string"&&"access" in value&&typeof value.access==="string"){
     const fulfilment=parseProgress('fulfilment' in value?value.fulfilment:null);
     setState({...initial,status:value.status,access:value.access,fulfilment});
     if(value.status!=="pending"&&!(value.access==='active'&&['queued','running'].includes(fulfilment?.state??''))){clearTimeout(stopTimer);setFinished(true);return;}
    }
   }catch{if(controller.signal.aborted)return;}
   timer=setTimeout(poll,2000);
  }
  timer=setTimeout(poll,2000);return()=>{controller.abort();clearTimeout(timer);clearTimeout(stopTimer);document.removeEventListener('visibilitychange',pause);};
 },[initial]);
 const confirmed=state.status==="succeeded"&&state.access==="active";
 return <section className="simple-panel"><h1>{confirmed?(state.test===false?"Payment confirmed.":"Test payment confirmed."):state.access==="suspended"?(state.test===false?"Purchase access is suspended.":"Test purchase access is suspended."):state.access==="revoked"?(state.test===false?"Purchase access has been revoked.":"Test purchase access has been revoked."):state.status==="failed"?"Checkout was not completed.":cancelled?"Your Free Snapshot is still saved.":"Payment confirmation is being verified."}</h1><p role="status">{confirmed?(state.fulfilment?progressLabel(state.fulfilment.state):"Your payment is confirmed. Report progress is temporarily unavailable; check your Account shortly."):cancelled&&state.status==="pending"?"You can return to your Snapshot or try Checkout again.":finished?"Verification has paused. Refresh or check your Account shortly.":"Your original Snapshot remains unchanged."}</p>{confirmed&&state.fulfilment?.stage&&<p role="status">{({context:"Interpreting local context",premises:"Interpreting premises evidence",synthesis:"Preparing the report",validating:"Validating and saving"} as Record<string,string>)[state.fulfilment.stage]}</p>}{confirmed&&finished&&["queued","running"].includes(state.fulfilment?.state??"")&&<p>Progress refresh has paused. Your saved progress is available when you return.</p>}{confirmed&&state.fulfilment?.state==='ready'&&state.fulfilment.reportId&&<Link className="button button-primary" href={`/reports/${state.fulfilment.reportId}`}>Open your stored report</Link>}<Link className="button button-secondary" href={`/snapshots/${state.report}`}>Return to your Snapshot</Link><Link href="/account">Your account</Link>{initial.confirmationAvailable&&<a className="button button-secondary" href={`/purchase/confirmation?purchase=${initial.id}`}>Download contract confirmation</a>}{state.status==="succeeded"&&<PurchaseRequest purchase={state.id}/>}</section>;
}

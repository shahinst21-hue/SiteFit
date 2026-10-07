"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
type State={id:string;report:string;status:string;access:string};
export function PurchaseStatus({initial,cancelled}:{initial:State;cancelled:boolean}){
 const [state,setState]=useState(initial),[finished,setFinished]=useState(false);
 useEffect(()=>{
  if(initial.status!=="pending")return;
  const controller=new AbortController();const deadline=Date.now()+30000;let timer:ReturnType<typeof setTimeout>;
  const stopTimer=setTimeout(()=>{controller.abort();clearTimeout(timer);setFinished(true);},30000);
  const pause=()=>{if(document.hidden){controller.abort();clearTimeout(timer);clearTimeout(stopTimer);setFinished(true);}};
  document.addEventListener('visibilitychange',pause);
  async function poll(){
   if(controller.signal.aborted)return;
   if(Date.now()>=deadline||document.hidden){setFinished(true);return;}
   try{
    const response=await fetch(`/purchase/status?purchase=${encodeURIComponent(initial.id)}`,{cache:"no-store",signal:controller.signal});
    const value:unknown=await response.json();
    if(response.ok&&value&&typeof value==="object"&&"id" in value&&value.id===initial.id&&"status" in value&&typeof value.status==="string"&&"access" in value&&typeof value.access==="string"){
     setState({...initial,status:value.status,access:value.access});if(value.status!=="pending"){clearTimeout(stopTimer);setFinished(true);return;}
    }
   }catch{if(controller.signal.aborted)return;}
   timer=setTimeout(poll,2000);
  }
  timer=setTimeout(poll,2000);return()=>{controller.abort();clearTimeout(timer);clearTimeout(stopTimer);document.removeEventListener('visibilitychange',pause);};
 },[initial]);
 const confirmed=state.status==="succeeded"&&state.access==="active";
 return <section className="simple-panel"><h1>{confirmed?"Test payment confirmed.":state.access==="suspended"?"Test purchase access is suspended.":state.access==="revoked"?"Test purchase access has been revoked.":state.status==="failed"?"Checkout was not completed.":cancelled?"Your Free Snapshot is still saved.":"Payment confirmation is being verified."}</h1><p role="status">{confirmed?"Full Report generation is not enabled in this development phase.":cancelled&&state.status==="pending"?"You can return to your Snapshot or try Checkout again.":finished?"Verification has paused. Refresh or check your Account shortly.":"Your original Snapshot remains unchanged."}</p><Link className="button button-secondary" href={`/snapshots/${state.report}`}>Return to your Snapshot</Link><Link href="/account">Your account</Link></section>;
}

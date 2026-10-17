"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {PurchaseRequest} from './purchase-request';
import {GenerationProgress} from './generation-progress';
import {fullView} from '../lib/generation-progress';
import {parseProgress,type Progress} from '../lib/fulfilment/policy';
type State={test?:boolean;id:string;report:string;status:string;access:string;confirmationAvailable?:boolean;confirmationDelivered?:boolean|null;fulfilment?:Progress|null};
export function PurchaseStatus({initial,cancelled}:{initial:State;cancelled:boolean}){
 return <PurchaseStatusSession key={initial.id} initial={initial} cancelled={cancelled}/>;
}
function PurchaseStatusSession({initial,cancelled}:{initial:State;cancelled:boolean}){
 const [state,setState]=useState(initial),[stale,setStale]=useState(false),[refresh,setRefresh]=useState(0);
 const [lastCompleted,setLastCompleted]=useState(Math.min(4,fullView(initial).completed));
 useEffect(()=>{
  if(!refresh&&initial.status!=='pending'&&!(initial.access==='active'&&['queued','running'].includes(initial.fulfilment?.state??'')))return;
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
  const deadline=setTimeout(()=>{controller.abort();clearTimeout(timer);setStale(true);},300000);
  const visibility=()=>{if(document.hidden){controller.abort();clearTimeout(timer);clearTimeout(deadline);setStale(true);}else setRefresh(n=>n+1);};
  document.addEventListener('visibilitychange',visibility);
  async function poll(){
   if(controller.signal.aborted||document.hidden)return;
   let delay=2000;
   try{
    const response=await fetch(`/purchase/status?purchase=${encodeURIComponent(initial.id)}`,{cache:'no-store',signal:controller.signal});
    const value:unknown=await response.json();
    if(!response.ok||!value||typeof value!=='object'||!('id' in value)||value.id!==initial.id||!('status' in value)||!['pending','succeeded','failed','expired','refunded'].includes(String(value.status))||!('access' in value)||!['none','active','suspended','revoked'].includes(String(value.access)))throw Error('unavailable');
    const fulfilment=parseProgress('fulfilment' in value?value.fulfilment:null);
    const next:State={...initial,status:String(value.status),access:String(value.access),fulfilment,
      confirmationAvailable:'confirmationAvailable' in value&&typeof value.confirmationAvailable==='boolean'?value.confirmationAvailable:initial.confirmationAvailable,
      confirmationDelivered:'confirmationDelivered' in value&&typeof value.confirmationDelivered==='boolean'?value.confirmationDelivered:null};
    setState(next);setStale(false);setLastCompleted(n=>Math.max(n,Math.min(4,fullView(next).completed)));
    if(next.status!=='pending'&&!(next.access==='active'&&['queued','running'].includes(fulfilment?.state??''))){clearTimeout(deadline);return;}
   }catch{if(controller.signal.aborted)return;setStale(true);delay=5000;}
   timer=setTimeout(poll,delay);
  }
  timer=setTimeout(poll,0);
  return()=>{controller.abort();clearTimeout(timer);clearTimeout(deadline);document.removeEventListener('visibilitychange',visibility);};
 },[initial,refresh]);
 const confirmed=state.status==='succeeded'&&state.access==='active';
 const view=fullView(state,lastCompleted);
 return <section className="simple-panel"><p className="eyebrow">YOUR PURCHASE</p><h1>{confirmed?(state.test===false?'Payment confirmed.':'Test payment confirmed.'):cancelled?'Your Snapshot is still saved.':'Your purchase status'}</h1>
  <p className="sr-only" role="status" aria-live="polite">{stale?'Status updates paused.':view.title} {view.completed} of {view.total} steps confirmed.</p>
  <GenerationProgress view={view} stale={stale}/>
  {stale&&<button type="button" className="button button-secondary" onClick={()=>setRefresh(n=>n+1)}>Refresh saved status</button>}
  <div className="purchase-progress-actions">{confirmed&&state.fulfilment?.state==='ready'&&state.fulfilment.reportId&&<Link className="button button-primary" href={`/reports/${state.fulfilment.reportId}`}>Open your Full Report</Link>}
   <Link className="button button-secondary" href={`/snapshots/${state.report}`}>Return to your Snapshot</Link><Link className="button button-secondary" href="/account">Your account</Link>
   {state.confirmationAvailable&&<a className="button button-secondary" href={`/purchase/confirmation?purchase=${state.id}`}>Download contract confirmation</a>}
  </div>{state.status==='succeeded'&&<PurchaseRequest purchase={state.id}/>}
 </section>;
}

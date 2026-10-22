"use client";
import {PurchaseMeasurement} from './measurement-milestone';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {PaymentRetry} from './payment-retry';
import type {CheckoutObservation} from '../lib/payments/webhook';
import {PurchaseRequest} from './purchase-request';
import {GenerationProgress} from './generation-progress';
import {fullView} from '../lib/generation-progress';
import {parseProgress,type Progress} from '../lib/fulfilment/policy';
type State={paymentState?:CheckoutObservation;test?:boolean;id:string;report:string;status:string;access:string;confirmationAvailable?:boolean;confirmationDelivered?:boolean|null;confirmationEmailState?:string|null;fulfilment?:Progress|null};
export function PurchaseStatus({initial,cancelled}:{initial:State;cancelled:boolean}){
 return <PurchaseStatusSession key={initial.id} initial={initial} cancelled={cancelled}/>;
}
function PurchaseStatusSession({initial,cancelled}:{initial:State;cancelled:boolean}){
 const [state,setState]=useState(initial),[stale,setStale]=useState(false),[refresh,setRefresh]=useState(0);
 const [lastCompleted,setLastCompleted]=useState(Math.min(4,fullView(initial).completed));
 useEffect(()=>{
  if(!refresh&&['unpaid','expired','failed'].includes(initial.paymentState??''))return;
  if(!refresh&&initial.status!=='pending'&&!(initial.access==='active'&&['queued','running'].includes(initial.fulfilment?.state??'')))return;
  const controller=new AbortController();let attempts=0,paid=initial.status==='succeeded';let timer:ReturnType<typeof setTimeout>;
  let deadline=setTimeout(()=>{controller.abort();clearTimeout(timer);setStale(true);},initial.status==='succeeded'?300000:30000);
  const visibility=()=>{if(document.hidden){controller.abort();clearTimeout(timer);clearTimeout(deadline);setStale(true);}else setRefresh(n=>n+1);};
  document.addEventListener('visibilitychange',visibility);
  async function poll(){
   if(controller.signal.aborted||document.hidden)return;
   if(!paid&&attempts++>=3){clearTimeout(deadline);setStale(true);return;}
   let delay=2000;
   try{
    const response=await fetch(`/purchase/status?purchase=${encodeURIComponent(initial.id)}`,{cache:'no-store',signal:controller.signal});
    const value:unknown=await response.json();
    if(!response.ok||!value||typeof value!=='object'||!('id' in value)||typeof value.id!=='string'||!('report' in value)||value.report!==initial.report||!('status' in value)||!['pending','succeeded','failed','expired','refunded'].includes(String(value.status))||!('access' in value)||!['none','active','suspended','revoked'].includes(String(value.access)))throw Error('unavailable');
    const fulfilment=parseProgress('fulfilment' in value?value.fulfilment:null);
    const paymentState='paymentState' in value&&['unpaid','expired','failed','paid','pending','unknown'].includes(String(value.paymentState))?value.paymentState as CheckoutObservation:'unknown';
    const next:State={...initial,id:value.id,paymentState,status:String(value.status),access:String(value.access),fulfilment,
      confirmationAvailable:'confirmationAvailable' in value&&typeof value.confirmationAvailable==='boolean'?value.confirmationAvailable:initial.confirmationAvailable,
      confirmationEmailState:'confirmationEmailState' in value&&typeof value.confirmationEmailState==='string'?value.confirmationEmailState:null,
      confirmationDelivered:'confirmationDelivered' in value&&typeof value.confirmationDelivered==='boolean'?value.confirmationDelivered:null};
    if(!paid&&next.status==='succeeded'&&next.access==='active'){paid=true;clearTimeout(deadline);deadline=setTimeout(()=>{controller.abort();clearTimeout(timer);setStale(true);},300000);}
    setState(next);setStale(false);setLastCompleted(n=>Math.max(n,Math.min(4,fullView(next).completed)));
    if(['unpaid','expired','failed'].includes(next.paymentState??'')){clearTimeout(deadline);return;}
    if(next.status!=='pending'&&!(next.access==='active'&&['queued','running'].includes(fulfilment?.state??''))){clearTimeout(deadline);return;}
   }catch{if(controller.signal.aborted)return;setStale(true);delay=5000;}
   timer=setTimeout(poll,delay);
  }
  timer=setTimeout(poll,0);
  return()=>{controller.abort();clearTimeout(timer);clearTimeout(deadline);document.removeEventListener('visibilitychange',visibility);};
 },[initial,refresh]);
 const confirmed=state.status==='succeeded'&&state.access==='active';
 const view=fullView(state,lastCompleted);
 if(!confirmed){
  const incomplete=['unpaid','expired','failed'].includes(state.paymentState??'');
  return <section data-return={cancelled?"cancel":"return"} className="simple-panel payment-recovery" aria-labelledby="payment-recovery-title"><p className="eyebrow">YOUR PURCHASE</p><h1 id="payment-recovery-title">{incomplete?"Your payment wasn't completed":state.paymentState==='pending'?'Your payment is still processing':"We couldn't verify your payment yet"}</h1><p>{incomplete?"Your Full Report hasn't been purchased yet. Your Snapshot is saved, and you can try again whenever you're ready.":'Please check the saved payment status before trying another payment. Your Snapshot is safe; no new purchase is made by checking.'}</p><div className="purchase-progress-actions">{incomplete&&<PaymentRetry purchase={state.id} report={state.report}/>}<Link className="button button-secondary" href={`/snapshots/${state.report}`}>Return to Snapshot</Link></div><button type="button" className="button button-text" onClick={()=>setRefresh(n=>n+1)}>{stale?'Check payment status again':'Check payment status'}</button></section>;
 }

 return <section className="simple-panel"><PurchaseMeasurement id={state.id}/>
<p className="eyebrow">YOUR PURCHASE</p><h1>{state.test===false?'Payment confirmed.':'Test payment confirmed.'}</h1>
  <p className="sr-only" role="status" aria-live="polite">{stale?'Status updates paused.':view.title} {view.completed} of {view.total} steps confirmed.</p>
  <GenerationProgress view={view} stale={stale}/>
  {stale&&<button type="button" className="button button-secondary" onClick={()=>setRefresh(n=>n+1)}>Refresh saved status</button>}
  <div className="purchase-progress-actions">{confirmed&&state.fulfilment?.state==='ready'&&state.fulfilment.reportId&&<Link className="button button-primary" href={`/reports/${state.fulfilment.reportId}`}>Open your Full Report</Link>}
   <Link className="button button-secondary" href={`/snapshots/${state.report}`}>Return to your Snapshot</Link><Link className="button button-secondary" href="/account">Your account</Link>
   {confirmed&&state.confirmationAvailable&&<a className="button button-secondary" href={`/purchase/confirmation?purchase=${state.id}`}>Download contract confirmation</a>}
  </div>{state.status==='succeeded'&&<PurchaseRequest purchase={state.id}/>}
 </section>;
}

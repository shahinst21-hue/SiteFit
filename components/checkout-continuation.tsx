"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {purchaseNavigation,PurchaseNavigationError} from '../lib/payments/purchase-navigation';
import type {SaleConsent} from '../lib/legal/sale';
/** Only a server-verified, signed human checkout intent reaches this component. */
export function CheckoutContinuation({report,consent}:{report:string;consent:SaleConsent}){
 const started=useRef(false),[error,setError]=useState(''),[retrying,setRetrying]=useState(false);
 async function continuePurchase(){
  setRetrying(true);setError('');
  try{window.location.assign(await purchaseNavigation(report,true,window.location.origin,fetch,consent));}
  catch(e){setError(e instanceof PurchaseNavigationError?e.message:'We could not reach secure payment. Your Snapshot is saved. Check your connection and retry safely.');setRetrying(false);}
 }
 useEffect(()=>{if(started.current)return;started.current=true;
 void purchaseNavigation(report,true,window.location.origin,fetch,consent).then(url=>window.location.assign(url)).catch(e=>setError(e instanceof PurchaseNavigationError?e.message:'We could not reach secure payment. Your Snapshot is saved. Check your connection and retry safely.'));
 },[report,consent]);
 return <div className="page-wrap narrow-page"><h1>{error?'You are signed in. Payment needs another step.':"You're signed in. Continuing your purchase…"}</h1><p role="status">{error||'Your original Snapshot and purchase choices are saved. Opening secure payment…'}</p>{error&&<button className="button button-primary" disabled={retrying} onClick={()=>void continuePurchase()}>{retrying?'Checking your purchase…':'Retry secure payment'}</button>}<Link className="text-link" href={`/snapshots/${report}?purchase=1`}>Return to your Snapshot</Link></div>;
}

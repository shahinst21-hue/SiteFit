"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {purchaseNavigation} from '../lib/payments/purchase-navigation';
import type {SaleConsent} from '../lib/legal/sale';
/** Only a server-verified, signed human checkout intent reaches this component. */
export function CheckoutContinuation({report,consent}:{report:string;consent:SaleConsent}){
 const started=useRef(false),[error,setError]=useState(false);
 useEffect(()=>{if(started.current)return;started.current=true;
 void purchaseNavigation(report,true,window.location.origin,fetch,consent).then(url=>window.location.assign(url)).catch(()=>setError(true));
 },[report,consent]);
 return <div className="page-wrap narrow-page"><h1>{error?'Payment could not open.':'Opening secure payment…'}</h1><p role="status">{error?'Your Snapshot is saved. Return to it to continue.':'Your selected location and purchase choices have been kept.'}</p><Link className="text-link" href={`/snapshots/${report}?purchase=1`}>Return to your Snapshot</Link></div>;
}

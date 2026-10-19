"use client";
import {useState} from 'react';
import {retryPurchaseNavigation} from '../lib/payments/purchase-navigation';
export function PaymentRetry({purchase,report}:{purchase:string;report:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <><button className="button button-primary" type="button" disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);setError('');try{window.location.assign(await retryPurchaseNavigation(purchase,report,window.location.origin));}catch{setError('We could not verify a safe payment retry. Check payment status before trying again.');setBusy(false);}}}>{busy?'Opening secure payment…':'Try payment again'}</button>{error&&<p role="alert" className="field-error">{error}</p>}</>;
}

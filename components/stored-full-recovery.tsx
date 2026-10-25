'use client';
import {useState} from 'react';
export function StoredFullRecovery({paymentId}:{paymentId:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function recover(){
  if(busy)return;setBusy(true);setError('');
  try{
   const r=await fetch('/api/reports/recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentId}),signal:AbortSignal.timeout(30000)}),body=await r.json();
   if(!r.ok||typeof body.reportId!=='string'||!(/^[0-9a-f-]{36}$/i.test(body.reportId)))throw Error(typeof body.error==='string'?body.error:'Saved recovery could not be confirmed.');
   window.location.assign(`/reports/${body.reportId}`);
  }catch(e){setError(e instanceof Error?e.message:'Saved recovery could not be confirmed.');}finally{setBusy(false);}
 }
 return <><button type="button" className="button button-secondary" disabled={busy} onClick={()=>void recover()}>{busy?'Checking saved report…':'Recover completed report'}</button>{error&&<p role="alert">{error}</p>}</>;
}

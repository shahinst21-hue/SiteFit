'use client';
import {useState} from 'react';
import {Arrow} from './ui';
export function SavedSnapshotRecovery({propertyId,businessType}:{propertyId:string;businessType:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function recover(){
  if(busy)return;setBusy(true);setError('');
  try{
   const r=await fetch('/api/analyses/recover',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({propertyId,businessType,nonce:crypto.randomUUID()}),signal:AbortSignal.timeout(65000)});
   const body=await r.json();
   if(!r.ok||typeof body.reportId!=='string'||!(/^[0-9a-f-]{36}$/i.test(body.reportId)))throw Error(typeof body.error==='string'?body.error:'Saved recovery could not be confirmed.');
   window.location.assign(`/snapshots/${body.reportId}`);
  }catch(e){setError(e instanceof Error?e.message:'Saved recovery could not be confirmed.');}finally{setBusy(false);}
 }
 return <><button type="button" className="button button-secondary" disabled={busy} onClick={()=>void recover()}>{busy?'Recovering saved Snapshot…':'Recover saved Snapshot'}<Arrow/></button>{error&&<p role="alert">{error}</p>}</>;
}

"use client";
import {useEffect} from 'react';
import {snapshotEvent} from '@/lib/marketing/snapshot-events';
/** Mounted only when existing measurement authority is enabled; never enables it. */
export function SnapshotMeasurement({reportId}:{reportId:string}){
 useEffect(()=>{
  let alive=true;const sent=new Set<string>();
  async function record(event:string,detail:string){
   try{
    const payload=snapshotEvent({action:'event',report:reportId,event,detail}),key=`${event}:${detail}`;
    if(sent.has(key))return;
    // Recheck consent, including withdrawal, before transmitting an observation.
    const preference=await fetch('/api/campaign',{cache:'no-store',signal:AbortSignal.timeout(1500)}).then(r=>r.json());
    if(!alive||!preference.enabled||!preference.campaign||sent.has(key))return;
    sent.add(key);
    await fetch('/api/campaign',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(1500)});
   }catch{/* No retry, queue, storage, or impact on the purchase/report. */}
  }
  function observe(event:Event){const target=event.target instanceof Element?event.target:null;const node=target?.closest<HTMLElement>('[data-snapshot-event]');if(!node)return;if(event.type==='toggle'&&(!(node instanceof HTMLDetailsElement)||!node.open))return;if(event.type==='click'&&node instanceof HTMLDetailsElement)return;if(node instanceof HTMLButtonElement&&node.disabled)return;void record(node.dataset.snapshotEvent??'',node.dataset.snapshotDetail??'');}
  const view=()=>{void record('snapshot_view','page');};view();
  document.addEventListener('click',observe);document.addEventListener('toggle',observe,true);window.addEventListener('sitefit-measurement-change',view);
  return()=>{alive=false;document.removeEventListener('click',observe);document.removeEventListener('toggle',observe,true);window.removeEventListener('sitefit-measurement-change',view);};
 },[reportId]);return null;
}

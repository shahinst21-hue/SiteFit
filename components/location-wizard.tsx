"use client";
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {flushSync} from 'react-dom';
import {useRouter} from 'next/navigation';
import {businessTypes,type BusinessType} from '@/lib/wizard';
import {Arrow} from './ui';
import {Icon,type IconName} from './icon';
import {useLocationEntry} from './location-entry';
import {AddressLookup,initialAddressLookup} from './address-lookup';
import type {PropertySelection} from '@/lib/addresses/model';
import {GenerationProgress} from './generation-progress';
import {snapshotView} from '../lib/generation-progress';
import {readSnapshotProgress} from '../lib/snapshot-progress-client';
import type {SnapshotTick} from '../lib/analysis/progress';

/** Dependencies come only from the explicitly labelled, server-gated UI rehearsal. */
export type WizardRehearsal={transport:typeof fetch;generate:(observe:(tick:SnapshotTick|{stage:'ready';completed:8})=>void,business:BusinessType)=>Promise<void>};
export function LocationWizard({rehearsal}:{rehearsal?:WizardRehearsal}) {
 const entry=useLocationEntry(),router=useRouter();
 const [property,setProperty]=useState<PropertySelection|null>(null);
 const [lookupState,setLookupState]=useState(()=>initialAddressLookup(entry.address));
 const [initialSearch,setInitialSearch]=useState(entry.address);
 const consumeInitialSearch=useCallback(()=>setInitialSearch(''),[]);
 const [step,setStep]=useState(0),[business,setBusiness]=useState<BusinessType|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [progress,setProgress]=useState<SnapshotTick|{stage:'ready';completed:8}>({stage:'identity',completed:0});
 const nonce=useRef<string|null>(null),heading=useRef<HTMLHeadingElement>(null),keyboard=useRef(false);
 const transition=useRef<ViewTransition|null>(null),previousStep=useRef(0);
 useEffect(()=>entry.clear(),[entry.clear]);
 useEffect(()=>{
  if(previousStep.current!==step){heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'});}
  previousStep.current=step;
 },[step]);
 function moveTo(next:number){
  transition.current?.skipTransition();
  const update=()=>setStep(next);
  if(!keyboard.current&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&document.startViewTransition)
   transition.current=document.startViewTransition(()=>flushSync(update));
  else update();
 }
 async function generate(event:FormEvent){
  event.preventDefault();if(busy||step===2)return;
  if(!property||!business){setError('Choose the business you want to open.');document.getElementById('businessType')?.focus();return;}
  nonce.current??=crypto.randomUUID();setBusy(true);setError('');setProgress({stage:'identity',completed:0});moveTo(2);
  let opening=false;
  try{
   if(rehearsal){await rehearsal.generate(setProgress,business);return;}
   const response=await fetch('/api/analyses/generate',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},
    body:JSON.stringify({propertyId:property.id,businessType:business,nonce:nonce.current}),signal:AbortSignal.timeout(120000)});
   const reportId=await readSnapshotProgress(response,setProgress);opening=true;router.push(`/snapshots/${reportId}`);
  }catch(e){setError(e instanceof Error?e.message:'Your Snapshot could not be confirmed. Check your account before starting again.');}
  finally{if(!opening)setBusy(false);}
 }
 const type=businessTypes.find(t=>t.id===business);
 return <div className="wizard-flow" onKeyDownCapture={()=>{keyboard.current=true;}} onPointerDownCapture={()=>{keyboard.current=false;}}>
  <div className="wizard-topline"><Link href="/" className="wizard-home-link"><Icon name="back"/>Back to SiteFit</Link><span><Icon name="shield"/>Free to start. No card needed.</span></div>
  <nav className="wizard-steps" aria-label="Location check progress"><ol>{['Property','Business','Snapshot'].map((label,index)=><li key={label} className={index===step?'current':index<step?'complete':''} aria-current={index===step?'step':undefined}>
   <span className="wizard-step-dot">{index<step?<Icon name="check"/>:index+1}</span><span>{label}</span>
  </li>)}</ol></nav>
  <div className="wizard-layout"><section className={`wizard-panel wizard-stage wizard-stage-${step}`}>
   <header className="wizard-heading"><p className="eyebrow">{step===2?'YOUR LOCATION CHECK':`STEP ${step+1} OF 3`}</p>
    <h1 ref={heading} tabIndex={-1}>{step===0?'Start with your property.':step===1?'What would you open here?':error?'Your check needs a moment.':'A clearer view is on its way.'}</h1>
    <p>{step===0?'Find the exact premises you’re considering.':step===1?'We’ll focus the evidence on your kind of business.':error?'Keep this request. Check your saved status before starting again.':'We’re bringing together the available evidence for your location.'}</p>
   </header>
   {step===0?<AddressLookup state={lookupState} setState={setLookupState} selected={property} initialSearch={initialSearch} onInitialSearch={consumeInitialSearch} transport={rehearsal?.transport}
    onSelect={selected=>{setProperty(selected);nonce.current=null;setError('');moveTo(1);}}/>:
    step===1?<form onSubmit={generate}>
     <div className="wizard-property"><span className="wizard-property-icon"><Icon name="pin"/></span><div><small>YOUR PROPERTY</small><p>{property?.formattedAddress}</p></div><button type="button" className="wizard-edit" onClick={()=>{setError('');moveTo(0);}}>Change<span className="sr-only"> property</span></button></div>
     {error&&<p className="error-summary" role="alert">{error}</p>}
     <fieldset><legend className="sr-only">Choose the business you want to open here</legend><div className="business-options" id="businessType" tabIndex={-1}>
      {businessTypes.map((t,index)=><label key={t.id} className={`business-option ${business===t.id?'selected':''}`}>
       <input type="radio" name="businessType" value={t.id} checked={business===t.id} required onChange={()=>{setBusiness(t.id);nonce.current=null;setError('');}}/>
       <span className="business-icon" aria-hidden="true"><Icon name={(['coffee','restaurant','hair','beauty'] as IconName[])[index]}/></span>
       <span className="business-option-copy"><strong>{t.label}</strong><span>{t.description}</span></span><span className="business-choice-mark" aria-hidden="true"><Icon name="check"/></span>
      </label>)}
     </div></fieldset>
     <div className="wizard-submit"><p><Icon name="evidence"/>Four perspectives. One initial view.</p><button className="button button-primary" type="submit" disabled={!business}>Get my Free Snapshot<Arrow/></button></div>
     <p className="wizard-session-note"><Icon name="shield"/>No account or card needed. Guest access stays with this browser session.</p>
    </form>:<div className="wizard-processing">
     <div className="wizard-check-context"><Icon name="pin"/><p>{property?.formattedAddress}<small>{type?.label}</small></p></div>
     <div role="status" aria-live="polite" aria-atomic="true"><GenerationProgress view={snapshotView(progress,!!error)}/></div>
     {error?<div className="wizard-paused"><p role="alert">{error}</p><Link href="/account" className="button button-secondary">Check saved status<Arrow/></Link><p>Need a hand? <a href="mailto:info@sitefit.co.uk">Contact SiteFit</a>. Please don’t start another request.</p></div>:<p className="wizard-session-note"><Icon name="clock"/>{busy?'Keep this tab open while your Snapshot is prepared.':'Your Snapshot has been saved.'}</p>}
    </div>}
  </section></div>
  {step<2&&<div className="wizard-assurance"><span><Icon name="demand"/>Customer context</span><span><Icon name="shop"/>Competition</span><span><Icon name="access"/>Access</span><span><Icon name="shield"/>Premises</span></div>}
 </div>;
}

"use client";
import {trackJourney,bindAcquisition} from '@/lib/measurement/client';
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
import {SavedSnapshotRecovery} from './saved-snapshot-recovery';
import {GenerationProgress} from './generation-progress';
import {snapshotView} from '../lib/generation-progress';
import {readSnapshotProgress,SnapshotRequestError} from '../lib/snapshot-progress-client';
import type {SnapshotTick} from '../lib/analysis/progress';

/** Dependencies come only from the explicitly labelled, server-gated UI rehearsal. */
export type WizardRehearsal={transport:typeof fetch;generate:(observe:(tick:SnapshotTick|{stage:'ready';completed:8})=>void,business:BusinessType)=>Promise<void>};
export type SnapshotProofStart={property:PropertySelection;business:BusinessType;nonce:string};
export function LocationWizard({rehearsal,proofStart}:{rehearsal?:WizardRehearsal;proofStart?:SnapshotProofStart}) {
 const entry=useLocationEntry(),router=useRouter();
 const [property,setProperty]=useState<PropertySelection|null>(proofStart?.property??null);
 const [lookupState,setLookupState]=useState(()=>initialAddressLookup(entry.address));
 const [initialSearch,setInitialSearch]=useState(entry.address);
 const consumeInitialSearch=useCallback(()=>setInitialSearch(''),[]);
 const [step,setStep]=useState(proofStart?1:0),[business,setBusiness]=useState<BusinessType|null>(proofStart?.business??null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [outsideCoverage,setOutsideCoverage]=useState(false);
 const [progress,setProgress]=useState<SnapshotTick|{stage:'ready';completed:8}>({stage:'identity',completed:0});
 const nonce=useRef<string|null>(proofStart?.nonce??null),heading=useRef<HTMLHeadingElement>(null),keyboard=useRef(false);
 const transition=useRef<ViewTransition|null>(null),previousStep=useRef(0);
 useEffect(()=>entry.clear(),[entry.clear]);
 useEffect(()=>{
  if(previousStep.current!==step){heading.current?.focus({preventScroll:true});(heading.current?.closest('.wizard-flow')?.querySelector('.wizard-steps')??heading.current)?.scrollIntoView({block:'start',behavior:'instant'});}
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
  event.preventDefault();if(busy||step===2||outsideCoverage)return;
  if(!property||!business){setError('Choose the business you want to open.');document.getElementById('businessType')?.focus();return;}
  nonce.current??=crypto.randomUUID();if(!rehearsal&&!proofStart)trackJourney('free_analysis_started',nonce.current,business);setBusy(true);setError('');setProgress({stage:'identity',completed:0});moveTo(2);
  let opening=false;
  try{
   if(rehearsal){await rehearsal.generate(setProgress,business);return;}
   const response=await fetch('/api/analyses/generate',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},
    body:JSON.stringify({propertyId:property.id,businessType:business,nonce:nonce.current}),signal:AbortSignal.timeout(120000)});
   const reportId=await readSnapshotProgress(response,setProgress);if(!proofStart){trackJourney('free_analysis_completed',reportId,business);void bindAcquisition(reportId);}opening=true;router.push(`/snapshots/${reportId}`);
  }catch(e){if(!rehearsal&&!proofStart)trackJourney('analysis_failed',nonce.current??'unknown',business,e instanceof DOMException&&e.name==='TimeoutError'?'timeout':'unavailable');setError(e instanceof Error?e.message:'Your Snapshot could not be confirmed. Check your account before starting again.');if(e instanceof SnapshotRequestError&&e.code==='outside_analysis_coverage'){setOutsideCoverage(true);moveTo(1);}}
  finally{if(!opening)setBusy(false);}
 }
 const type=businessTypes.find(t=>t.id===business);
 return <div className="wizard-flow" onKeyDownCapture={()=>{keyboard.current=true;}} onPointerDownCapture={()=>{keyboard.current=false;}}>
  <div className="wizard-topline"><Link href="/" className="wizard-home-link"><Icon name="back"/>Back to SiteFit</Link></div>
  <nav className="wizard-steps" aria-label="Location check progress"><ol>{['Property','Business','Snapshot'].map((label,index)=><li key={label} className={index===step?'current':index<step?'complete':''} aria-current={index===step?'step':undefined}>
   <span className="wizard-step-dot">{index<step?<Icon name="check"/>:index+1}</span><span>{label}</span>
  </li>)}</ol></nav>
  <div className="wizard-layout"><section className={`wizard-panel wizard-stage wizard-stage-${step}`}>
   <header className="wizard-heading">
    <h1 ref={heading} tabIndex={-1}>{step===0?'Find your property':step===1?'Choose your business':error?'Check stopped':'Preparing your Snapshot'}</h1>
   </header>
   {step===0?<AddressLookup state={lookupState} setState={setLookupState} selected={property} initialSearch={initialSearch} onInitialSearch={consumeInitialSearch} transport={rehearsal?.transport}
    onSelect={selected=>{if(!rehearsal&&!proofStart)trackJourney('address_selected',selected.id);setProperty(selected);nonce.current=null;setError('');setOutsideCoverage(false);moveTo(1);}}/>:
    step===1?<form onSubmit={generate}>
     <div className="wizard-property"><span className="wizard-property-icon"><Icon name="pin"/></span><div><small>YOUR PROPERTY</small><p>{property?.formattedAddress}</p></div>{!proofStart&&<button type="button" className="wizard-edit" onClick={()=>{setError('');moveTo(0);}}>Change<span className="sr-only"> property</span></button>}</div>
     {error&&<p className="error-summary" role="alert">{error}</p>}
     <fieldset><legend className="sr-only">Choose the business you want to open here</legend><div className="business-options" id="businessType" tabIndex={-1}>
      {businessTypes.map((t,index)=><label key={t.id} className={`business-option ${business===t.id?'selected':''}`}>
       <input type="radio" name="businessType" value={t.id} checked={business===t.id} required disabled={outsideCoverage||!!proofStart&&t.id!==proofStart.business} onChange={()=>{if(!rehearsal&&!proofStart)trackJourney('business_selected',(property?.id??'choice')+':'+t.id,t.id);setBusiness(t.id);nonce.current=proofStart?.nonce??null;setError('');}}/>
       <span className="business-icon" aria-hidden="true"><Icon name={(['coffee','restaurant','hair','beauty'] as IconName[])[index]}/></span>
       <span className="business-option-copy"><strong>{t.label}</strong></span><span className="business-choice-mark" aria-hidden="true"><Icon name="check"/></span>
      </label>)}
     </div></fieldset>
     <div className="wizard-submit">{outsideCoverage?<button className="button button-primary" type="button" onClick={()=>{setError('');moveTo(0);}}>Choose another address<Arrow/></button>:<button className="button button-primary" type="submit" disabled={!business||busy}>Get my Free Snapshot<Arrow/></button>}</div>
    </form>:<div className="wizard-processing">
     <div className="wizard-check-context"><Icon name="pin"/><p>{property?.formattedAddress}<small>{type?.label}</small></p></div>
     <div role="status" aria-live="polite" aria-atomic="true"><GenerationProgress view={snapshotView(progress,!!error)}/></div>
     {error?<div className="wizard-paused"><p role="alert">{error}</p>{!rehearsal&&property&&business&&<SavedSnapshotRecovery propertyId={property.id} businessType={business}/>}<Link href="/account" className="button button-secondary">Check saved status<Arrow/></Link><a className="button button-text" href="mailto:info@sitefit.co.uk">Contact support<Arrow/></a></div>:<p className="wizard-session-note">{busy?'Keep this tab open.':'Snapshot saved.'}</p>}
    </div>}
  </section></div>
 </div>;
}

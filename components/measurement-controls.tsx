"use client";
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {GoogleMeasurement} from '@/lib/measurement/runtime';
import type {MeasurementConfig} from '@/lib/measurement/config';
import {deniedConsent,canMeasure,parseConsent,consentForVisit,type Consent} from '@/lib/measurement/consent';
import {acquisitionFromSearch,type Acquisition} from '@/lib/measurement/attribution';
import {installMeasurement} from '@/lib/measurement/client';
import {Icon} from './icon';
declare global{interface Window{dataLayer?:unknown[];gtag?:(...args:unknown[])=>void;}}
let sharedRuntime:GoogleMeasurement|null=null;
function runtime(config:MeasurementConfig){
 if(sharedRuntime)return sharedRuntime;
 window.dataLayer??=[];
 // Google’s official gtag queue consumes arguments objects, not data-layer event objects.
 // eslint-disable-next-line prefer-rest-params
 window.gtag??=function(){window.dataLayer!.push(arguments);};
 sharedRuntime=new GoogleMeasurement(config,{
  command:(...args)=>window.gtag?.(...args),
  get:key=>sessionStorage.getItem(key),set:(key,value)=>sessionStorage.setItem(key,value),
  disable:value=>{(window as unknown as Record<string,unknown>)[`ga-disable-${config.analytics}`]=value;},
  load:(id,ready)=>{if(config.rehearsal){const marker=document.createElement('script');marker.id='sitefit-google-tag';marker.dataset.localRehearsal='true';document.head.appendChild(marker);ready();return;}const existing=document.getElementById('sitefit-google-tag') as HTMLScriptElement|null;if(existing){if(existing.dataset.ready==='1')ready();else existing.addEventListener('load',ready,{once:true});return;}
   const script=document.createElement('script');script.id='sitefit-google-tag';script.async=true;script.referrerPolicy='no-referrer';script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;script.addEventListener('load',()=>{script.dataset.ready='1';ready();window.dispatchEvent(new Event('sitefit-google-ready'));},{once:true});document.head.appendChild(script);},
 });installMeasurement(sharedRuntime);return sharedRuntime;
}
export function CookiePreferencesButton(){return <button type="button" className="cookie-preferences-link" onClick={()=>window.dispatchEvent(new Event('sitefit-cookie-preferences'))}>Cookie preferences</button>;}
export function MeasurementControls(){
 const pathname=usePathname(),dialog=useRef<HTMLDialogElement>(null),draft=useRef<Acquisition>({}),chosen=useRef<Consent|null>(null);
 const [consent,setConsent]=useState<Consent|null>(null),[banner,setBanner]=useState(false),[ready,setReady]=useState(false),[rehearsal,setRehearsal]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [analytics,setAnalytics]=useState(false),[advertising,setAdvertising]=useState(false),[personalization,setPersonalization]=useState(false);
 useEffect(()=>{
  let alive=true,expiry:ReturnType<typeof setTimeout>|undefined;draft.current=acquisitionFromSearch(window.location.search);
  fetch('/api/measurement/consent',{cache:'no-store',signal:AbortSignal.timeout(3000)}).then(r=>{if(!r.ok)throw Error();return r.json();}).then((v:{config:MeasurementConfig;consent:Consent|null;acquisition:Acquisition})=>{if(!alive)return;let effective=parseConsent(JSON.stringify(v.consent));try{effective=consentForVisit(effective,localStorage.getItem('sitefit_measurement_block')==='1');}catch{effective=null;}setRehearsal(v.config.rehearsal===true);const instance=runtime(v.config);chosen.current=effective;setConsent(effective);instance.navigate(window.location.pathname);instance.update(effective,v.acquisition);const remaining=Date.parse(v.config.debugUntil??'')-Date.now();if(v.config.sharedDebug&&remaining>0)expiry=setTimeout(()=>{instance.update(deniedConsent());window.location.reload();},remaining);setBanner(!effective);setReady(true);}).catch(()=>{if(!alive)return;setBanner(true);setReady(true);});
  const open=()=>{const c=chosen.current;setAnalytics(c?.analytics??false);setAdvertising(c?.advertising??false);setPersonalization(c?.personalization??false);dialog.current?.showModal();};
  window.addEventListener('sitefit-cookie-preferences',open);return()=>{alive=false;clearTimeout(expiry);window.removeEventListener('sitefit-cookie-preferences',open);};
 },[]);
 useEffect(()=>{sharedRuntime?.navigate(pathname);},[pathname]);
 async function save(values:{analytics:boolean;advertising:boolean;personalization:boolean}){
  if(busy)return;setBusy(true);setError('');if(!values.analytics||!values.advertising){sharedRuntime?.update(deniedConsent());try{localStorage.setItem('sitefit_measurement_block','1');}catch{/* Preference still blocks this document. */}}
  try{const response=await fetch('/api/measurement/consent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({preferences:values,acquisition:draft.current}),signal:AbortSignal.timeout(3000)});if(!response.ok)throw Error();
   const v=await response.json() as {consent:Consent;acquisition:Acquisition};const withdrawing=canMeasure(chosen.current)&&!canMeasure(v.consent);
   try{if(canMeasure(v.consent))localStorage.removeItem('sitefit_measurement_block');}catch{/* A blocked preference fails closed next time. */}chosen.current=v.consent;setConsent(v.consent);sharedRuntime?.update(v.consent,v.acquisition);sharedRuntime?.navigate(pathname);setBanner(false);dialog.current?.close();window.dispatchEvent(new Event('sitefit-google-ready'));
   // Unload a previously consented third-party library; subsequent document starts denied and blocked.
   if(withdrawing)window.location.reload();
  }catch{setError('Your choice could not be saved. Optional measurement stays off until a choice is saved.');sharedRuntime?.update(deniedConsent());}finally{setBusy(false);}
 }
 return <>
  {rehearsal&&<aside className="measurement-rehearsal" role="note">Synthetic measurement rehearsal · no Google network, payment, attribution database or report execution.</aside>}
  {ready&&banner&&<section className="measurement-banner" aria-label="Optional cookies"><div><strong>Your choice. Your privacy.</strong><p>Essential cookies keep SiteFit working. With your permission, Google Analytics and Google Ads help us understand visits and purchases. <Link href="/privacy#cookies">Learn more</Link></p></div><div className="measurement-actions"><button type="button" disabled={busy} onClick={()=>save({analytics:true,advertising:true,personalization:true})}>Accept all</button><button type="button" disabled={busy} onClick={()=>save({analytics:false,advertising:false,personalization:false})}>Reject all</button><button type="button" disabled={busy} onClick={()=>window.dispatchEvent(new Event('sitefit-cookie-preferences'))}>Preferences</button></div>{error&&<p role="alert">{error}</p>}</section>}
  <dialog ref={dialog} className="measurement-dialog" aria-labelledby="cookie-title"><header><h2 id="cookie-title">Cookie preferences</h2><button type="button" aria-label="Close cookie preferences" onClick={()=>dialog.current?.close()}><Icon name="close"/></button></header><p>You can use SiteFit and buy a report without optional cookies.</p><div className="measurement-required"><strong>Essential</strong><span>Always on</span><p>Sign-in, security, checkout and remembering your cookie choices.</p></div>
   <label><span><strong>Analytics</strong><small>Understand the report journey and completed purchases.</small></span><input type="checkbox" checked={analytics} onChange={e=>setAnalytics(e.target.checked)}/></label>
   <label><span><strong>Advertising measurement</strong><small>Link permitted campaign clicks to purchases in Google Ads.</small></span><input type="checkbox" checked={advertising} onChange={e=>{setAdvertising(e.target.checked);if(!e.target.checked)setPersonalization(false);}}/></label>
   <label><span><strong>Advertising personalization</strong><small>Allow Google to use consented measurement for personalized advertising.</small></span><input type="checkbox" checked={personalization} disabled={!advertising} onChange={e=>setPersonalization(e.target.checked)}/></label>
   <p className="measurement-note">We use one shared Google tag. For this initial setup, Google measurement stays off unless both Analytics and Advertising measurement are allowed. Personalization is optional.</p>
   <div className="measurement-actions"><button type="button" disabled={busy} onClick={()=>save({analytics:true,advertising:true,personalization:true})}>Accept all</button><button type="button" disabled={busy} onClick={()=>save({analytics:false,advertising:false,personalization:false})}>Reject all</button></div><button type="button" className="button button-primary" disabled={busy} onClick={()=>save({analytics,advertising,personalization})}>Save preferences</button>{consent&&<button type="button" className="cookie-preferences-link" disabled={busy} onClick={()=>save({analytics:false,advertising:false,personalization:false})}>Withdraw optional consent</button>}{error&&<p role="alert">{error}</p>}<Link href="/privacy#cookies">Privacy and cookies</Link>
  </dialog>
 </>;
}

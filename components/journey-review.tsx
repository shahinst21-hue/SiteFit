"use client";
import {useRef,useState,type ReactNode} from 'react';
import {LocationWizard,type WizardRehearsal} from './location-wizard';
import {normaliseManualAddress} from '@/lib/addresses/model';

/** Synthetic transport never delegates to fetch: this rehearsal cannot spend provider credits. */
const transport:typeof fetch=async(input,init)=>{
 const operation=String(input).split('/').pop();
 if(!['lookup','search','resolve','manual'].includes(operation??''))throw new Error('Unsupported rehearsal operation');
 const body=JSON.parse(String(init?.body??'{}'));
 if(operation==='lookup'||operation==='search')return Response.json({postcode:'KT2 7AU',candidates:Array.from({length:12},(_,i)=>({reference:String(i+1),label:`${i+1} Example Court, Sample Street, London, KT2 7AU`}))});
 const address=operation==='manual'?body:{line1:`${body.reference} Example Court`,line2:'Sample Street',town:'London',postcode:'KT2 7AU'};
 return Response.json({property:{...normaliseManualAddress(address),id:'11111111-1111-4111-8111-111111111111',resolvedAt:'2026-10-17T00:00:00Z'}});
};
export function JourneyReview({children}:{children:ReactNode}){
 const [running,setRunning]=useState(false),[complete,setComplete]=useState(false),[result,setResult]=useState(false),[key,setKey]=useState(0);
 const pending=useRef<{observe:Parameters<WizardRehearsal['generate']>[0];resolve:()=>void;reject:(reason:Error)=>void;completed:number}|null>(null);
 const generate:WizardRehearsal['generate']=(observe)=>new Promise<void>((resolve,reject)=>{pending.current={observe,resolve,reject,completed:0};setRunning(true);});
 function advance(){const p=pending.current;if(!p)return;p.completed++;if(p.completed===8){p.observe({stage:'ready',completed:8});p.resolve();pending.current=null;setRunning(false);setComplete(true);}else p.observe({stage:p.completed<2?'sources':p.completed<6?'analysis':p.completed===6?'synthesis':'saving',completed:p.completed});}
 return <><aside className="journey-review-notice"><strong>Interface rehearsal · synthetic data</strong><p>No provider, AI or payment requests. The example result is a fictional coffee-shop Snapshot, independent of your rehearsal selections.</p><div className="journey-review-controls">{running&&<><button className="button button-secondary" onClick={advance}>Advance test milestone</button><button className="button button-secondary" onClick={()=>{pending.current?.reject(new Error('Synthetic interruption. No external request was made.'));pending.current=null;setRunning(false);}}>Simulate interruption</button></>}{complete&&!result&&<button className="button button-primary" onClick={()=>{setResult(true);window.scrollTo(0,0);}}>Open illustrative Snapshot</button>}<button className="button button-secondary" onClick={()=>{pending.current?.resolve();pending.current=null;setRunning(false);setComplete(false);setResult(false);setKey(k=>k+1);}}>Restart rehearsal</button></div></aside>{result?children:<div className="page-wrap check-page"><LocationWizard key={key} rehearsal={{transport,generate}}/></div>}</>;
}

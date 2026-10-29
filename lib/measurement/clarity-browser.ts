import {ClarityMeasurement,clarityPage,clarityProject,type ClarityConfig} from './clarity.ts';
type ClarityFunction=((...args:unknown[])=>void)&{q?:unknown[][];v?:string;t?:boolean};
declare global{interface Window{clarity?:ClarityFunction;}}

/** Guard the hosted two-stage loader as well as its executor, including a navigation during download. */
export function installClarity(config:ClarityConfig){
 const initial=window.location.href;
 const eligible=()=>clarityPage(initial,window.location.origin)&&window.location.href===initial&&(!document.referrer||clarityPage(document.referrer,window.location.origin));
 let executor:ClarityFunction|undefined,blocked=false;
 const queue:unknown[][]=[];
 const facade:ClarityFunction=(...args)=>{
  if(blocked||!measurement.allowed()||!eligible())return;
  if(executor)executor(...args);else queue.push(args);
 };
 // A late tag moves its queued start to the front. After stop, each read gets an empty throwaway queue.
 Object.defineProperty(facade,'q',{get:()=>blocked?[]:queue});
 const stop=()=>{
  if(blocked)return;
  blocked=true;queue.length=0;
  // Denied consentv2 restarts Clarity in cookieless mode. Stop instead: no denied-purpose collection.
  executor?.('stop');document.getElementById('sitefit-clarity-tag')?.remove();
 };
 const measurement=new ClarityMeasurement(config,{
  load:()=>{
   if(window.clarity||!eligible()){measurement.stop();return;}
   try{
    Object.defineProperty(window,'clarity',{configurable:true,get:()=>facade,set:(value:ClarityFunction)=>{if(!blocked)executor=value;}});
    // Never allow the vendor's history proxy to see an active recorder after a URL change.
    for(const method of ['pushState','replaceState'] as const){
     const original=window.history[method];
     window.history[method]=function(data:unknown,unused:string,url?:string|URL|null){
      if(url!=null&&new URL(url,window.location.href).href!==initial)measurement.stop();
      return original.call(this,data,unused,url);
     };
    }
   }catch{measurement.stop();return;}
   window.addEventListener('popstate',()=>measurement.stop(),true);
   window.addEventListener('hashchange',()=>measurement.stop(),true);
   window.addEventListener('pagehide',()=>measurement.stop(),true);
   // These run before Next/React changes the route or paints a private result.
   document.addEventListener('click',event=>{
    const link=(event.target instanceof Element?event.target.closest('a[href]'):null) as HTMLAnchorElement|null;
    if(link&&link.href!==initial)measurement.stop();
   },true);
   document.addEventListener('submit',()=>measurement.stop(),true);
   const script=document.createElement('script');script.id='sitefit-clarity-tag';script.async=true;script.referrerPolicy='no-referrer';
   if(config.rehearsal){script.dataset.localRehearsal='true';}else{
    script.src=`https://www.clarity.ms/tag/${clarityProject}`;
    script.addEventListener('error',()=>measurement.stop(),{once:true});
   }
   facade('consentv2',{analytics_Storage:'granted',ad_Storage:'granted'});
   document.head.appendChild(script);
  },stop,
 });
 return {measurement,eligible};
}

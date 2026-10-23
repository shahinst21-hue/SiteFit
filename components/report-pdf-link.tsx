"use client";
import {useState,type ReactNode} from 'react';
import {measurementAllowed,trackJourney} from '@/lib/measurement/client';
/** Native link remains the no-consent/modifier-key fallback. Track only a successful PDF response, never a click alone. */
export function ReportPdfLink({report,business,section,children}:{report:string;business:string;section?:string;children:ReactNode}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const href=`/reports/${report}/pdf${section?'?section='+encodeURIComponent(section):''}`;
 return <><a href={href} aria-busy={busy} onClick={async e=>{if(!measurementAllowed()||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();if(busy)return;setBusy(true);setError('');
 try{const response=await fetch(href,{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('application/pdf'))throw Error();const blob=await response.blob();const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`sitefit-${section??'full-report'}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);trackJourney('pdf_downloaded',report+':'+(section??'full-report'),business);
 }catch{setError('PDF could not be downloaded. Your report is unchanged. Please try again.');}finally{setBusy(false);}}}>{busy?'Preparing PDF…':children}</a>{error&&<p role="status">{error}</p>}</>;
}

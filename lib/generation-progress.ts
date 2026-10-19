import type {SnapshotTick} from './analysis/progress.ts';
export type ProgressView={label:string;title:string;detail:string;completed:number;total:number;state:'working'|'waiting'|'paused'|'ready'|'error'};
export function snapshotView(tick:SnapshotTick|{stage:'ready';completed:8},error=false):ProgressView{
 const titles={identity:'Preparing your location check',sources:'Checking the available evidence',analysis:'Finding what matters for your business',synthesis:'Bringing your findings together',saving:'Saving your Snapshot',ready:'Your Snapshot is ready'};
 return {label:'Free Snapshot',title:error?'Your check has paused':titles[tick.stage],detail:error?'Saved progress retained. Do not start again.':tick.stage==='ready'?'Your Snapshot is saved.':'Showing completed steps.',completed:tick.completed,total:8,state:error?'error':tick.stage==='ready'?'ready':'working'};
}
type PurchaseProgress={status:string;access:string;confirmationDelivered?:boolean|null;fulfilment?:{state:string;reportId:string|null;stage?:string}|null};
export function fullView(p:PurchaseProgress,lastCompleted=0):ProgressView{
 const base={label:'Full Report',total:5};
 if(p.status!=='succeeded'||p.access!=='active')return {...base,completed:0,state:p.status==='pending'?'waiting':'paused',title:p.status==='pending'?'Confirming your payment':'Report preparation is paused',detail:'Check this purchase before paying again. No new payment is made here.'};
 const f=p.fulfilment;
 if(f?.state==='ready'&&f.reportId)return {...base,completed:5,state:'ready',title:'Your Full Report is ready',detail:'Open your report or download your PDF. Your 30-day access starts from Ready.'};
 if(!f||['intervention','awaiting_authorisation'].includes(f.state))return {...base,completed:Math.min(lastCompleted,4),state:'paused',title:'Your saved report needs a check',detail:'Your purchase is recorded. Do not buy again; check your account or contact info@sitefit.co.uk.'};
 if(f.state==='queued')return {...base,completed:0,state:'waiting',title:p.confirmationDelivered===false?'Waiting for contract confirmation':'Your report is in the queue',detail:p.confirmationDelivered===false?'Check your email. Preparation starts once the required confirmation is recorded.':'You can leave this page. Your saved report will continue when processing starts.'};
 // Context and premises are parallel. A premises intent does NOT prove context completion.
 const n=f.stage==='validating'?4:f.stage==='synthesis'?3:['context','premises'].includes(f.stage??'')?1:0;
 return {...base,completed:Math.max(n,Math.min(lastCompleted,4)),state:'working',title:f.stage==='validating'?'Checking and saving your report':f.stage==='synthesis'?'Shaping your decision and next steps':n?'Reviewing your location and premises':'Preparing your report',detail:'Progress follows confirmed milestones, not time remaining. You can leave and return through your account.'};
}
export function progressPercent(view:Pick<ProgressView,'completed'|'total'>){return Math.round(Math.max(0,Math.min(view.total,view.completed))/view.total*100);}

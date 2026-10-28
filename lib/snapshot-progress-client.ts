import type {SnapshotTick} from './analysis/progress.ts';
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export class SnapshotRequestError extends Error {
 readonly code:'outside_analysis_coverage';
 constructor(message:string,code:'outside_analysis_coverage'){super(message);this.name='SnapshotRequestError';this.code=code;}
}
function requestError(value:{error?:unknown;code?:unknown}){
 const message=typeof value.error==='string'?value.error:'Your check could not be completed.';
 return value.code==='outside_analysis_coverage'?new SnapshotRequestError(message,value.code):Error(message);
}
export async function readSnapshotProgress(response:Response,observe:(tick:SnapshotTick|{stage:'ready';completed:8})=>void):Promise<string>{
 const acceptReady=(id:unknown)=>{if(typeof id!=='string'||!uuid.test(id))throw Error('Your saved Snapshot could not be confirmed.');observe({stage:'ready',completed:8});return id;};
 if(!response.headers.get('content-type')?.includes('application/x-ndjson')){const result=await response.json();if(!response.ok){const p=result.progress;if(p?.stage==='analysis'&&Number.isInteger(p.completed)&&p.completed>=2&&p.completed<=6)observe({stage:'analysis',completed:p.completed});throw requestError(result);}return acceptReady(result.reportId);}
 if(!response.ok||!response.body)throw Error('Progress is temporarily unavailable.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',bytes=0,previous=0;
 try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>16384)throw Error('Progress could not be read safely.');pending+=decoder.decode(part.value,{stream:true});
  let end:number;while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);if(!line)continue;const value=JSON.parse(line);
   if(value.type==='error'){
    const p=value.progress;
    if(p?.stage==='analysis'&&Number.isInteger(p.completed)&&p.completed>=Math.max(2,previous)&&p.completed<=6)observe({stage:'analysis',completed:p.completed});
    throw requestError(value);
   }
   if(value.type==='ready')return acceptReady(value.reportId);
   if(value.type!=='progress'||!['identity','sources','analysis','synthesis','saving'].includes(value.stage)||!Number.isInteger(value.completed)||value.completed<previous||value.completed>7||value.completed<0)throw Error('Progress could not be confirmed.');
   previous=value.completed;observe({stage:value.stage,completed:value.completed});
  }
 }throw Error('The connection ended before your saved Snapshot was confirmed.');}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}

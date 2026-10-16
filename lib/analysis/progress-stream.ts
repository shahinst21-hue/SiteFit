import type {SnapshotObserver} from './progress.ts';
/** Existing owned/authenticated POST only; no new route, job, retry or provider. */
export function snapshotStream(produce:(observer:SnapshotObserver)=>Promise<{reportId:string}>,failure:(error:unknown)=>Response){
 let closed=false;
 const stream=new ReadableStream<Uint8Array>({async start(controller){
  const send=(value:unknown)=>{if(!closed)try{controller.enqueue(new TextEncoder().encode(JSON.stringify(value)+'\n'));}catch{closed=true;}};
  send({type:'progress',stage:'identity',completed:0});
  try{const result=await produce(tick=>send({type:'progress',...tick}));send({type:'ready',reportId:result.reportId});}
  catch(error){const reply=failure(error);send({type:'error',status:reply.status,...await reply.json()});}
  finally{if(!closed){closed=true;controller.close();}}
 },cancel(){closed=true;}});
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Accel-Buffering':'no'}});
}

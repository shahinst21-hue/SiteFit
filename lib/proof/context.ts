import {AsyncLocalStorage} from 'node:async_hooks';
import {createHash} from 'node:crypto';
import {proofLimits} from './limits.ts';

export type ProofStore={reserve:(key:string,kind:string,digest:string,micros:number,slot?:string)=>Promise<string>;
 settle:(id:string,state:'received'|'ambiguous',digest:string|null,checkpoint?:string)=>Promise<void>;
 received?:(key:string)=>Promise<string|null>};
export type ProofScope={stage:'snapshot'|'full';store:ProofStore;inputRate:number;outputRate:number;fetcher?:typeof fetch;frozenInput?:{analysisId:string;inputId:string}};
const scopes=new AsyncLocalStorage<ProofScope>();
const processingChecks=new AsyncLocalStorage<()=>Promise<void>>();
export const runProcessingScope=<T>(check:()=>Promise<void>,run:()=>Promise<T>)=>processingChecks.run(check,run);
export const inControlledProof=()=>!!scopes.getStore();
export const proofFrozenInput=()=>scopes.getStore()?.frozenInput;
export const runProofScope=<T>(scope:ProofScope,run:()=>Promise<T>)=>scopes.run(scope,run);
const sha=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');

/** Only external provider transports use this boundary. SQL/Auth traffic never does.
 * Every intent must commit before fetch. A lost acknowledgement is never send authority. */
export const proofFetch:typeof fetch=async(input,init)=>{
 await processingChecks.getStore()?.();
 const scope=scopes.getStore();if(!scope)return fetch(input,init);
 if(input instanceof Request)throw Error('proof_request_shape');
 const url=new URL(String(input)),body=init?.body;
 if(url.protocol!=='https:'||body!==undefined&&typeof body!=='string')throw Error('proof_request_shape');
 const paths:Record<string,RegExp>={
  'api.openai.com':/^\/v1\/responses$/,'api.propertydata.co.uk':/^\/(uprns|uprn|flood-risk|rents-commercial)$/,
  'api.geoapify.com':/^\/v1\/(isoline|routematrix)$/,'api.tfl.gov.uk':/^\/StopPoint$/,
  'api.ratings.food.gov.uk':/^\/Establishments\/?$/,
  'api.get-energy-performance-data.communities.gov.uk':/^\/api\/(non-domestic\/search|certificate)$/,
 };
 if(!paths[url.hostname]?.test(url.pathname)||url.username||url.password||url.port)throw Error('proof_external_operation_denied');
 const ai=url.hostname==='api.openai.com';let micros=0,slot:string|undefined;
 if(ai){
  const r=JSON.parse(String(body));
  const cap=scope.stage==='snapshot'?1800:6000;
  if(r.model!=='gpt-6.1-sol'||r.service_tier!=='default'||r.store!==false||r.tools||r.background||
    !Number.isSafeInteger(r.max_output_tokens)||r.max_output_tokens<1||r.max_output_tokens>cap||Buffer.byteLength(String(body))>proofLimits.maxEncodedAiBytes)throw Error('proof_ai_request_denied');
  // Deliberately conservative byte + framing admission reserve, not a provider invoice guarantee.
  micros=Math.ceil((Buffer.byteLength(String(body))+proofLimits.framingTokens)*scope.inputRate+r.max_output_tokens*scope.outputRate);
  if(scope.store.received){const packet=JSON.parse(r.input?.[0]?.content?.[0]?.text??'null');slot=['validated-synthesis-v1','snapshot-advisor-v1','snapshot-advisor-v2'].includes(packet?.version)?'synthesis':packet?.section;if(!['customer-base','market-position','customer-access','premises','synthesis'].includes(slot??''))throw Error('proof_ai_slot_denied');}
 }
 const identityUrl=new URL(url);
 for(const key of [...identityUrl.searchParams.keys()])if(/^(?:api_?key|key|token|app_?key)$/i.test(key))identityUrl.searchParams.delete(key);
 identityUrl.searchParams.sort();
 const digest=sha(JSON.stringify([init?.method??'GET',identityUrl.href,body??'']));
 if(ai&&scope.store.received){const prior=await scope.store.received(digest);if(prior!==null)return new Response(prior,{headers:{'content-type':'application/json'}});}
 const id=await scope.store.reserve(digest,ai?'ai':url.hostname,digest,micros,slot);
 try{
  const response=await(scope.fetcher??fetch)(input,{...init,redirect:'error'});
  if(!response.ok){await response.body?.cancel();throw Error('proof_external_outcome_unknown');}
  const limit=ai?128000:2000000,reader=response.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
  if(!reader)throw Error('proof_empty_response');
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();throw Error('proof_response_bounds');}chunks.push(part.value);}
  const bytes=Buffer.concat(chunks);
  // Only continuation AI checkpoints are retained: generated output/usage, never
  // provider headers, credentials or raw FSA bodies. They cannot authorise resend.
  let checkpoint:string|undefined;
  if(ai&&scope.store.received){const parsed=JSON.parse(bytes.toString('utf8'));checkpoint=JSON.stringify({status:parsed.status,model:parsed.model,output:parsed.output,usage:parsed.usage});}
  await scope.store.settle(id,'received',sha(bytes),checkpoint);
  const headers=new Headers(response.headers);headers.delete('content-encoding');headers.delete('content-length');
  return new Response(bytes,{status:response.status,statusText:response.statusText,headers});
 }catch{
  // Includes response/body/settlement failures. No retry or reservation release.
  try{await scope.store.settle(id,'ambiguous',null);}catch{/* durable intent remains blocking */}
  throw Error('proof_manual_reconciliation_required');
 }
};

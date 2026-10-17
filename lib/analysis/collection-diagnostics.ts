import {errorCodes,sourceIds} from '../data/contracts.ts';
import {SourceError} from '../data/errors.ts';

export type CollectionGroup='local-context'|'walking-catchments'|'station-access'|'premises'|'native-context'|'epc';
type Diagnostic={group:CollectionGroup;code:string;status:number|null};
type Reporter=(event:string,detail:unknown)=>void;
const report:Reporter=(event,detail)=>console.warn(event,detail);
/** Log finite codes only. Never copy an upstream message, request, address or response. */
export function collectionDiagnostic(group:CollectionGroup,error:unknown):Diagnostic{
 if(error instanceof SourceError&&errorCodes.includes(error.safe.code))return {group,code:error.safe.code,status:Number.isInteger(error.safe.status)&&error.safe.status!>=100&&error.safe.status!<=599?error.safe.status:null};
 if(error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError'))return {group,code:error.name==='TimeoutError'?'timeout':'cancelled',status:null};
 return {group,code:'unclassified',status:null};
}
export async function traceCollection<T>(group:CollectionGroup,run:()=>Promise<T>,emit:Reporter=report):Promise<T>{
 try{return await run();}catch(error){try{emit('snapshot_collection_failure',collectionDiagnostic(group,error));}catch{/* Diagnostics never change execution. */}throw error;}
}
export function reportMissingSources(groups:readonly {outcomes:readonly {source:string;snapshot:unknown;error:{code:string}|null}[]}[],emit:Reporter=report){
 const missing=groups.flatMap(g=>g.outcomes.filter(o=>!o.snapshot&&sourceIds.includes(o.source as typeof sourceIds[number])).map(o=>({source:o.source,code:errorCodes.includes(o.error?.code as typeof errorCodes[number])?o.error!.code:'unclassified'})));
 try{emit('snapshot_collection_missing',{missing});}catch{/* Preserve the original persistence failure. */}
}

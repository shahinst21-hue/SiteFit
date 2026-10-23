import { safeError } from './errors.ts';
/** At most two attempts for an idempotent PRIVATE local-release read. Never
 * use for a paid provider, AI, writes, or an ambiguous external dispatch. */
export async function nativeRead<T>(read:()=>Promise<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted();
 try{return await read();}catch(error){
  if(signal.aborted||!['timeout','provider_unavailable'].includes(safeError(error).code))throw error;
  signal.throwIfAborted();return read();
 }
}

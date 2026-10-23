import 'server-only';
import {createHash} from 'node:crypto';
import {trialRpc} from './trial.ts';
import {uuid} from '../data/validation.ts';
import {normalisePostioAddress} from '../addresses/postio.ts';
import {validReference,hasControlCharacters} from '../addresses/model.ts';
function checkpoint(body:string,search:boolean){
 const value=JSON.parse(body);
 if(!value||value.success!==true||!Array.isArray(value.results)||value.results.length>10000||value.meta?.countResults!==value.results.length)throw Error('trial_address_invalid');
 const fields=['udprn','postcode','address_line_1','address_line_2','address_line_3','post_town','country','latitude','longitude','organisation_name','department_name','sub_building_name','building_name','building_number','thoroughfare','dependent_thoroughfare','dependent_locality','double_dependent_locality','po_box','district','ward'];
 const results=value.results.map((row:Record<string,unknown>)=>{
  if(search){
   const ref=typeof row.udprn==='number'?String(row.udprn):row.udprn;
   if(!validReference(ref)||typeof row.suggestion!=='string'||!row.suggestion.trim()||row.suggestion.length>500||hasControlCharacters(row.suggestion))throw Error('trial_address_invalid');
   return {udprn:ref,suggestion:row.suggestion};
  }
  normalisePostioAddress(row);
  return Object.fromEntries(fields.filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
 });
 // Do not preserve arbitrary upstream fields, headers, debug metadata or request credentials.
 return JSON.stringify({success:true,results,meta:{countResults:results.length}});
}
/** Credentials never enter the identity, persisted checkpoint or operational logs. */
export function trialAddressFetch(owner:string, fetcher:typeof fetch=fetch, invoke=trialRpc):typeof fetch {
 return async(input,init)=>{
  if(input instanceof Request)throw Error('trial_address_shape');
  const url=new URL(String(input));
  if(url.origin!=='https://api.postio.co.uk'||!/^\/v1\/address\/(?:postcode\/[A-Z0-9%]+|udprn\/\d+|search)$/.test(url.pathname)||url.username||url.password||(init?.method??'GET')!=='GET'||init?.body)throw Error('trial_address_shape');
  url.searchParams.sort();
  const common={p_trial:process.env.SITEFIT_CONTROLLED_TRIAL_ID!,p_owner:owner};
  const permit=await invoke('reserve_sitefit_trial_address',{...common,p_key:createHash('sha256').update(url.href).digest('hex')}) as {id:string;token:string;body:string|null};
  if(!permit||!uuid(permit.id)||!uuid(permit.token))throw Error('trial_address_denied');
  if(permit.body!==null){if(typeof permit.body!=='string')throw Error('trial_address_denied');return new Response(permit.body,{headers:{'content-type':'application/json'}});}
  const settle=(body:string|null)=>invoke('settle_sitefit_trial_address',{...common,p_id:permit.id,p_token:permit.token,p_body:body});
  try{
   const response=await fetcher(input,{...init,redirect:'error'});
   if(!response.ok||!response.headers.get('content-type')?.includes('application/json')){await response.body?.cancel();throw Error('trial_address_outcome_unknown');}
   const reader=response.body?.getReader();if(!reader)throw Error('trial_address_outcome_unknown');
   const chunks:Uint8Array[]=[];let size=0;
   for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>512000){await reader.cancel();throw Error('trial_address_bounds');}chunks.push(part.value);}
   const raw=Buffer.concat(chunks).toString('utf8');
   if(process.env.POSTIO_API_KEY&&raw.includes(process.env.POSTIO_API_KEY))throw Error('trial_address_private_response');
   const body=checkpoint(raw,url.pathname.endsWith('/search'));await settle(body);
   return new Response(body,{headers:{'content-type':'application/json'}});
  }catch{try{await settle(null);}catch{/* Unknown durable intent stays blocking. */}throw Error('trial_address_reconciliation_required');}
 };
}

import {STRIPE_WEBHOOK_API_VERSION} from './event-context.ts';
import {PAYMENT_EVENTS} from './webhook.ts';
type Endpoint={url:string;status:string;api_version:string|null;enabled_events:string[]};
/** Administrative inspection is optional with a least-privilege execution key.
 * A missing permission is unknown; an observed mismatch still fails. */
export async function inspectWebhookConfiguration(list:()=>Promise<{data:Endpoint[]}>,origin:string){
 try{
  const endpoints=await list();
  const matching=endpoints.data.filter(e=>e.url===origin+'/api/stripe/webhook'&&e.status==='enabled');
  return {webhook:matching.length===1&&matching[0].api_version===STRIPE_WEBHOOK_API_VERSION&&[...PAYMENT_EVENTS].every(e=>matching[0].enabled_events.includes(e)),webhookInspection:'verified'};
 }catch(error){
  if((error as {statusCode?:number})?.statusCode!==403)throw error;
  return {webhook:null,webhookInspection:'management_permission_unavailable'};
 }
}

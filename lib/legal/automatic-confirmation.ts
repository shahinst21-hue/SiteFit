import 'server-only';
import {createHash} from 'node:crypto';
import {frameworkClient} from '../data/server-client.ts';
import {paymentById} from '../payments/repository.ts';
import {readSale} from './repository.ts';
import {confirmationPDF} from './confirmation.ts';
import {archivedPDF,documentBucket} from './document-archive.ts';
import {packetDigest} from '../analysis/canonical.ts';
import {uuid} from '../data/validation.ts';
import {confirmationEmail} from './confirmation-email.ts';
import {zohoMailTransport} from './zoho-mail.ts';
type Job={paymentId:string;ownerId:string;token:string};
type Rpc={rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:unknown}>};
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
/** One durable claim and at most one email send. Never called by a customer GET. */
export async function deliverOneConfirmation(){
 if(process.env.SITEFIT_ZOHO_EMAIL_ENABLED!=='1')return 'disabled';
 const client=frameworkClient(),rpc=client as unknown as Rpc;
 const invoke=async(name:string,args:Record<string,unknown>={})=>{const r=await rpc.rpc(name,args);if(r.error)throw Error('confirmation_operation_unavailable');return r.data;};
 let job:Job|null=null,intent=false;
 try{
  const raw=await invoke('claim_sitefit_contract_email');if(raw===null)return 'idle';
  job=raw as Job;if(!job||![job.paymentId,job.ownerId,job.token].every(uuid))throw Error('invalid_confirmation_job');
  const transport=zohoMailTransport();
  const payment=await paymentById(job.paymentId);
  if(!payment||payment.owner_id!==job.ownerId||payment.status!=='succeeded'||payment.access_state!=='active'||!payment.verified_at)throw Error('payment_not_confirmed');
  const {data:user,error}=await client.auth.admin.getUserById(job.ownerId);
  if(error||!user.user?.email||!user.user.email_confirmed_at||user.user.is_anonymous)throw Error('recipient_unverified');
  const parameters=payment.attempt_parameters as {customer_email?:unknown}|null;
  if(typeof parameters?.customer_email!=='string'||parameters.customer_email.toLowerCase()!==user.user.email.toLowerCase())throw Error('recipient_changed');
  const sale=await readSale(job.ownerId,job.paymentId) as {version:string;acceptedAt:string;consent:unknown;policy:unknown}|null;
  if(!sale)throw Error('confirmation_unavailable');
  const digest=packetDigest({version:sale.version,acceptedAt:sale.acceptedAt,consent:sale.consent,policy:sale.policy});
  const path=`contracts/${job.paymentId}/${digest}/confirmation.pdf`;
  const bytes=await archivedPDF(path,()=>confirmationPDF(sale));
  const ready=await transport.prepare(bytes),message=confirmationEmail({reference:job.paymentId});
  await invoke('intent_sitefit_contract_email',{p_payment:job.paymentId,p_token:job.token,p_path:path,p_pdf_hash:sha(bytes),p_contract_digest:digest});intent=true;
  const sent=await ready.send(user.user.email,message);
  const receipt=Buffer.from(JSON.stringify({version:'zoho-email-acceptance-v1',purchaseId:job.paymentId,policyVersion:sale.version,pdfSha256:sha(bytes),contractDigest:digest,templateVersion:'sitefit-confirmation-email-v2',...sent,acceptedAt:new Date().toISOString(),recipientInboxDeliveryVerified:false}));
  const receiptPath=`contracts/${job.paymentId}/delivery/${sha(receipt)}/provider-acceptance.json`;
  const saved=await client.storage.from(documentBucket).upload(receiptPath,receipt,{contentType:'application/json',upsert:false});if(saved.error)throw Error('acceptance_archive_unavailable');
  // Retry only database acknowledgement. Never repeat the send after a lost reply.
  let committed=false;for(let n=0;n<3&&!committed;n++){try{await invoke('finish_sitefit_contract_email',{p_payment:job.paymentId,p_token:job.token,p_state:'sent',p_message_id:sent.messageId});committed=true;}catch{if(n===2)throw Error('acceptance_persistence_unavailable');}}
  return 'sent';
 }catch{
  if(job)try{await invoke('finish_sitefit_contract_email',{p_payment:job.paymentId,p_token:job.token,p_state:intent?'uncertain':'not_sent',p_message_id:null});}catch{/* Lease recovery holds intent and never resends it. */}
  return intent?'uncertain':'preparation_unavailable';
 }
}

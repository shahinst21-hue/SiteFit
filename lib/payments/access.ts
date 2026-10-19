import "server-only";
import {reconcileCheckoutPayment,type CheckoutObservation} from './webhook.ts';
import {stripeClient,verifiedStripeAccount} from './stripe.ts';
import {stripeConfig} from './config.ts';
import {readSale} from "../legal/repository.ts";
import { verifiedUser } from "../supabase/server.ts";
import { permanentIdentity,purchaseUuid } from "../auth/purchase-flow.ts";
import { paymentById } from "./repository.ts";
import { fulfilmentRepository } from "../fulfilment/repository.ts";
import { parseProgress, type Progress } from "../fulfilment/policy.ts";
export async function ownedPurchase(id:string,reconcile=false){
 if(!purchaseUuid(id))throw Error("purchase_unavailable");
 const {client,user}=await verifiedUser();if(!client||!permanentIdentity(user))throw Error("purchase_unavailable");
 let payment=await paymentById(id);if(!payment||payment.owner_id!==user.id||!payment.report_id||payment.test_mode!==(process.env.VERCEL_ENV!=="production"))throw Error("purchase_unavailable");
 const {data,error}=await client.rpc("read_sitefit_free",{p_report:payment.report_id});if(error||!data)throw Error("purchase_unavailable");
 const report=payment.report_id;
 if(reconcile){
  const latest=await client.rpc('read_sitefit_purchase',{p_report:report});
  const candidate=latest.data&&typeof latest.data==='object'&&!Array.isArray(latest.data)?latest.data as {id?:unknown}:null;
  if(!latest.error&&candidate&&purchaseUuid(candidate.id)&&candidate.id!==payment.id){
   const current=await paymentById(candidate.id);
   if(current&&current.owner_id===user.id&&current.report_id===report&&current.test_mode===payment.test_mode&&current.payment_version===payment.payment_version)payment=current;
  }
 }

 let paymentState:CheckoutObservation=payment.status==='succeeded'&&payment.access_state==='active'?'paid':'unknown';
 if(reconcile&&payment.checkout_reference&&!payment.verified_at){
  let timer:ReturnType<typeof setTimeout>|undefined;
  const deadline=Date.now()+12000,purchaseId=payment.id;
  try{
   const config=stripeConfig(process.env),stripe=stripeClient();
   const verify=async()=>{if(config.live)await verifiedStripeAccount(stripe,config.accountId!);return reconcileCheckoutPayment(purchaseId,stripe,config.live,config.accountId,undefined,deadline);};
   paymentState=await Promise.race([verify(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('verification_timeout')),12000);})]);
   payment=await paymentById(payment.id)??payment;
  }catch{payment=await paymentById(payment.id)??payment;paymentState=payment.status==='succeeded'&&payment.access_state==='active'?'paid':'unknown';}
  finally{clearTimeout(timer);}
 }
 let fulfilment: Progress | null = null;
 if(payment.status==='succeeded'&&payment.access_state==='active')try{
  const row=await fulfilmentRepository().progress(user.id,payment.id);
  fulfilment=parseProgress(row);
 }catch{/* Payment confirmation remains independently readable during a queue outage. */}
 let confirmationAvailable=false,confirmationDelivered:boolean|null=null;try{const sale=await readSale(user.id,payment.id);confirmationAvailable=!!payment.verified_at&&!!sale&&typeof sale==="object"&&"policy" in sale&&!!sale.policy&&typeof sale.policy==="object"&&"termsText" in sale.policy;if(sale&&typeof sale==='object'&&'confirmationDelivered' in sale&&typeof sale.confirmationDelivered==='boolean')confirmationDelivered=sale.confirmationDelivered;}catch{/* Existing payment/history reads remain available. */}
 return {paymentState,confirmationAvailable,confirmationDelivered,id:payment.id,report,status:payment.status,access:payment.access_state,test:payment.test_mode===true,reportGenerated:fulfilment?.state==='ready',fulfilment};
}

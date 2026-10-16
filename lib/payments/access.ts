import "server-only";
import {readSale} from "../legal/repository.ts";
import { verifiedUser } from "../supabase/server.ts";
import { permanentIdentity,purchaseUuid } from "../auth/purchase-flow.ts";
import { paymentById } from "./repository.ts";
import { fulfilmentRepository } from "../fulfilment/repository.ts";
import { parseProgress, type Progress } from "../fulfilment/policy.ts";
export async function ownedPurchase(id:string){
 if(!purchaseUuid(id))throw Error("purchase_unavailable");
 const {client,user}=await verifiedUser();if(!client||!permanentIdentity(user))throw Error("purchase_unavailable");
 const payment=await paymentById(id);if(!payment||payment.owner_id!==user.id||!payment.report_id||payment.test_mode!==(process.env.VERCEL_ENV!=="production"))throw Error("purchase_unavailable");
 const {data,error}=await client.rpc("read_sitefit_free",{p_report:payment.report_id});if(error||!data)throw Error("purchase_unavailable");
 let fulfilment: Progress | null = null;
 if(payment.status==='succeeded'&&payment.access_state==='active')try{
  const row=await fulfilmentRepository().progress(user.id,payment.id);
  fulfilment=parseProgress(row);
 }catch{/* Payment confirmation remains independently readable during a queue outage. */}
 let confirmationAvailable=false,confirmationDelivered:boolean|null=null;try{const sale=await readSale(user.id,payment.id);confirmationAvailable=!!sale&&typeof sale==="object"&&"policy" in sale&&!!sale.policy&&typeof sale.policy==="object"&&"termsText" in sale.policy;if(sale&&typeof sale==='object'&&'confirmationDelivered' in sale&&typeof sale.confirmationDelivered==='boolean')confirmationDelivered=sale.confirmationDelivered;}catch{/* Existing payment/history reads remain available. */}
 return {confirmationAvailable,confirmationDelivered,id:payment.id,report:payment.report_id,status:payment.status,access:payment.access_state,test:payment.test_mode===true,reportGenerated:fulfilment?.state==='ready',fulfilment};
}

import "server-only";
import { verifiedUser } from "../supabase/server.ts";
import { permanentIdentity,purchaseUuid } from "../auth/purchase-flow.ts";
import { paymentById } from "./repository.ts";
import { fulfilmentRepository } from "../fulfilment/repository.ts";
import { parseProgress, type Progress } from "../fulfilment/policy.ts";
export async function ownedPurchase(id:string){
 if(!purchaseUuid(id))throw Error("purchase_unavailable");
 const {client,user}=await verifiedUser();if(!client||!permanentIdentity(user))throw Error("purchase_unavailable");
 const payment=await paymentById(id);if(!payment||payment.owner_id!==user.id||!payment.report_id)throw Error("purchase_unavailable");
 const {data,error}=await client.rpc("read_sitefit_free",{p_report:payment.report_id});if(error||!data)throw Error("purchase_unavailable");
 let fulfilment: Progress | null = null;
 if(payment.status==='succeeded'&&payment.access_state==='active')try{
  const row=await fulfilmentRepository().progress(user.id,payment.id);
  fulfilment=parseProgress(row);
 }catch{/* Payment confirmation remains independently readable during a queue outage. */}
 return {id:payment.id,report:payment.report_id,status:payment.status,access:payment.access_state,test:true,reportGenerated:fulfilment?.state==='ready',fulfilment};
}

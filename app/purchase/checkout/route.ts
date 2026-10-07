import { randomUUID } from "node:crypto";
import { verifiedUser } from "@/lib/supabase/server";
import { permanentIdentity,purchaseUuid } from "@/lib/auth/purchase-flow";
import { purchaseSameOrigin,stripeConfig } from "@/lib/payments/config";
import { boundedJson,paymentReply } from "@/lib/payments/http";
import { stripeClient,verifiedPrice,verifiedSession } from "@/lib/payments/stripe";
import { checkoutParameters } from "@/lib/payments/parameters";
import { preparePayment,storedParameters,bindCheckout } from "@/lib/payments/repository";
import { openCheckout } from "@/lib/payments/checkout";
import { validateFreeProjection } from "@/lib/analysis/projection";
export async function POST(request:Request){
 if(!purchaseSameOrigin(request,process.env))return paymentReply({error:"Purchasing is unavailable."},403);
 try{
  const body=await boundedJson(request);if(Object.keys(body).length!==1||!purchaseUuid(body.reportId))throw Error("invalid_request");
  const {client,user}=await verifiedUser();if(!client||!permanentIdentity(user))return paymentReply({error:"Sign in to your verified account before Checkout."},403);
  const {data,error}=await client.rpc("read_sitefit_free",{p_report:body.reportId});
  if(error||!data||typeof data!=="object"||Array.isArray(data)||!purchaseUuid(data.analysisId))throw Error("snapshot_unavailable");
  validateFreeProjection(data);
  const config=stripeConfig(process.env),stripe=stripeClient();await verifiedPrice(stripe,config.priceId);
  const id=randomUUID(),expires=Math.floor(Date.now()/1000)+3600;
  const parameters=checkoutParameters({id,analysis:data.analysisId,email:user.email,price:config.priceId,origin:config.origin,expires});
  const payment=await preparePayment({id,owner:user.id,report:body.reportId,price:config.priceId,parameters,expires});
  const stored=storedParameters(payment,config.origin);
  const binding={id:payment.id,analysis:payment.analysis_id,price:payment.price_reference};
  const url=await openCheckout({id:payment.id,key:payment.idempotency_key,expires:stored.expires_at!,session:payment.checkout_reference,parameters:stored},{
   retrieve:id=>verifiedSession(stripe,id,binding),
   create:(params,key)=>stripe.checkout.sessions.create(params,{idempotencyKey:key}),
   validate:async session=>{await verifiedSession(stripe,session.id,binding);},
  },session=>bindCheckout(payment.id,session));
  return paymentReply({url});
 }catch{return paymentReply({error:"Checkout could not continue. Your saved Snapshot is unchanged. Retry shortly; an unresolved attempt may need verification."},409);}
}

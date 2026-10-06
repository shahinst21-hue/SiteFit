import type Stripe from "stripe";
import { checkoutRedirect } from "./parameters.ts";
export type CheckoutAttempt={id:string;key:string;expires:number;session:string|null;parameters:Stripe.Checkout.SessionCreateParams};
export type CheckoutSession={id:string;status:string|null;payment_status:string;expires_at:number;url:string|null};
export async function openCheckout(attempt:CheckoutAttempt,provider:{
 retrieve:(id:string)=>Promise<CheckoutSession>;
 create:(parameters:Stripe.Checkout.SessionCreateParams,key:string)=>Promise<CheckoutSession>;
 validate:(session:CheckoutSession)=>Promise<void>;
},bind:(id:string)=>Promise<void>,now=Math.floor(Date.now()/1000)){
 let session:CheckoutSession;
 if(attempt.session)session=await provider.retrieve(attempt.session);
 else{
  // Do not alter fixed expires_at on a late/ambiguous retry.
  if(attempt.expires-now<1800)throw Error("payment_reconciliation_required");
  session=await provider.create(attempt.parameters,attempt.key);
 }
 await provider.validate(session);
 await bind(session.id);
 if(session.status!=="open"||session.payment_status!=="unpaid"||session.expires_at<=now)throw Error("payment_confirmation_required");
 return checkoutRedirect(session.url);
}

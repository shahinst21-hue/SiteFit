import type Stripe from "stripe";
import { PRODUCT,PAYMENT_VERSION } from "./config.ts";
import { uuid } from "../data/validation.ts";
export function checkoutParameters(input:{id:string;analysis:string;email:string;price:string;origin:string;expires:number}): Stripe.Checkout.SessionCreateParams {
 if(!uuid(input.id)||!uuid(input.analysis)||!/^price_[A-Za-z0-9]+$/.test(input.price)||!Number.isSafeInteger(input.expires))throw Error("invalid_payment_parameters");
 const metadata={purchase_id:input.id,analysis_id:input.analysis,product_type:PRODUCT,version:String(PAYMENT_VERSION)};
 return {mode:"payment",allowed_payment_method_types:["card"],line_items:[{price:input.price,quantity:1}],
  customer_email:input.email,expires_at:input.expires,
  success_url:`${input.origin}/purchase/return?purchase=${input.id}`,
  cancel_url:`${input.origin}/purchase/return?purchase=${input.id}&cancel=1`,
  allow_promotion_codes:false,automatic_tax:{enabled:false},adaptive_pricing:{enabled:false},
  payment_intent_data:{metadata},metadata};
}
export function checkoutRedirect(value:string|null): string {
 if(!value)throw Error("checkout_unavailable");
 const url=new URL(value);
 if(url.protocol!=="https:"||url.hostname!=="checkout.stripe.com"||url.username||url.password||!url.pathname.startsWith("/c/pay/"))throw Error("checkout_unavailable");
 return url.href;
}

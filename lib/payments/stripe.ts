import "server-only";
import Stripe from "stripe";
import { stripeConfig,PRODUCT } from "./config.ts";
export const STRIPE_API_VERSION="2026-09-30.endive";
export function stripeClient(env:Readonly<Record<string,string|undefined>>=process.env){
 const config=stripeConfig(env);
 return new Stripe(config.secret,{apiVersion:STRIPE_API_VERSION,maxNetworkRetries:0,timeout:10000});
}
export async function verifiedPrice(client:Stripe,priceId:string,live=false){
 const price=await client.prices.retrieve(priceId,{expand:["product"]});
 const product=price.product;
 if(price.livemode!==live||!price.active||price.type!=="one_time"||price.currency!=="gbp"||price.unit_amount!==2900||price.billing_scheme!=="per_unit"||price.custom_unit_amount||price.recurring||typeof product==="string"||product.deleted||!product.active||product.livemode!==live||product.metadata.sitefit_product!==PRODUCT)throw Error("price_unavailable");
 return price;
}
export async function verifiedSession(client:Stripe,id:string,binding:{id:string;analysis:string;price:string;live?:boolean}){
 const session=await client.checkout.sessions.retrieve(id);
 const lines=await client.checkout.sessions.listLineItems(id,{limit:2});
 const live=binding.live===true;
 if(session.livemode!==live||!session.id.startsWith(live?"cs_live_":"cs_test_")||session.mode!=="payment"||session.amount_total!==2900||session.currency!=="gbp"||session.metadata?.purchase_id!==binding.id||session.metadata?.analysis_id!==binding.analysis||session.metadata?.product_type!==PRODUCT||session.metadata?.version!==(live?"2":"1")||lines.has_more||lines.data.length!==1||lines.data[0].quantity!==1||lines.data[0].price?.id!==binding.price||lines.data[0].price?.livemode!==live||lines.data[0].amount_total!==2900)throw Error("checkout_binding_invalid");
 return session;
}
export async function verifiedStripeAccount(client:Stripe,expected:string){
 const account=await client.accounts.retrieve(null);
 if(account.id!==expected||!account.charges_enabled||!account.payouts_enabled)throw Error("stripe_account_unavailable");
 return account.id;
}

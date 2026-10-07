import "server-only";
import { frameworkClient } from "../data/server-client.ts";
import type { Database,Json } from "../supabase/database.types.ts";
import { checkoutParameters } from "./parameters.ts";
import { isDeepStrictEqual } from "node:util";
import { PRODUCT } from "./config.ts";
type Payment=Database["public"]["Tables"]["payments"]["Row"];
export function storedParameters(payment:Payment,origin:string){
 const raw=payment.attempt_parameters;
 if(payment.payment_version!==1||payment.test_mode!==true||payment.product_type!==PRODUCT||payment.amount_minor!==2900||payment.currency!=="GBP"||!payment.expires_at||!raw||typeof raw!=="object"||Array.isArray(raw)||typeof raw.customer_email!=="string")throw Error("invalid_stored_payment");
 const canonical=checkoutParameters({id:payment.id,analysis:payment.analysis_id,email:raw.customer_email,price:payment.price_reference,origin,expires:Math.floor(Date.parse(payment.expires_at)/1000)});
 if(!isDeepStrictEqual(raw,canonical))throw Error("invalid_stored_payment");
 return canonical;
}
export async function preparePayment(input:{owner:string;report:string;id:string;price:string;parameters:ReturnType<typeof checkoutParameters>;expires:number}){
 const {data,error}=await frameworkClient().rpc("prepare_sitefit_payment",{p_owner:input.owner,p_report:input.report,p_id:input.id,p_price:input.price,p_parameters:JSON.parse(JSON.stringify(input.parameters)) as Json,p_expiry:new Date(input.expires*1000).toISOString()});
 if(error||!data)throw Error("purchase_unavailable");return data;
}
export async function bindCheckout(id:string,session:string){
 const {error}=await frameworkClient().rpc("bind_sitefit_checkout",{p_id:id,p_session:session});if(error)throw Error("payment_binding_unavailable");
}
export async function paymentById(id:string){
 const {data,error}=await frameworkClient().from("payments").select("*").eq("id",id).eq("payment_version",1).maybeSingle();
 if(error)throw Error("payment_unavailable");return data;
}

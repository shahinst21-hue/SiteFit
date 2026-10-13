import "server-only";
import { frameworkClient } from "../data/server-client.ts";
import { uuid } from "../data/validation.ts";
import { cancellationReason, salePolicy, validateSaleConsent } from "./sale.ts";
import type { Json } from "../supabase/database.types.ts";
type Rpc = { rpc(name: string, args: Record<string, Json>): PromiseLike<{data: unknown; error: unknown}> };
const client = () => frameworkClient() as unknown as Rpc;
export async function recordSale(owner: string, payment: string, consent: unknown) {
  if (![owner,payment].every(uuid)) throw Error("sale_unavailable");
  const accepted=validateSaleConsent(consent);
  const result=await client().rpc("record_sitefit_sale", {p_owner:owner,p_payment:payment,p_version:salePolicy.version,p_consent:accepted});
  if(result.error)throw Error("sale_unavailable");return result.data;
}
export async function requestCancellation(owner: string, payment: string, reason: unknown) {
  if (![owner,payment].every(uuid)) throw Error("cancellation_unavailable");
  const result=await client().rpc("request_sitefit_cancellation",{p_owner:owner,p_payment:payment,p_reason:cancellationReason(reason)});
  if(result.error||!result.data||typeof result.data!=="object"||(result.data as {status?:unknown}).status!=="requested"||(result.data as {refundIssued?:unknown}).refundIssued!==false)throw Error("cancellation_unavailable");
  return {status:"requested",refundIssued:false};
}

export async function readSale(owner:string,payment:string) {
 if(![owner,payment].every(uuid))throw Error("sale_unavailable");
 const r=await client().rpc("read_sitefit_sale",{p_owner:owner,p_payment:payment});
 if(r.error)throw Error("sale_unavailable");return r.data;
}

import {trackEcommerce} from '../measurement/client.ts';
import {stripeCheckoutUrl} from './checkout-url.ts';
import type { SaleConsent } from "../legal/sale.ts";
/** Both Snapshot purchase controls use this POST journey. Page anchors and
 * report-reading URLs cannot masquerade as a successful purchase destination. */
export class PurchaseNavigationError extends Error {}
export async function purchaseNavigation(report: string, checkout: boolean, origin: string, fetcher: typeof fetch = fetch, consent?: SaleConsent) {
  const response = await fetcher(checkout ? "/purchase/checkout" : "/purchase/start", {
    method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({reportId: report,...(checkout&&consent?{saleConsent:consent}:{})}),
  });
  const data = await response.json();
  if (!response.ok || typeof data.url !== "string") {
    const messages:Record<string,string>={checkout_reconciliation_required:'Your previous payment attempt needs verification before another Checkout can open. Your Snapshot is saved; do not buy again.',proof_payment_denied:'Your existing purchase needs review before another Checkout can open. Your Snapshot is saved.',trial_full_budget_exhausted:'The controlled AI test budget has no capacity for another Full Report reservation. Your Snapshot is saved.',trial_full_slots_committed:'All three controlled Full Report purchases are paid or currently committed. Check your saved purchases before trying again.',payment_confirmation_required:'The previous Checkout has expired or changed. Check your saved purchase status before continuing.',sale_changed_replay:'Your saved purchase choices differ from this request. Return to the original purchase.'};
    messages.insufficient_report_evidence='There is not enough usable source evidence for a Full Report at this location. No payment has been started.';
    const reference=typeof data.requestId==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data.requestId)?` Support reference: ${data.requestId}.`:'';
    throw new PurchaseNavigationError((typeof data.code==='string'&&messages[data.code]?messages[data.code]:'Checkout could not be opened. Your Snapshot is still saved. Return to it and try again shortly.')+reference);
  }
  const url = new URL(data.url, origin);
  // Stripe's server-validated Checkout URL includes provider-owned fragment
  // state. Preserve it; only internal purchase anchors represent the circular
  // Snapshot navigation defect. Never allow credentials or a foreign host.
  const login=checkout&&url.origin===origin&&!url.hash&&(url.pathname==='/login'&&url.search==='?next=%2Fpurchase%2Fcontinue'||url.pathname==='/purchase/auth'&&!url.search);
  if (url.username || url.password || (checkout ? !login&&!stripeCheckoutUrl(url) :
    !!url.hash || url.origin !== origin || !["/purchase/auth", "/purchase/resume"].includes(url.pathname))) throw Error("invalid_purchase_redirect");
  if(checkout&&stripeCheckoutUrl(url)&&data.measurement?.paymentId)await trackEcommerce(data.measurement.paymentId,'begin_checkout');
  return url.href;
}

export async function retryPurchaseNavigation(purchase:string,report:string,origin:string,fetcher:typeof fetch=fetch){
 const r=await fetcher('/purchase/retry',{signal:AbortSignal.timeout(30000),method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({purchaseId:purchase})});
 const value=await r.json();if(!r.ok||typeof value.url!=='string')throw Error('retry_unavailable');
 const url=new URL(value.url,origin);
 const internal=url.origin===origin&&!url.hash&&((url.pathname==='/purchase/return'&&url.searchParams.size===1&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(url.searchParams.get('purchase')??''))||(url.pathname===`/snapshots/${report}`&&url.search==='?purchase=1'));
 if(url.username||url.password||!internal&&!stripeCheckoutUrl(url))throw Error('invalid_retry_destination');
 if(stripeCheckoutUrl(url)&&value.measurement?.paymentId)await trackEcommerce(value.measurement.paymentId,'begin_checkout');
 return url.href;
}

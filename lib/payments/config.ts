import { site } from "../site-config.ts";
export const PRODUCT="full_location_due_diligence_report";
export const PAYMENT_VERSION=1;
export function purchaseOrigin(env: Readonly<Record<string,string|undefined>>): string | null {
 if(env.SITEFIT_TEST_PURCHASES_ENABLED!=="true"||env.VERCEL_ENV==="production"||env.VERCEL==="1"&&env.VERCEL_ENV!=="preview")return null;
 try {
  const url=new URL(env.SITEFIT_PURCHASE_ORIGIN??"");
  if(url.username||url.password||url.search||url.hash||url.pathname!=="/")return null;
  const local=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
  if(env.VERCEL_ENV==="preview" ? url.protocol!=="https:" : !local||url.protocol!=="http:")return null;
  return url.origin;
 }catch{return null;}
}
export function stripeConfig(env: Readonly<Record<string,string|undefined>>){
 const origin=purchaseOrigin(env);
 if(!origin||!/^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY??"")||!/^price_[A-Za-z0-9]+$/.test(env.STRIPE_FULL_REPORT_PRICE_ID??""))throw Error("payment_configuration_unavailable");
 return {origin,secret:env.STRIPE_SECRET_KEY!,priceId:env.STRIPE_FULL_REPORT_PRICE_ID!,amount:site.pricing.fullReport,currency:site.currency.toLowerCase()};
}
export function purchaseSameOrigin(request: Request,env: Readonly<Record<string,string|undefined>>){
 const origin=purchaseOrigin(env);
 return !!origin&&request.headers.get("origin")===origin&&request.headers.get("sec-fetch-site")!=="cross-site";
}
/** Presentation only; mutation identity, ownership and same-origin checks remain
 * authoritative. Immutable Preview URLs must not advertise an unusable purchase. */
export function purchaseAvailableOnHost(env: Readonly<Record<string,string|undefined>>, host: string | null) {
 try { return !!host && new URL(stripeConfig(env).origin).host === host; } catch { return false; }
}

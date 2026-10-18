import { runnerEnabled } from "@/lib/fulfilment/policy";
import { commercialExecution } from "@/lib/release/policy";
import { runnerAuthorised } from "@/lib/fulfilment/auth";
import { fulfilOne } from "@/lib/fulfilment/worker";
import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {stripeClient,verifiedPrice,verifiedStripeAccount} from '@/lib/payments/stripe';
import {stripeConfig} from '@/lib/payments/config';
import {STRIPE_WEBHOOK_API_VERSION} from '@/lib/payments/event-context';
import {PAYMENT_EVENTS} from '@/lib/payments/webhook';
export const runtime = "nodejs";
export const maxDuration = 300;
/** Read-only deployed-runtime check; never creates a Session, claims a job or
 * accesses AI/source APIs. The existing runner secret is mandatory. */
export async function GET(request:Request){
  if(!controlledTrialConfigured(process.env,new URL(request.url).hostname)||
    !runnerAuthorised(request.headers.get('authorization'),process.env.SITEFIT_FULFILMENT_RUNNER_SECRET))return new Response(null,{status:404});
  const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
  let stage='configuration';
  try{
    const config=stripeConfig(process.env),stripe=stripeClient();
    stage='account';await verifiedStripeAccount(stripe,config.accountId!);stage='price';await verifiedPrice(stripe,config.priceId,true);
    stage='webhook';
    const endpoints=await stripe.webhookEndpoints.list({limit:100});
    const matching=endpoints.data.filter(e=>e.url===config.origin+'/api/stripe/webhook'&&e.status==='enabled');
    const webhook=matching.length===1&&matching[0].api_version===STRIPE_WEBHOOK_API_VERSION&&[...PAYMENT_EVENTS].every(e=>matching[0].enabled_events.includes(e));
    const providers=['POSTIO_API_KEY','PROPERTYDATA_API_KEY','GEOAPIFY_API_KEY','TFL_APP_KEY','OPENAI_API_KEY'].every(k=>!!process.env[k]?.trim());
    const project=process.env.SUPABASE_URL==='https://vsfkkroxgntoumoqcfcy.supabase.co';
    return Response.json({price29:true,accountReady:true,accountId:config.accountId,webhook,signingSecretPresent:!!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'),providersConfigured:providers,productionProject:project,paidDispatches:0},{headers});
  }catch(error){const status=(error as {statusCode?:number})?.statusCode;return Response.json({ready:false,stage,upstreamStatus:status&&[401,403,404,429].includes(status)?status:null,paidDispatches:0},{status:503,headers});}
}
export async function POST(request: Request) {
  if (!runnerEnabled(process.env, new URL(request.url).hostname) ||
    !runnerAuthorised(request.headers.get("authorization"), process.env.SITEFIT_FULFILMENT_RUNNER_SECRET))
    return new Response(null, { status: 404 });
  // No caller-controlled work identifiers, URLs, provider or spending switches.
  if (request.body) {
    const reader = request.body.getReader(); let bytes = 0; const chunks: Uint8Array[] = [];
    while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength;
      if (bytes > 2) { await reader.cancel(); return new Response(null, { status: 400 }); } chunks.push(part.value); }
    if (bytes && Buffer.concat(chunks).toString("utf8") !== "{}") return new Response(null, { status: 400 });
  }
  const result = await fulfilOne({ paidExecutionApproved: commercialExecution(process.env,new URL(request.url).hostname)||controlledTrialConfigured(process.env,new URL(request.url).hostname) });
  return Response.json({ state: result }, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

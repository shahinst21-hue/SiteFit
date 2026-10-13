import {productionOrigin,releasePolicy} from './policy.ts';
import {readPublicSupabaseConfig} from '../supabase/config.ts';
import {salePolicy} from '../legal/sale.ts';

/** Offline configuration inspection only. Never authorises or invokes a service. */
export function releasePreflight(env:Record<string,string|undefined>){
 const publicConfig=readPublicSupabaseConfig(env);
 const configuration={
  productionEnvironment:env.VERCEL_ENV==='production',
  // Inspect candidate origin shape; the application's real authority stays false.
  customHttpsOrigin:productionOrigin(env,{productionApproved:true,paidExecutionApproved:false,measurementApproved:false})!==null,
  hostedSupabase:!!publicConfig&&new URL(publicConfig.url).protocol==='https:'&&!['localhost','127.0.0.1','[::1]'].includes(new URL(publicConfig.url).hostname),
  privilegedSupabaseKey:/^sb_secret_[A-Za-z0-9_-]+$/.test(env.SUPABASE_SECRET_KEY??''),
  liveStripeKey:/^sk_live_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY??''),
  stripeWebhookSecret:/^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_WEBHOOK_SECRET??''),
  stripePrice:/^price_[A-Za-z0-9]+$/.test(env.STRIPE_FULL_REPORT_PRICE_ID??''),
  stripeMerchant:/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_ACCOUNT_ID??''),
  runnerSecret:/^[a-f0-9]{64}$/.test(env.SITEFIT_FULFILMENT_RUNNER_SECRET??''),
  openAIKey:/^sk-[A-Za-z0-9_-]+$/.test(env.OPENAI_API_KEY??''),
  postioKey:!!env.POSTIO_API_KEY?.trim(),
 };
 return {configuration,configurationComplete:Object.values(configuration).every(Boolean),
  approvals:{production:releasePolicy.productionApproved,paidExecution:releasePolicy.paidExecutionApproved,
   sourceCollection:releasePolicy.sourceCollectionApproved,measurement:releasePolicy.measurementApproved,salePolicy:salePolicy.approved},
  unverified:['Production database isolation and Live mode','Live price, account and webhook binding',
   'Approved contract and actual durable confirmation delivery','Hosted backup and data rights',
   'Actual scheduler/runner operation','Bounded genuine Live payment to Ready, replay and PDF'],
 };
}

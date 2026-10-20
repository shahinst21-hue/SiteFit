import {after} from 'next/server';
import {deliverOneConfirmation} from '@/lib/legal/automatic-confirmation';
import {fulfilOne} from '@/lib/fulfilment/worker';
import {runnerEnabled} from '@/lib/fulfilment/policy';
import { purchaseOrigin,stripeConfig } from "@/lib/payments/config";
import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {productionOrigin,commercialExecution} from "@/lib/release/policy";
import { stripeClient,verifiedStripeAccount } from "@/lib/payments/stripe";
import { validPaymentEventContext } from "@/lib/payments/event-context";
import { processPaymentEvent } from "@/lib/payments/webhook";
import { paymentReply } from "@/lib/payments/http";
export const runtime="nodejs";
export const maxDuration=300;
export async function POST(request:Request){
 if(!(process.env.VERCEL_ENV==='production'?productionOrigin(process.env):purchaseOrigin(process.env)))return paymentReply({error:"Unavailable."},403);
 const signature=request.headers.get('stripe-signature');const secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!signature||!secret?.startsWith('whsec_'))return paymentReply({error:"Invalid delivery."},400);
 let event;let stripe;
 try{
  const reader=request.body?.getReader();if(!reader)throw Error('invalid_body');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>65536){await reader.cancel();throw Error('invalid_body');}chunks.push(next.value);}
  stripe=stripeClient();event=stripe.webhooks.constructEvent(Buffer.concat(chunks),signature,secret);
 }catch{return paymentReply({error:"Invalid delivery."},400);}
 const config=stripeConfig(process.env);
 if(!validPaymentEventContext(event,config.live))return paymentReply({error:"Invalid delivery context."},400);
 try{if(config.live)await verifiedStripeAccount(stripe,config.accountId!);await processPaymentEvent(event,stripe,undefined,config.live,config.accountId);if(process.env.SITEFIT_ZOHO_EMAIL_ENABLED==='1'&&runnerEnabled(process.env,new URL(request.url).hostname))after(async()=>{await deliverOneConfirmation();await fulfilOne({paidExecutionApproved:commercialExecution(process.env,new URL(request.url).hostname)||controlledTrialConfigured(process.env,new URL(request.url).hostname)});});return paymentReply({received:true});}
 catch{return paymentReply({error:"Delivery requires retry."},503);}
}

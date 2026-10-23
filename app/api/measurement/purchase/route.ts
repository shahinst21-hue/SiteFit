import {sameOrigin} from '@/lib/analysis/http';
import {boundedJson} from '@/lib/payments/http';
import {verifiedUser} from '@/lib/supabase/server';
import {permanentIdentity,purchaseUuid} from '@/lib/auth/purchase-flow';
import {paymentById} from '@/lib/payments/repository';
import {stripeConfig} from '@/lib/payments/config';
import {stripeClient,verifiedSession} from '@/lib/payments/stripe';
import {measurementAuthority,measurementRepository,measurementReply as paymentReply} from '@/lib/measurement/server';
import {verifiedCommerce} from '@/lib/measurement/commerce';
export async function POST(request:Request){
 if(!sameOrigin(request))return paymentReply({events:[]},403);
 try{const authority=await measurementAuthority();if(!authority)return paymentReply({events:[]});
 const body=await boundedJson(request);if(Object.keys(body).length!==2||!purchaseUuid(body.paymentId)||!['purchase','begin_checkout'].includes(String(body.event)))return paymentReply({events:[]},400);
 const {user}=await verifiedUser();if(!permanentIdentity(user))return paymentReply({events:[]});
 const p=await paymentById(body.paymentId);if(!p||p.owner_id!==user.id||!p.checkout_reference||Date.parse(p.created_at)<Date.parse(authority.config.since))return paymentReply({events:[]});
 const config=stripeConfig(process.env);if(config.live&&p.stripe_account_id!==config.accountId)return paymentReply({events:[]});if(p.test_mode!==!config.live||config.live!==(authority.config.environment==='production'))return paymentReply({events:[]});
 if(body.event==='purchase'&&(!p.verified_at||!['succeeded','refunded'].includes(p.status)))return paymentReply({events:[]});
 const stripe=stripeClient(),session=await verifiedSession(stripe,p.checkout_reference,{id:p.id,analysis:p.analysis_id,price:p.price_reference,live:config.live});
 let refunds=null;if(body.event==='purchase'&&p.payment_reference)try{const list=await stripe.refunds.list({payment_intent:p.payment_reference,limit:100});if(!list.has_more)refunds=list;}catch{/* A refund lookup outage does not erase the independently verified original purchase. */}
 const facts=verifiedCommerce(session,body.event as 'purchase'|'begin_checkout',refunds?.data??[]),events=[];
 for(const fact of facts){const r=await measurementRepository().rpc('claim_sitefit_google_event',{p_owner:user.id,p_payment:p.id,p_destination:authority.config.analytics,p_event:fact.event,p_provider_key:fact.key,p_total:fact.total,p_tax:fact.tax,p_shipping:fact.shipping,p_consent_at:new Date(authority.consent.at).toISOString(),p_not_before:authority.config.since,p_test:!config.live}).abortSignal(AbortSignal.timeout(1000));if(!r.error&&r.data)events.push({name:fact.event,payload:r.data});}
 return paymentReply({events});
 }catch{return paymentReply({events:[]});}
}

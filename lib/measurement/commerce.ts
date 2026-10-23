import type Stripe from 'stripe';
/** Pure boundary: only a server-retrieved, bound Stripe Session reaches this function. */
export function verifiedCommerce(session:Stripe.Checkout.Session,kind:'purchase'|'begin_checkout',refunds:Stripe.Refund[]=[]){
 const total=session.amount_total,tax=session.total_details?.amount_tax??0,shipping=session.total_details?.amount_shipping??0;
 if(session.currency!=='gbp'||!Number.isSafeInteger(total)||total===null||total<0||![tax,shipping].every(n=>Number.isSafeInteger(n)&&n>=0)||tax+shipping>total)throw Error('invalid_measurement_amount');
 if(kind==='begin_checkout'){if(session.status!=='open'||session.payment_status!=='unpaid'||session.expires_at<=Date.now()/1000)return [];return [{event:kind,key:session.id,total,tax,shipping}];}
 if(session.status!=='complete'||session.payment_status!=='paid')return [];
 const intent=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;if(!intent)throw Error('invalid_measurement_payment');
 if(refunds.some(r=>(typeof r.payment_intent==='string'?r.payment_intent:r.payment_intent?.id)!==intent||r.currency!=='gbp'||!Number.isSafeInteger(r.amount)||r.amount<0)||refunds.filter(r=>r.status==='succeeded').reduce((n,r)=>n+r.amount,0)>total)throw Error('invalid_measurement_refund');
 const events=[{event:kind as 'purchase'|'refund',key:intent,total,tax,shipping}];
 // Current digital product has zero tax/shipping. Never infer their allocation for a future taxed refund.
 if(tax===0&&shipping===0)for(const refund of refunds)if(refund.status==='succeeded')events.push({event:'refund',key:refund.id,total:refund.amount,tax:0,shipping:0});
 return events;
}

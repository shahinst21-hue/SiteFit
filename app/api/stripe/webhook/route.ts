import { purchaseOrigin } from "@/lib/payments/config";
import { stripeClient } from "@/lib/payments/stripe";
import { validPaymentEventContext } from "@/lib/payments/event-context";
import { processPaymentEvent } from "@/lib/payments/webhook";
import { paymentReply } from "@/lib/payments/http";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!purchaseOrigin(process.env))return paymentReply({error:"Unavailable."},403);
 const signature=request.headers.get('stripe-signature');const secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!signature||!secret?.startsWith('whsec_'))return paymentReply({error:"Invalid delivery."},400);
 let event;let stripe;
 try{
  const reader=request.body?.getReader();if(!reader)throw Error('invalid_body');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>65536){await reader.cancel();throw Error('invalid_body');}chunks.push(next.value);}
  stripe=stripeClient();event=stripe.webhooks.constructEvent(Buffer.concat(chunks),signature,secret);
 }catch{return paymentReply({error:"Invalid delivery."},400);}
 if(!validPaymentEventContext(event))return paymentReply({error:"Invalid delivery context."},400);
 try{await processPaymentEvent(event,stripe);return paymentReply({received:true});}
 catch{return paymentReply({error:"Delivery requires retry."},503);}
}

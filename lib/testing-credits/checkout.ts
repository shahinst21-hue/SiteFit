import 'server-only';
import {paymentById} from '../payments/repository.ts';
import {stripeConfig} from '../payments/config.ts';
import {stripeClient} from '../payments/stripe.ts';
import {reconcileCheckoutPayment} from '../payments/webhook.ts';
import {uuid,object} from '../data/validation.ts';

/** Only called after verified credit eligibility and an owned purchase read.
 * Clock expiry alone never releases funding. Reuse the existing Stripe reducer;
 * no Checkout is created, expired, paid, refunded or fabricated here.
 */
export async function confirmCreditCheckout(owner:string,free:string,purchase:unknown){
 if(purchase===null)return;
 const value=object(purchase);
 if(!uuid(value.id))throw Error('testing_checkout_review');
 const payment=await paymentById(value.id);
 if(!payment||payment.owner_id!==owner||payment.report_id!==free)throw Error('testing_checkout_review');
 if(payment.status==='failed'&&payment.expired_at&&!payment.verified_at&&payment.access_state==='none')return;
 if(payment.status!=='pending'||payment.verified_at||payment.access_state!=='none')throw Error('testing_checkout_review');
 if(!payment.expires_at||Date.parse(payment.expires_at)>Date.now())throw Error('testing_checkout_pending');
 const config=stripeConfig(process.env);
 if(await reconcileCheckoutPayment(payment.id,stripeClient(),config.live,config.accountId)!=='expired')throw Error('testing_checkout_review');
}

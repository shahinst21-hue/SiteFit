import {cookies} from 'next/headers';
import {redirect,notFound} from 'next/navigation';
import {verifiedUser} from '@/lib/supabase/server';
import {permanentIdentity} from '@/lib/auth/purchase-flow';
import {CHECKOUT_INTENT_COOKIE,readCheckoutIntent} from '@/lib/auth/checkout-intent';
import {purchaseOrigin} from '@/lib/payments/config';
import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {assertTrialOwner} from '@/lib/proof/trial';
import {CheckoutContinuation} from '@/components/checkout-continuation';
export const dynamic='force-dynamic';
export const metadata={title:'Continue to secure payment',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function ContinueCheckout(){
 if(!purchaseOrigin(process.env))notFound();
 const intent=readCheckoutIntent((await cookies()).get(CHECKOUT_INTENT_COOKIE)?.value,process.env.SUPABASE_SECRET_KEY??'');
 if(!intent)redirect('/account');
 const {client,user}=await verifiedUser();if(!client||!permanentIdentity(user))redirect('/login?next=%2Fpurchase%2Fcontinue');
 if(controlledTrialConfigured(process.env))try{await assertTrialOwner(user);}catch{notFound();}
 const r=await client.rpc('read_sitefit_free',{p_report:intent.report});if(r.error||!r.data)notFound();
 return <CheckoutContinuation report={intent.report} consent={intent.consent}/>;
}

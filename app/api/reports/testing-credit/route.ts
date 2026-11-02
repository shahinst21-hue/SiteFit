import {verifiedUser} from '@/lib/supabase/server';
import {sameOrigin} from '@/lib/analysis/http';
import {boundedJson,paymentReply} from '@/lib/payments/http';
import {intelligenceId as uuid} from '@/lib/report-intelligence/http';
import {testingCredits} from '@/lib/testing-credits/repository';
import {confirmCreditCheckout} from '@/lib/testing-credits/checkout';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!sameOrigin(request))return paymentReply({error:'Reload and try again.'},403);
 try{
  const body=await boundedJson(request,256);
  if(Object.keys(body).length!==2||!uuid(body.reportId)||!['start','recover'].includes(String(body.action)))return paymentReply({error:'Invalid request.'},400);
  const {user,client}=await verifiedUser();
  if(!user||!client||user.is_anonymous||!user.email_confirmed_at)return paymentReply({error:'Sign in to your verified account.'},401);
  const session=await client.rpc('sitefit_session_available');
  if(session.error||session.data!==true)return paymentReply({error:'Sign in again.'},401);
  const credits=testingCredits(user.id);
  if(body.action==='start'){
   const balance=await credits.balance();
   if(!balance)return paymentReply({error:'No testing credit grant is available.'},403);
   const use=(await credits.uses()).find(row=>row.freeReportId===body.reportId);
   if(!use){
    if(balance.remaining===0)return paymentReply({error:'All testing credits are used or reserved.'},409);
    const purchase=await client.rpc('read_sitefit_purchase',{p_report:body.reportId});
    if(purchase.error)throw Error('testing_checkout_review');
    await confirmCreditCheckout(user.id,body.reportId,purchase.data);
   }
  }
  const result=body.action==='start'?await credits.start(body.reportId):await credits.recover(body.reportId);
  return paymentReply({result},202);
 }catch(error){
  const code=error instanceof Error?error.message:'';
  if(code==='testing_checkout_pending')return paymentReply({error:'Your previous Checkout is still open. Do not pay it. Wait for it to expire, then use this credit button again. No credit has been reserved.',code},409);
  if(code==='testing_checkout_review')return paymentReply({error:'The previous payment attempt could not be confirmed as expired and unpaid. Check your saved payment status. No new credit has been reserved.',code},409);
  return paymentReply({error:'This credit could not be used. Check your account balance and saved report status before trying again.'},409);
 }
}

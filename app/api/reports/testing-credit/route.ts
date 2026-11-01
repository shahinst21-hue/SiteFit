import {verifiedUser} from '@/lib/supabase/server';
import {sameOrigin} from '@/lib/analysis/http';
import {boundedJson,paymentReply} from '@/lib/payments/http';
import {intelligenceId as uuid} from '@/lib/report-intelligence/http';
import {testingCredits} from '@/lib/testing-credits/repository';
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
  const result=body.action==='start'?await credits.start(body.reportId):await credits.recover(body.reportId);
  return paymentReply({result},202);
 }catch{return paymentReply({error:'This credit could not be used. Check your account balance and saved report status before trying again.'},409);}
}

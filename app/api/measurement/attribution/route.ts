import {sameOrigin} from '@/lib/analysis/http';
import {boundedJson} from '@/lib/payments/http';
import {verifiedUser} from '@/lib/supabase/server';
import {purchaseUuid} from '@/lib/auth/purchase-flow';
import {measurementAuthority,measurementRepository,measurementReply as paymentReply} from '@/lib/measurement/server';
export async function POST(request:Request){
 if(!sameOrigin(request))return paymentReply({accepted:false},403);
 try{const authority=await measurementAuthority();if(!authority)return paymentReply({accepted:false},202);
 const body=await boundedJson(request);if(Object.keys(body).length!==1||!purchaseUuid(body.report))return paymentReply({accepted:false},400);
 const {client,user}=await verifiedUser();if(!client||!user)return paymentReply({accepted:false},202);
 const owned=await client.rpc('read_sitefit_free',{p_report:body.report});if(owned.error||!owned.data)return paymentReply({accepted:false},202);
 const result=await measurementRepository().rpc('record_sitefit_google_attribution',{p_owner:user.id,p_report:body.report,p_values:authority.acquisition,p_consent_at:new Date(authority.consent.at).toISOString(),p_not_before:authority.config.since}).abortSignal(AbortSignal.timeout(750));
 return paymentReply({accepted:!result.error&&result.data===true},202);
 }catch{return paymentReply({accepted:false},202);}
}

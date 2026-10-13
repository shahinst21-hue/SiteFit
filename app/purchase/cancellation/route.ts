import {verifiedUser} from "@/lib/supabase/server";
import {permanentIdentity} from "@/lib/auth/purchase-flow";
import {purchaseAccountSameOrigin} from "@/lib/payments/config";
import {boundedJson,paymentReply} from "@/lib/payments/http";
import {requestCancellation} from "@/lib/legal/repository";
export async function POST(request:Request){
 if(!purchaseAccountSameOrigin(request,process.env))return paymentReply({error:"Unavailable."},403);
 try{const {user}=await verifiedUser();if(!permanentIdentity(user))return paymentReply({error:"Sign in required."},403);
 const body=await boundedJson(request);if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).length!==2||typeof body.purchase!=="string")throw Error();
 return paymentReply(await requestCancellation(user.id,body.purchase,body.reason));
 }catch{return paymentReply({error:"Request could not be recorded. No refund or charge was initiated."},409);}
}

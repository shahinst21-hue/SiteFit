import {cookies} from 'next/headers';
import {authDestination,AUTH_RETURN_COOKIE} from '@/lib/auth/flow';
import {boundedJson,paymentReply} from '@/lib/payments/http';
/** Presentation-only return path. It never grants report, identity or payment authority. */
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return paymentReply({error:'Invalid sign-in continuation.'},403);
 try{const body=await boundedJson(request);if(Object.keys(body).length!==1||typeof body.next!=='string'||authDestination(body.next)!==body.next)return paymentReply({error:'Invalid sign-in continuation.'},400);
 (await cookies()).set(AUTH_RETURN_COOKIE,body.next,{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/auth',maxAge:600});
 return paymentReply({ok:true});
 }catch{return paymentReply({error:'Sign-in continuation unavailable.'},400);}
}

import {verifiedUser} from "@/lib/supabase/server";
import {permanentIdentity,purchaseUuid} from "@/lib/auth/purchase-flow";
import {purchaseReadOrigin} from "@/lib/payments/config";
import {readSale} from "@/lib/legal/repository";
import {confirmationPDF} from "@/lib/legal/confirmation";
import {archivedPDF} from "@/lib/legal/document-archive";
import {packetDigest} from "@/lib/analysis/canonical";
export async function GET(request:Request){
 if(!purchaseReadOrigin(process.env))return new Response(null,{status:404});
 try{const {user}=await verifiedUser(),payment=new URL(request.url).searchParams.get("purchase");
 if(!permanentIdentity(user)||!purchaseUuid(payment))throw Error();
 const sale=await readSale(user.id,payment);
 const record=sale as {version?:unknown;acceptedAt?:unknown;consent?:unknown;policy?:{reportAccessDays?:unknown}}|null;
 const render=()=>confirmationPDF(sale);
 const bytes=record?.policy?.reportAccessDays===30?await archivedPDF(`contracts/${payment}/${packetDigest({version:record.version,acceptedAt:record.acceptedAt,consent:record.consent,policy:record.policy})}/confirmation.pdf`,render):await render();
 return new Response(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=sitefit-contract.pdf","Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow","Referrer-Policy":"no-referrer"}});
 }catch{return new Response(null,{status:404,headers:{"Cache-Control":"private, no-store"}});}
}

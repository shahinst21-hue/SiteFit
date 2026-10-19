import { purchaseReadOrigin } from "@/lib/payments/config";
import { paymentReply } from "@/lib/payments/http";
import { ownedPurchase } from "@/lib/payments/access";
export async function GET(request:Request){
 if(!purchaseReadOrigin(process.env))return paymentReply({error:"Unavailable."},404);
 try{return paymentReply(await ownedPurchase(new URL(request.url).searchParams.get("purchase")??"",true));}
 catch{return paymentReply({error:"Purchase not found."},404);}
}

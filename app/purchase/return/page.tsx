import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ownedPurchase } from "@/lib/payments/access";
import { purchaseOrigin } from "@/lib/payments/config";
import { PurchaseStatus } from "@/components/purchase-status";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Your purchase status",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function PurchaseReturn({searchParams}:{searchParams:Promise<{purchase?:string;cancel?:string}>}){
 if(!purchaseOrigin(process.env))notFound();
 const params=await searchParams;let purchase;try{purchase=await ownedPurchase(params.purchase??"");}catch{notFound();}
 return <div className="page-wrap narrow-page"><PurchaseStatus initial={purchase} cancelled={params.cancel==="1"}/></div>;
}

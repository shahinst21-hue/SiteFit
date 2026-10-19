import {notFound} from 'next/navigation';
import {PurchaseStatus} from '@/components/purchase-status';
export const dynamic='force-dynamic';
export default async function PurchasePreview({searchParams}:{searchParams:Promise<{state?:string}>}){
 if(process.env.NODE_ENV!=='development'&&process.env.VERCEL_ENV!=='preview')notFound();
 const {state}=await searchParams;const paymentState=state==='unknown'?'unknown':state==='pending'?'pending':state==='failed'?'failed':state==='expired'?'expired':'unpaid';
 return <div className="page-wrap narrow-page"><aside role="note">Synthetic payment recovery preview. No valid purchase or execution.</aside><PurchaseStatus cancelled initial={{id:'synthetic-purchase',report:'synthetic-snapshot',status:'pending',access:'none',paymentState,test:true}}/></div>;
}

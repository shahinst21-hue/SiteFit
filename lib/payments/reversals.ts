export function reversalDisposition(refunds:{amount:number;status:string|null;livemode?:boolean}[],disputes:{status:string;livemode?:boolean}[],total:number){
 if(refunds.some(r=>r.livemode||!Number.isSafeInteger(r.amount)||r.amount<0||!['pending','requires_action','succeeded','failed','canceled'].includes(r.status??''))||disputes.some(d=>d.livemode||!['warning_needs_response','warning_under_review','warning_closed','needs_response','under_review','won','lost'].includes(d.status)))throw Error('reversal_unavailable');
 if(disputes.some(d=>d.status==='lost'))return 'lost_dispute';
 const refunded=refunds.filter(r=>r.status==='succeeded').reduce((n,r)=>n+r.amount,0);
 if(refunded>=total)return 'full_refund';
 if(disputes.some(d=>!['won','warning_closed'].includes(d.status)))return 'open_dispute';
 if(refunds.some(r=>['pending','requires_action'].includes(r.status??'')))return 'pending_refund';
 if(refunded>0)return 'partial_refund';
 return 'none';
}

import Link from 'next/link';
import {TestingCreditButton} from './testing-credit-button';
import type {CreditBalance,CreditUse} from '@/lib/testing-credits/repository';

export function TestingCreditOffer({reportId,balance,use}:{reportId:string;balance:CreditBalance;use?:CreditUse}){
 return <div aria-label="Full Report testing credit"><p><strong>{balance.remaining} Full Report testing credits remaining.</strong> No Stripe payment is required.</p>
  {use?<><p>Complimentary report: {use.state==='released'?'credit returned':use.progress.replaceAll('_',' ')}.</p>
   {use.reportId&&<p><Link href={`/reports/${use.reportId}/decision`} target="_blank" rel="noopener noreferrer" prefetch={false} aria-label="Open Decision Edition and PDF (opens in a new tab)">Open Decision Edition and PDF</Link></p>}
   {use.state==='reserved'&&['intervention','awaiting_authorisation'].includes(use.progress)&&<TestingCreditButton reportId={reportId} recover/>}
   <Link href="/account">View saved report progress</Link></>:<><TestingCreditButton reportId={reportId}/><p className="field-help">If a previous Checkout is still open, wait for its expiry. Its unpaid status must be verified before a credit can be reserved.</p></>}
 </div>;
}

import {requireApprovedSale,salePolicy} from '../../lib/legal/sale.ts';
import {readSale} from '../../lib/legal/repository.ts';
import {confirmationPDF} from '../../lib/legal/confirmation.ts';
import {archivedPDF,documentBucket} from '../../lib/legal/document-archive.ts';
import {paymentById} from '../../lib/payments/repository.ts';
import {packetDigest} from '../../lib/analysis/canonical.ts';
import {uuid} from '../../lib/data/validation.ts';
import {releasePolicy} from '../../lib/release/policy.ts';

// Existing owner-admin CLI only, never an HTTP endpoint or staff support grant.
// Explicit private environment file; do not auto-load Development or print customer data.
async function prepare(){
 const [owner,purchase]=process.argv.slice(2);
 if(process.argv.length!==4||!uuid(owner)||!uuid(purchase))throw Error('invalid_request');
 requireApprovedSale();
 if(process.env.VERCEL_ENV==='production'&&!releasePolicy.productionApproved)throw Error('production_not_authorised');
 const payment=await paymentById(purchase!);
 if(!payment||payment.owner_id!==owner||payment.status!=='succeeded'||payment.access_state!=='active'||!payment.verified_at)throw Error('payment_not_authorised');
 const sale=await readSale(owner!,purchase!);
 const record=sale as {version?:unknown;acceptedAt?:unknown;consent?:unknown;policy?:{reportAccessDays?:unknown}}|null;
 if(record?.version!==salePolicy.version||record.policy?.reportAccessDays!==30)throw Error('policy_not_authorised');
 const digest=packetDigest({version:record.version,acceptedAt:record.acceptedAt,consent:record.consent,policy:record.policy});
 const path=`contracts/${purchase}/${digest}/confirmation.pdf`;
 await archivedPDF(path,()=>confirmationPDF(sale));
 console.log(JSON.stringify({prepared:true,bucket:documentBucket,path,delivered:false}));
}
prepare().catch(()=>{console.error('Contract preparation unavailable. No delivery recorded or email sent; private details withheld.');process.exitCode=1;});

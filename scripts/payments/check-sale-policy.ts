import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {launchPolicySnapshot,policyVersions} from '../../lib/legal/policy-text.ts';
import {packetDigest} from '../../lib/analysis/canonical.ts';

export const reviewPolicyMigration='supabase/migrations/20261019160000_checkout_successor_and_supply_action.sql';
/** Verify the current approved additive policy without rewriting the applied review candidate. */
export function expectedReviewPolicyMigration(){
 const json=JSON.stringify(launchPolicySnapshot(),null,2);
 if(json.includes('$policy$')||!/^[a-z0-9-]+$/.test(policyVersions.sale))throw Error('invalid_review_policy');
 return `values('${policyVersions.sale}',true,'digital_content','manual_zoho_pdf',$policy$${json}$policy$::jsonb);`;
}
export async function checkReviewPolicy(){
 const actual=(await fs.readFile(reviewPolicyMigration,'utf8')).replace(/\r\n/g,'\n');
 if(!actual.includes(expectedReviewPolicyMigration()))throw Error('review_policy_snapshot_drift');
 const historical=(await fs.readFile('supabase/migrations/20261016220000_launch_policy_review.sql','utf8')).replace(/\r\n/g,'\n');
 if(createHash('sha256').update(historical).digest('hex')!=='bf7428dbba8d48285e3ad4c0f8e95e4c01e37aea93d455de595e5bdf0156a47f')throw Error('historical_policy_changed');
 return {version:policyVersions.sale,snapshotDigest:packetDigest(launchPolicySnapshot()),approved:true,historicalPreserved:true,networkRequests:0,databaseWrites:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)checkReviewPolicy().then(value=>console.log(JSON.stringify(value))).catch(()=>{console.error('Review policy differs from the application. No approval or database write performed.');process.exitCode=1;});

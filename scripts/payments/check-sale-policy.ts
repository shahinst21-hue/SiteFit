import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {launchPolicySnapshot,policyVersions} from '../../lib/legal/policy-text.ts';
import {packetDigest} from '../../lib/analysis/canonical.ts';

export const reviewPolicyMigration='supabase/migrations/20261016220000_launch_policy_review.sql';
/** Single disabled review row. No approval, release-control, privilege or historical-record change. */
export function expectedReviewPolicyMigration(){
 const json=JSON.stringify(launchPolicySnapshot(),null,2);
 if(json.includes('$sitefit_policy$')||!/^[a-z0-9-]+$/.test(policyVersions.sale))throw Error('invalid_review_policy');
 return `-- Frozen launch review text; NOT sale/publication/execution approval.\n-- Preserve every earlier policy, contract and report. No control or privilege is changed.\ninsert into public.sale_policies(version,approved,classification,confirmation_channel,snapshot)\nvalues ('${policyVersions.sale}',false,'digital_content','manual_zoho_pdf',\n$sitefit_policy$${json}$sitefit_policy$::jsonb);\n`;
}
export async function checkReviewPolicy(){
 const actual=await fs.readFile(reviewPolicyMigration,'utf8');
 if(actual.replace(/\r\n/g,'\n')!==expectedReviewPolicyMigration())throw Error('review_policy_snapshot_drift');
 return {version:policyVersions.sale,snapshotDigest:packetDigest(launchPolicySnapshot()),approved:false,networkRequests:0,databaseWrites:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)checkReviewPolicy().then(value=>console.log(JSON.stringify(value))).catch(()=>{console.error('Review policy differs from the application. No approval or database write performed.');process.exitCode=1;});

import { LocationWizard } from "@/components/location-wizard";
import { pageMetadata } from "@/lib/seo";
import {createServerSupabase} from '@/lib/supabase/server';
import {readSnapshotProof} from '@/lib/proof/repository';
import type {SnapshotProofStart} from '@/components/location-wizard';
import {controlledSnapshotConfigured} from '@/lib/proof/authority';
import {developmentProofConfigured} from '@/lib/proof/development-authority';
import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {assertTrialOwner} from '@/lib/proof/trial';
import Link from 'next/link';
export const metadata = pageMetadata("/check-location");
export default async function CheckLocation() {
  let proof:SnapshotProofStart|undefined;
  if(controlledTrialConfigured(process.env)){
    const client=await createServerSupabase();const verified=await client?.auth.getUser();let allowed=false;
    if(verified?.data.user&&!verified.error)try{await assertTrialOwner(verified.data.user);allowed=true;}catch{/* Restricted server-side; never expose identity or budget. */}
    if(!allowed)return <div className="page-wrap"><section className="simple-panel"><h1>This location check is restricted.</h1><p>Sign in to the authorised account to continue.</p><Link className="button button-secondary" href="/login">Sign in</Link></section></div>;
  }else if(controlledSnapshotConfigured(process.env,'sitefit.co.uk')||developmentProofConfigured(process.env)){
    const client=await createServerSupabase();const verified=await client?.auth.getUser();
    if(verified?.data.user&&!verified.error)try{proof=await readSnapshotProof(verified.data.user.id) as SnapshotProofStart|undefined;}catch{/* Never disclose another owner's case. */}
    if(!proof)return <div className="page-wrap"><section className="simple-panel"><h1>This location check is restricted.</h1><p>Sign in to the authorised account to continue.</p><Link className="button button-secondary" href="/login">Sign in</Link></section></div>;
  }
  return (
    <div className="page-wrap check-page">
      <LocationWizard proofStart={proof}/>
    </div>
  );
}

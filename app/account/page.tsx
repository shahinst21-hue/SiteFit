import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageIntro, Wordmark } from "@/components/ui";
import { Icon } from "@/components/icon";
import { verifiedUser } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { purchaseReadOrigin } from "@/lib/payments/config";
import { accountHistory } from "@/lib/auth/account-history";
import { headers } from "next/headers";
import { dashboardEnabled } from "@/lib/report-dashboard/gate";
import { findReadyDashboard } from "@/lib/report-dashboard/history";
import { fulfilmentRepository } from "@/lib/fulfilment/repository";
import { parseProgress, progressLabel } from "@/lib/fulfilment/policy";
import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {savedSnapshotChecks} from '@/lib/proof/recover-saved-snapshot';
import {SavedSnapshotRecovery} from '@/components/saved-snapshot-recovery';
import {StoredFullRecovery} from '@/components/stored-full-recovery';
import {testingCredits,type CreditBalance,type CreditUse} from '@/lib/testing-credits/repository';
import {TestingCreditButton} from '@/components/testing-credit-button';
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default async function Account({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const { client, user } = await verifiedUser();
  if (!user || !client) redirect("/login");
  const { data: profile, error } = await client
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const params=await searchParams;const page=typeof params.page==='string'&&/^\d{1,3}$/.test(params.page)?Math.min(500,Number(params.page)):0;
  const { data: history, error: historyError } = await client.rpc("list_sitefit_history",{p_offset:page*20});
  const reports = accountHistory(history);
  let creditBalance:CreditBalance|null=null,creditUses:CreditUse[]=[];
  if(!user.is_anonymous&&user.email_confirmed_at)try{
    const credits=testingCredits(user.id);creditBalance=await credits.balance();
    if(creditBalance)creditUses=await credits.uses();
  }catch{/* Existing paid history remains available during a credit status outage. */}
  const paymentStates=purchaseReadOrigin(process.env)?await Promise.all(reports.map(async report=>{
    const {data}=await client.rpc('read_sitefit_purchase',{p_report:report.id});
    if(!data||typeof data!=='object'||Array.isArray(data)||typeof data.access!=='string')return null;
    let progress=null;
    if(data.access==='active'&&typeof data.id==='string'&&!user.is_anonymous&&user.email_confirmed_at)try{
      progress=parseProgress(await fulfilmentRepository().progress(user.id,data.id));
    }catch{/* Account history remains usable during a fulfilment outage. */}
    return {id:typeof data.id==='string'?data.id:null,access:data.access,progress,test:data.test===true};
  })):[];
  const host=(await headers()).get('host')?.split(':')[0]??'';
  let savedChecks:Awaited<ReturnType<typeof savedSnapshotChecks>>=[],recoveryUnavailable=false;
  if(controlledTrialConfigured(process.env,host))try{savedChecks=await savedSnapshotChecks(user.id);}catch{recoveryUnavailable=true;}
  const fullReports=dashboardEnabled(process.env,host)&&!user.is_anonymous&&user.email_confirmed_at?await Promise.all(reports.map(report=>findReadyDashboard(user.id,report.id))):[];
  return (
    <div className="page-wrap narrow-page">
      <div className="auth-brand">
        <Wordmark />
        <span className="badge positive">{user.is_anonymous ? "Guest session" : "Signed in"}</span>
      </div>
      <PageIntro
        eyebrow="YOUR SITEFIT ACCOUNT"
        title={
          profile?.display_name
            ? `Welcome, ${profile.display_name}.`
            : "Your reports, in one place."
        }
      >
        <p>{user.is_anonymous ? "Your saved location checks belong to this browser session. Losing its cookies or signing out can remove access." : `Signed in as ${user.email}`}</p>
      </PageIntro>
      {creditBalance&&<section className="simple-panel" aria-label="Full Report testing credits">
        <h2>Full Report testing credits: {creditBalance.remaining} remaining</h2>
        <p>{creditBalance.reserved} reserved for reports in progress · {creditBalance.consumed} used of 3.</p>
        <p>Each completed new Full Report uses one credit. No Stripe payment is required. Your saved reports remain accessible after your credits are used.</p>
        {creditBalance.remaining===0&&creditBalance.reserved===0&&<p>All testing credits have been used. New Full Reports cost £29.</p>}
      </section>}
      <section className="simple-panel">
        <span className="icon-disc green">
          <Icon name="document" />
        </span>
        <h2>Your saved location checks</h2>
        {savedChecks.length>0&&<ul className="account-history">{savedChecks.map(check=><li key={`${check.propertyId}:${check.businessType}`}><p><strong>{check.address}</strong></p><p>Your saved check stopped before delivery. Recovering it reuses the received output.</p><SavedSnapshotRecovery propertyId={check.propertyId} businessType={check.businessType}/></li>)}</ul>}
        {recoveryUnavailable&&<p role="status">Saved recovery status is temporarily unavailable. Your records are retained.</p>}
        {reports.length ? <ul className="account-history">{reports.map((report,index) => <li key={report.id}><p><strong>{report.address}</strong></p><p>{report.business} · {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString("en-GB", { timeZone: "Europe/London" }) : "Generation date unavailable"}</p><Link href={`/snapshots/${report.id}`} aria-label={`Open Snapshot: ${report.address}`}><Icon name="document"/>Open Snapshot <Icon name="arrow"/></Link>{fullReports[index]&&<p><Link href={`/reports/${fullReports[index]}`}><Icon name="evidence"/>Open stored Full Report <Icon name="arrow"/></Link></p>}{creditBalance&&(()=>{const use=creditUses.find(c=>c.freeReportId===report.id);return use?<div><p className="field-help">Complimentary Full Report: {use.state==='released'?'credit returned':use.progress.replaceAll('_',' ')}.</p>{use.reportId&&<p><Link href={`/reports/${use.reportId}/decision`}>Open Decision Edition and PDF</Link></p>}{use.state==='reserved'&&['intervention','awaiting_authorisation'].includes(use.progress)&&<TestingCreditButton reportId={report.id} recover/>}</div>:creditBalance.remaining>0&&!fullReports[index]&&!paymentStates[index]?<TestingCreditButton reportId={report.id}/>:null;})()}{paymentStates[index]&&<p className="field-help">{paymentStates[index]?.test?"Test purchase":"Purchase"} access: {paymentStates[index]?.access}. {paymentStates[index]?.progress?progressLabel(paymentStates[index]!.progress!.state):"Report progress is temporarily unavailable."}</p>}{paymentStates[index]?.id&&paymentStates[index]?.access==='active'&&paymentStates[index]?.progress?.state==='intervention'&&<StoredFullRecovery paymentId={paymentStates[index]!.id!}/>}</li>)}</ul> : <p>No saved Snapshots on this page.</p>}
        <nav aria-label="Snapshot history pages">{page>0&&<Link href={`/account?page=${page-1}`}>Previous page</Link>}{Array.isArray(history)&&history.length===20&&page<500&&<Link href={`/account?page=${page+1}`}>Next page</Link>}</nav>
        {historyError && <p role="status">Saved Snapshots are temporarily unavailable. Your session is still active.</p>}
        {error && (
          <p role="status">
            Your profile is temporarily unavailable. Your sign-in is still
            active.
          </p>
        )}
        <div className="account-controls"><Link className="button button-primary" href="/check-location">
          Start a Free Snapshot <Icon name="external"/>
        </Link>
        <form action={signOut}>
          <button className="button button-secondary" type="submit">
            <Icon name="logout"/>
            Sign out
          </button>
        </form></div>
      </section>
    </div>
  );
}

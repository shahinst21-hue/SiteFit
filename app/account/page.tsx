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
      <section className="simple-panel">
        <span className="icon-disc green">
          <Icon name="document" />
        </span>
        <h2>Your saved location checks</h2>
        {savedChecks.length>0&&<ul className="account-history">{savedChecks.map(check=><li key={`${check.propertyId}:${check.businessType}`}><p><strong>{check.address}</strong></p><p>Your saved check stopped before delivery. Recovering it reuses the received output.</p><SavedSnapshotRecovery propertyId={check.propertyId} businessType={check.businessType}/></li>)}</ul>}
        {recoveryUnavailable&&<p role="status">Saved recovery status is temporarily unavailable. Your records are retained.</p>}
        {reports.length ? <ul className="account-history">{reports.map((report,index) => <li key={report.id}><p><strong>{report.address}</strong></p><p>{report.business} · {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString("en-GB", { timeZone: "Europe/London" }) : "Generation date unavailable"}</p><Link href={`/snapshots/${report.id}`} aria-label={`Open Snapshot: ${report.address}`}><Icon name="document"/>Open Snapshot <Icon name="arrow"/></Link>{fullReports[index]&&<p><Link href={`/reports/${fullReports[index]}`}><Icon name="evidence"/>Open stored Full Report <Icon name="arrow"/></Link></p>}{paymentStates[index]&&<p className="field-help">{paymentStates[index]?.test?"Test purchase":"Purchase"} access: {paymentStates[index]?.access}. {paymentStates[index]?.progress?progressLabel(paymentStates[index]!.progress!.state):"Report progress is temporarily unavailable."}</p>}{paymentStates[index]?.id&&paymentStates[index]?.access==='active'&&paymentStates[index]?.progress?.state==='intervention'&&<StoredFullRecovery paymentId={paymentStates[index]!.id!}/>}</li>)}</ul> : <p>No saved Snapshots on this page.</p>}
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

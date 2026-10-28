import {PurchaseTerms} from '@/components/purchase-terms';
import {snapshotHasUsableEvidence} from '@/lib/analysis/report-admission';
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { verifiedUser } from "@/lib/supabase/server";
import { validateFreeProjection } from "@/lib/analysis/projection";
import { FreeSnapshot } from "@/components/free-snapshot";
import { purchaseAvailableOnHost } from "@/lib/payments/config";
import {measurementEnabled} from '@/lib/marketing/campaign';
import {validateSnapshotAdvice,validateAdvisorResearch} from '@/lib/analysis/advisor';
import type {Json} from '@/lib/supabase/database.types';
import {readResidential} from '@/lib/snapshot/read-residential';
import {readSnapshotContext} from '@/lib/snapshot/read-context';
import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {assertTrialOwner} from '@/lib/proof/trial';
import {permanentIdentity} from '@/lib/auth/purchase-flow';
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Free Snapshot", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Snapshot({ params,searchParams }: { params: Promise<{ id: string }>;searchParams:Promise<{purchase?:string;signed_in?:string}> }) {
  const { id } = await params; if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { client, user } = await verifiedUser(); if (!client || !user) notFound();
  const { data, error } = await client.rpc("read_sitefit_free", { p_report: id });
  if (error || !data) notFound();
  let report;
  try { report = validateFreeProjection(data); } catch { notFound(); }
  // Optional append-only advisory edition. Read uses the identical stored-report
  // ownership boundary; a read never issues authority or executes research/AI.
  const advisorClient=client as unknown as {rpc(name:string,args:Record<string,Json>):PromiseLike<{data:unknown;error:unknown}>};
  const advice=await advisorClient.rpc('read_sitefit_snapshot_advisor',{p_report:id});
  let research;
  if(!advice.error&&advice.data){
    try{const edition=advice.data as {advice:unknown;research:unknown};report={...report,earlyView:{...report.earlyView,advisor:validateSnapshotAdvice(edition.advice)}};research=validateAdvisorResearch(edition.research);}catch{/* Original immutable report remains readable. */}
  }
  // A withheld population display may be reconstructed from its frozen sources.
  // This read never dispatches providers/AI or mutates the historical report.
  report=await readResidential(client,id,report);
  const requestHeaders=await headers();
  const context=await readSnapshotContext(client,id);
  const evidenceReady=snapshotHasUsableEvidence(report);
  let purchaseAllowed=evidenceReady&&purchaseAvailableOnHost(process.env,requestHeaders.get('host'));
  if(purchaseAllowed&&controlledTrialConfigured(process.env))try{await assertTrialOwner(user);}catch{purchaseAllowed=false;}
  const query=await searchParams,purchase=query.purchase==='1';
  return <>{query.signed_in==='1'&&permanentIdentity(user)&&<p role="status" className="container">You're signed in. Your original Snapshot is saved. Continue your purchase below.</p>}{!evidenceReady&&<p role="status" className="container">There is not enough usable source evidence for a Full Report at this location. Purchasing is unavailable for this check.</p>}<FreeSnapshot openPurchase={purchase} purchaseTerms={purchaseAllowed?<PurchaseTerms report={id}/>:undefined} report={report} context={context} research={research} reportId={id} measurement={measurementEnabled(process.env)} purchaseReport={purchaseAllowed?id:undefined} /></>;
}

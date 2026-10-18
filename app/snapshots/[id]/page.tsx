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
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Free Snapshot", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Snapshot({ params }: { params: Promise<{ id: string }> }) {
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
  // Stored projection only: no source, metric, comparison or AI engine import on the read path.
  const requestHeaders=await headers();
  return <FreeSnapshot report={report} research={research} reportId={id} measurement={measurementEnabled(process.env)} purchaseReport={purchaseAvailableOnHost(process.env,requestHeaders.get("host"))?id:undefined} />;
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifiedUser } from "@/lib/supabase/server";
import { intelligenceId, verificationEnabled } from "@/lib/report-intelligence/http";
import { fullRepository } from "@/lib/report-intelligence/repository";
import { fullStatus } from "@/lib/report-intelligence/generate";
import { VerificationControls } from "./verification-controls";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Report verification", robots: { index: false, follow: false } };

/** Operator-only controlled Preview/Local proof surface, not the Phase 13 dashboard. */
export default async function ReportVerification({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  if (!verificationEnabled(process.env, host)) notFound();
  const { user, client } = await verifiedUser();
  if (!user || !client || user.is_anonymous || !user.email_confirmed_at) redirect("/login");
  const available = await client.rpc("sitefit_session_available");
  if (available.error || available.data !== true) notFound();
  const { report } = await searchParams;
  if (!intelligenceId(report)) notFound();
  let edition;
  try { edition = await fullRepository(user.id).read(report); } catch { notFound(); }
  return <div className="page-wrap narrow-page">
    <h1>Report verification</h1>
    <p>Private development verification. This is not the final customer dashboard. Refresh checks stored progress; it does not generate a new report.</p>
    <VerificationControls initial={fullStatus(edition)} />
  </div>;
}

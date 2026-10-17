import { notFound } from "next/navigation";
import { verifiedUser } from "@/lib/supabase/server";
import { fulfilmentRepository } from "@/lib/fulfilment/repository";
import { developmentFulfilment, progressLabel } from "@/lib/fulfilment/policy";
import { headers } from "next/headers";
import { resumeFulfilment } from "./actions";
export const metadata = { title: "Internal support", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Support() {
  if (!developmentFulfilment(process.env, (await headers()).get("host")?.split(":")[0] ?? "")) notFound();
  const { user, client } = await verifiedUser();
  if (!user || user.is_anonymous || !user.email_confirmed_at || !client) notFound();
  const active = await client.rpc("sitefit_session_available"); if (active.error || active.data !== true) notFound();
  let rows: unknown;
  try { rows = await fulfilmentRepository().support(user.id); } catch { notFound(); }
  if (!Array.isArray(rows)) notFound();
  return <main className="page-shell"><h1>Report fulfilment</h1><p>Restricted operational metadata. Paid execution remains disabled.</p>
    <ul>{rows.map((r: { id: string; state: string; reason: string | null; updated_at: string; resumable: boolean }) =>
      <li key={r.id}><strong>{progressLabel(r.state)}</strong><p>{r.id} · {r.reason ?? "No failure recorded"} · {r.updated_at}</p>
        {r.resumable && <form action={resumeFulfilment}><input type="hidden" name="job" value={r.id}/><button className="button button-secondary">Resume safe stored work</button></form>}</li>)}</ul></main>;
}

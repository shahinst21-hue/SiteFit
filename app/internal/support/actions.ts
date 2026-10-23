"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifiedUser } from "@/lib/supabase/server";
import { fulfilmentRepository, fulfilmentId } from "@/lib/fulfilment/repository";
import { developmentFulfilment } from "@/lib/fulfilment/policy";
export async function resumeFulfilment(form: FormData) {
  const hostname = (await headers()).get("host")?.split(":")[0] ?? "";
  const { user, client } = await verifiedUser();
  const job = form.get("job");
  if (!developmentFulfilment(process.env, hostname) || !fulfilmentId(job) || !user || user.is_anonymous || !user.email_confirmed_at || !client) throw Error("Support action unavailable.");
  const active = await client.rpc("sitefit_session_available"); if (active.error || active.data !== true) throw Error("Support action unavailable.");
  try { await fulfilmentRepository().resume(user.id, job); } catch { throw Error("Recovery is not permitted for this execution."); }
  revalidatePath("/internal/support");
}

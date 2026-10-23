import "server-only";
import { cookies } from "next/headers";
import { frameworkClient } from "../data/server-client.ts";
import { CAMPAIGN_COOKIE, campaignCode, measurementEnabled } from "./campaign.ts";
import {verifiedUser} from '../supabase/server.ts';
import type {snapshotEvent} from './snapshot-events.ts';
type Rpc = { rpc(name: string, args: Record<string, unknown>): { abortSignal(signal: AbortSignal): PromiseLike<{ error: unknown }> } };
/** Observation only: never changes reports, entitlement, reservations or dispatch. */
export async function observeCampaign(owner: string, report: string, purchaseStarted = false) {
  if (!measurementEnabled(process.env)) return;
  try {
    const campaign = campaignCode((await cookies()).get(CAMPAIGN_COOKIE)?.value);
    if (!campaign) return;
    await (frameworkClient() as unknown as Rpc).rpc("record_sitefit_campaign", {
      p_owner: owner, p_report: report, p_campaign: campaign, p_purchase_started: purchaseStarted,
    }).abortSignal(AbortSignal.timeout(750));
  } catch { /* Measurement failure cannot interrupt fulfilment or ask for another payment. */ }
}
export async function observeSnapshotInteraction(event:ReturnType<typeof snapshotEvent>){
 if(!measurementEnabled(process.env))return;
 try{
  const campaign=campaignCode((await cookies()).get(CAMPAIGN_COOKIE)?.value);if(!campaign)return;
  const {user}=await verifiedUser();if(!user)return;
  await (frameworkClient() as unknown as Rpc).rpc('record_sitefit_snapshot_interaction',{p_owner:user.id,p_report:event.report,p_campaign:campaign,p_key:`${event.event}:${event.detail}`}).abortSignal(AbortSignal.timeout(750));
 }catch{/* Observation must never block or reveal ownership. */}
}

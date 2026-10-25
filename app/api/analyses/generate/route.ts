import { createServerSupabase } from "@/lib/supabase/server";
import { sameOrigin, submissionBody, ownedGeneration } from "@/lib/analysis/http";
import { generateSnapshot } from "@/lib/analysis/generate";
import { observeCampaign } from "@/lib/marketing/repository";
import { sourceCollectionAllowed, commercialExecution } from "@/lib/release/policy";
import {snapshotStream} from '@/lib/analysis/progress-stream';
import type {SnapshotObserver} from '@/lib/analysis/progress';
import {controlledSnapshotConfigured} from '@/lib/proof/authority';
import {controlledTrialConfigured,publicCustomersConfigured} from '@/lib/proof/trial-policy';
import {assertTrialOwner,trialSnapshotPause,trialSourceRecoveryCandidate} from '@/lib/proof/trial';
import {recoverSourceSnapshot} from '@/lib/proof/recover-source-snapshot';
export const runtime = "nodejs";
export const maxDuration = 120;
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
export async function POST(request: Request) {
  const trial=controlledTrialConfigured(process.env,new URL(request.url).hostname);
  const proof=trial||controlledSnapshotConfigured(process.env,new URL(request.url).hostname);
  if(!proof&&!sourceCollectionAllowed(process.env,new URL(request.url).hostname))return reply({error:"Location analysis is not activated here."},503);
  if(!proof&&process.env.VERCEL_ENV==="production"&&!commercialExecution(process.env,new URL(request.url).hostname))return reply({error:"Location analysis is not activated here."},503);
  if (!sameOrigin(request)) return reply({ error: "Reload this page and try again." }, 403);
  let input;
  try { input = await submissionBody(request); } catch { return reply({ error: "Choose a resolved address and business type." }, 400); }
  const client = await createServerSupabase();
  if (!client) return reply({ error: "Snapshot generation is temporarily unavailable." }, 503);
  try {
    const verified = await client.auth.getUser();
    let user = verified.error ? null : verified.data.user;
    if(proof&&!publicCustomersConfigured(process.env,new URL(request.url).hostname)&&(!user||user.is_anonymous))return reply({error:"Sign in to the authorised account for this controlled check."},403);
    if (!user) {
      if (verified.error && verified.error.name !== "AuthSessionMissingError") return reply({ error: "Your session could not be verified. Reload and try again." }, 503);
      const guest = await client.auth.signInAnonymously();
      if (guest.error || !guest.data.user) return reply({ error: "Your private Snapshot session could not be created. Try again shortly." }, 503);
      const reverified = await client.auth.getUser(); user = reverified.error ? null : reverified.data.user;
      if (!user) return reply({ error: "Your session could not be verified." }, 503);
    }
    if(trial){try{await assertTrialOwner(user,new URL(request.url).hostname);}catch{return reply({error:'Location analysis is temporarily unavailable.'},503);}}
    const active = await client.rpc("sitefit_session_available");
    if (active.error || active.data !== true) return reply({ error: "Sign in to the account that now owns your Snapshots." }, 403);
    const owner=user.id;
    let recoveryCase:string|null=null;
    if(trial){
      const paused=await trialSnapshotPause(owner,input.propertyId,input.businessType);
      if(paused){
        const candidate=await trialSourceRecoveryCandidate(owner,input.propertyId,input.businessType);
        if(!candidate)return reply(paused,409);
        recoveryCase=candidate;
      }
    }
    const produce=async(observer?:SnapshotObserver)=>{
      const result=await ownedGeneration(owner,input,()=>recoveryCase
        ?recoverSourceSnapshot(owner,recoveryCase,request.signal,observer)
        :generateSnapshot(owner,input.propertyId,input.businessType,input.nonce,request.signal,observer));
      await observeCampaign(owner,result.reportId);return {reportId:result.reportId};
    };
    if(request.headers.get('accept')==='application/x-ndjson')return snapshotStream(produce,generationFailure);
    return reply(await produce());
  } catch (error) {
    return generationFailure(error);
  }
}
function generationFailure(error:unknown){
    const code = error instanceof Error ? error.message : "unavailable";
    if(code==='proof_manual_reconciliation_required'||code==='proof_or_rights_authority_denied'||code==='controlled_trial_denied')return reply({error:"Preparation is paused for authorised review. Saved records are retained. Do not resubmit this check."},503);
    const safeCodes = new Set(["submission_unavailable", "report_read_unavailable", "analysis_configuration_missing", "property_unavailable",
      "outside_analysis_coverage", "location_precision_unavailable", "source_persistence_incomplete", "stored_section_packet_mismatch",
      "section_analysis_incomplete", "synthesis_incomplete", "partial_report_persistence_failed", "report_persistence_failed", "stored_input_read_unavailable", "stored_report_read_unavailable", "generation_busy", "generation_limit"]);
    console.warn("snapshot_generation", { code: safeCodes.has(code) ? code : "unavailable" });
    if (code === "outside_analysis_coverage") return reply({ error: "Location analysis currently covers London. You can choose another address." }, 422);
    if (code === "location_precision_unavailable") return reply({ error: "This address has no usable location point. Select a returned postal address to generate local analysis." }, 422);
    if (code === "generation_busy" || code === "generation_limit") return reply({ error: code === "generation_busy" ? "A Snapshot is already being prepared. Wait for it to finish before starting another." : "You have reached the current Snapshot limit. Please try again later." }, 429);
    return reply({ error: "We could not complete your Snapshot. Saved source results are retained; retrying this request will reuse them." }, 503);
}

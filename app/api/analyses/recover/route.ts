import {createServerSupabase} from '@/lib/supabase/server';
import {sameOrigin,submissionBody} from '@/lib/analysis/http';
import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {savedSnapshotMaterial,recoverSavedSnapshot} from '@/lib/proof/recover-saved-snapshot';
export const runtime='nodejs';
export const maxDuration=60;
const reply=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
/** Explicit POST only; checking account/history never starts recovery or acquisition. */
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Reload this page and try again.'},403);
 const host=new URL(request.url).hostname;
 if(!controlledTrialConfigured(process.env,host))return reply({error:'Saved recovery is temporarily unavailable.'},503);
 let input;try{input=await submissionBody(request);}catch{return reply({error:'Choose a resolved address and business type.'},400);}
 try{
  const client=await createServerSupabase();if(!client)return reply({error:'Your private session could not be verified.'},503);
  const verified=await client.auth.getUser(),user=verified.error?null:verified.data.user;
  if(!user)return reply({error:'Sign in to the account that owns this check.'},403);
  const active=await client.rpc('sitefit_session_available');if(active.error||active.data!==true)return reply({error:'Sign in to the account that now owns this check.'},403);
  const material=await savedSnapshotMaterial(user.id,input.propertyId,input.businessType);
  if(!material)return reply({error:'This check cannot be recovered automatically yet. Your saved records are retained; contact support.'},409);
  const result=await recoverSavedSnapshot(user.id,material);
  return reply({reportId:result.reportId});
 }catch{return reply({error:'Saved recovery could not be confirmed. Your saved records are retained; try checking the saved status or contact support.'},503);}
}

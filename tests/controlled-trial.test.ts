import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledTrialConfigured,verifiedTrialIdentity,trialLimits} from '../lib/proof/trial-policy.ts';
import {commercialExecution,sourceCollectionAllowed,releasePolicy} from '../lib/release/policy.ts';
import {trialAddressFetch} from '../lib/proof/trial-address.ts';
import type {Json} from '../lib/supabase/database.types.ts';
test('owner trial requires exact Production origin and explicit authority; public gates remain closed',()=>{
 const env={VERCEL_ENV:'production',SITE_URL:'https://sitefit.co.uk',SITEFIT_CONTROLLED_TRIAL_ENABLED:'1',SITEFIT_CONTROLLED_TRIAL_ID:'00000000-0000-4000-8000-000000000001'};
 assert.equal(controlledTrialConfigured(env),true);
 for(const change of [{VERCEL_ENV:'preview'},{SITE_URL:'https://other.invalid'},{SITEFIT_CONTROLLED_TRIAL_ENABLED:'0'},{SITEFIT_CONTROLLED_TRIAL_ID:'invalid'}])assert.equal(controlledTrialConfigured({...env,...change}),false);
 assert.equal(controlledTrialConfigured(env,'other.invalid'),false);
 assert.equal(commercialExecution({...env,SITEFIT_COMMERCIAL_EXECUTION:'1'},'sitefit.co.uk'),false);
 assert.equal(sourceCollectionAllowed({...env,SITEFIT_COMMERCIAL_SOURCE_COLLECTION:'1'},'sitefit.co.uk'),false);
 assert.equal(releasePolicy.paidExecutionApproved,false);
});
function addressHarness(fail=false){
 const entries=new Map<string,{id:string;token:string;body:string|null;state:string}>();let calls=0;
 const invoke=async(name:string,args:Record<string,Json|null>)=>{
  if(name==='reserve_sitefit_trial_address'){
   const key=String(args.p_key),old=entries.get(key);if(old){if(old.state!=='received')throw Error('reconciliation');return old;}
   const row={id:'00000000-0000-4000-8000-000000000001',token:'00000000-0000-4000-8000-000000000002',body:null,state:'intent'};entries.set(key,row);return row;
  }
  const row=[...entries.values()].find(r=>r.id===args.p_id)!;if(row.state!=='intent')throw Error('conflict');row.body=args.p_body as string|null;row.state=row.body===null?'ambiguous':'received';return null;
 };
 const fetcher:typeof fetch=async()=>{calls++;if(fail)throw Error('timeout');return Response.json({data:{synthetic:true}});};
 return {entries,invoke,fetcher,calls:()=>calls};
}
test('Postio intent precedes fetch, concurrency sends once and successful refresh reads the saved response',async()=>{
 const h=addressHarness(),request=trialAddressFetch('synthetic',h.fetcher,h.invoke);
 const results=await Promise.allSettled([request('https://api.postio.co.uk/v1/postcodes/E84PH'),request('https://api.postio.co.uk/v1/postcodes/E84PH')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(h.calls(),1);
 const afterRestart=trialAddressFetch('synthetic',h.fetcher,h.invoke);
 assert.deepEqual(await(await afterRestart('https://api.postio.co.uk/v1/postcodes/E84PH')).json(),{data:{synthetic:true}});assert.equal(h.calls(),1);
});
test('Postio ambiguous outcomes stop redispatch and arbitrary external URLs are rejected before spending',async()=>{
 const h=addressHarness(true),request=trialAddressFetch('synthetic',h.fetcher,h.invoke);
 await assert.rejects(request('https://foreign.invalid/v1/address'));assert.equal(h.calls(),0);assert.equal(h.entries.size,0);
 await assert.rejects(request('https://api.postio.co.uk/v1/postcodes/E84PH'),/reconciliation/);
 await assert.rejects(request('https://api.postio.co.uk/v1/postcodes/E84PH'),/reconciliation/);
 assert.equal(h.calls(),1);assert.equal([...h.entries.values()][0].state,'ambiguous');
});
test('trial identity rejects anonymous, unverified and different accounts before provider allocation',()=>{
 const owner={id:'00000000-0000-4000-8000-000000000001',email:'shahinst21@gmail.com',email_confirmed_at:'2026-10-18T00:00:00Z',is_anonymous:false};
 assert.equal(verifiedTrialIdentity(owner),true);
 for(const user of [null,{...owner,is_anonymous:true},{...owner,email_confirmed_at:undefined},{...owner,email:'another@example.invalid'}])assert.equal(verifiedTrialIdentity(user),false);
 assert.equal(trialLimits.snapshotMicros*trialLimits.snapshots+trialLimits.fullMicros*trialLimits.fullReports,trialLimits.totalMicros);
 assert.equal(trialLimits.totalMicros,4250000);
});

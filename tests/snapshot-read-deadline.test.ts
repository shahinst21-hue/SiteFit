import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotRepository} from '../lib/data/snapshot-repository.ts';
import {context as fixtureContext} from './fixtures/data/framework.ts';

test('valid owned input may arrive after two seconds; caller cancellation still prevents further work',async()=>{
 const original=globalThis.fetch;const names=['SUPABASE_URL','SUPABASE_SECRET_KEY','VERCEL_ENV'];const saved=names.map(k=>[k,process.env[k]] as const);
 process.env.SUPABASE_URL='https://database.example.invalid';process.env.SUPABASE_SECRET_KEY='sb_secret_synthetic_fixture';delete process.env.VERCEL_ENV;
 const owner='10000000-0000-0000-0000-000000000009';
 const context=fixtureContext();
 try{
  let calls=0;
  globalThis.fetch=async(input,init)=>{
   calls++;const url=new URL(String(input));
   if(url.pathname.endsWith('/sitefit_assert_collectable')){
    await new Promise<void>((resolve,reject)=>{const signal=init?.signal;const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},2100);const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});});
    return Response.json({owner_id:owner,property_id:context.selectedProperty.id,business_type:context.businessType,business_category:context.category});
   }
   assert.equal(url.pathname,'/rest/v1/analysis_inputs');return Response.json({resolved_context:context});
  };
  const repository=snapshotRepository(owner);
  await assert.rejects(repository.context(context.analysisId,context.inputId,AbortSignal.timeout(2000)));assert.equal(calls,1);
  calls=0;
  assert.deepEqual(await repository.context(context.analysisId,context.inputId),context);assert.equal(calls,2);
  calls=0;await assert.rejects(repository.context(context.analysisId,context.inputId,AbortSignal.timeout(20)));assert.equal(calls,1);
 }finally{globalThis.fetch=original;for(const [k,v] of saved){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverStoredFull} from '../lib/fulfilment/recover-ready.ts';
test('completed Full recovery uses only the owned stored-edition RPC, including a lost-response retry',async()=>{
 const original=globalThis.fetch,names=['SUPABASE_URL','SUPABASE_SECRET_KEY'],saved=names.map(n=>[n,process.env[n]] as const);
 process.env.SUPABASE_URL='https://database.example.invalid';process.env.SUPABASE_SECRET_KEY='sb_secret_synthetic_fixture';
 const owner=crypto.randomUUID(),payment=crypto.randomUUID(),report=crypto.randomUUID();let requests=0,deny=false,lostReply=false;
 try{
  globalThis.fetch=async(input,init)=>{
   const u=new URL(String(input));assert.equal(u.origin,'https://database.example.invalid','No Stripe, AI or source endpoint is reachable');
   assert.equal(u.pathname,'/rest/v1/rpc/recover_sitefit_ready_fulfilment');requests++;
   assert.deepEqual(JSON.parse(String(init?.body)),{p_owner:owner,p_payment:payment,p_test:false});
   return deny?Response.json({message:'Synthetic private rejection'},{status:400}):lostReply?Response.json({message:'Synthetic lost acknowledgement'},{status:503}):Response.json(report);
  };
  assert.equal(await recoverStoredFull(owner,payment,false),report);
  lostReply=true;await assert.rejects(recoverStoredFull(owner,payment,false),/stored_full_recovery_unavailable/);lostReply=false;
  assert.equal(await recoverStoredFull(owner,payment,false),report);
  assert.equal(requests,3);deny=true;
  await assert.rejects(recoverStoredFull(owner,payment,false),/stored_full_recovery_unavailable/);
  assert.equal(requests,4);
  await assert.rejects(recoverStoredFull('foreign',payment,false),/invalid_recovery_identity/);assert.equal(requests,4);
 }finally{globalThis.fetch=original;for(const [n,v]of saved){if(v===undefined)delete process.env[n];else process.env[n]=v;}}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readPublicSupabaseConfig,PRODUCTION_SUPABASE_REF} from '../lib/supabase/config.ts';
import {frameworkClient} from '../lib/data/server-client.ts';
test('Production public Auth and privileged RPC clients refuse Development or another project before network work',()=>{
 const env={VERCEL_ENV:'production',SUPABASE_URL:`https://${PRODUCTION_SUPABASE_REF}.supabase.co`,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'};
 assert.ok(readPublicSupabaseConfig(env));
 assert.equal(readPublicSupabaseConfig({...env,SUPABASE_URL:'https://idlsjusbrmyucccostxt.supabase.co'}),null);
 const keys=['VERCEL_ENV','SUPABASE_URL','SUPABASE_SECRET_KEY'] as const;
 const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  process.env.VERCEL_ENV='production';process.env.SUPABASE_SECRET_KEY='sb_secret_synthetic';
  process.env.SUPABASE_URL='https://idlsjusbrmyucccostxt.supabase.co';assert.throws(()=>frameworkClient(),/configuration_missing/);
  process.env.SUPABASE_URL=env.SUPABASE_URL;assert.ok(frameworkClient());
 }finally{for(const key of keys){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
 assert.ok(readPublicSupabaseConfig({...env,VERCEL_ENV:'preview',SUPABASE_URL:'https://idlsjusbrmyucccostxt.supabase.co'}),'existing Development/Preview unchanged');
});

test('Local and Preview reject Production targets in public and privileged clients before network work',()=>{
 const saved={VERCEL_ENV:process.env.VERCEL_ENV,SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY};
 try{
  for(const runtime of [undefined,'preview','development']){
   if(runtime===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=runtime;
   process.env.SUPABASE_URL=`https://${PRODUCTION_SUPABASE_REF}.supabase.co`;process.env.SUPABASE_SECRET_KEY='sb_secret_synthetic';
   assert.equal(readPublicSupabaseConfig({...process.env,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'}),null);
   assert.throws(()=>frameworkClient(),/configuration_missing/);
  }
 }finally{for(const key of ['VERCEL_ENV','SUPABASE_URL','SUPABASE_SECRET_KEY'] as const){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});

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

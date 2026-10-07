// Explicit development-only synthetic fixture. Not a customer generator or inbox proof.
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync,writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import type { Database,Json } from '../../lib/supabase/database.types.ts';
import { validateFreeProjection } from '../../lib/analysis/projection.ts';
nextEnv.loadEnvConfig(process.cwd(),false,{info:()=>{},error:()=>{}});
async function prepare(){
 if(!process.argv.includes('--allow-development-fixture')||process.env.VERCEL_ENV||process.env.SITEFIT_TEST_PURCHASES_ENABLED!=='true'||process.env.SITEFIT_PURCHASE_ORIGIN!=='http://localhost:3000')throw Error('development_only');
 const origin=new URL(process.env.SUPABASE_URL!);if(origin.protocol!=='https:')throw Error('development_only');
 const cli=fileURLToPath(new URL('../../node_modules/supabase/dist/supabase.js',import.meta.url));
 const projects:unknown=JSON.parse(execFileSync(process.execPath,[cli,'projects','list','--output','json'],{stdio:['ignore','pipe','pipe'],timeout:30000}).toString());
 if(!Array.isArray(projects)||!projects.some(p=>p.id===origin.hostname.split('.')[0]&&p.name==='sitefit-dev'))throw Error('development_only');
 const admin=createClient<Database>(origin.origin,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const browserGuest=process.argv.includes('--browser-guest');
 let owner:string;let email:string|null=null;
 if(browserGuest){
  const marker=JSON.parse(readFileSync('supabase/.temp/payments/guest-start.json','utf8')) as {started:number};
  if(!Number.isSafeInteger(marker.started)||Date.now()-marker.started>600000||marker.started>Date.now())throw Error('fixture_guest_window_expired');
  const users=await admin.auth.admin.listUsers({page:1,perPage:1000});if(users.error)throw Error('fixture_guest_unavailable');
  const matches=users.data.users.filter(u=>u.is_anonymous&&Date.parse(u.created_at)>=marker.started);
  if(matches.length!==1)throw Error('fixture_guest_ambiguous');owner=matches[0].id;
  const history=await admin.from('analyses').select('id,properties!inner(formatted_address)').eq('owner_id',owner);
  if(history.error||history.data?.some(a=>a.properties.formatted_address!=='Synthetic Phase 7 guest proof only, London, SW1A 1AA'))throw Error('fixture_guest_has_existing_history');
 }else{
  email=`sitefit-phase7-${randomUUID()}@example.invalid`;
  const user=await admin.auth.admin.createUser({email,email_confirm:true,user_metadata:{developmentFixture:'phase7-test-only'}});
  if(user.error||!user.data.user)throw Error('fixture_identity_failed');owner=user.data.user.id;
 }
 const property=await admin.from('properties').insert({formatted_address:'Synthetic Phase 7 payment verification property — not analysed'}).select('id').single();if(property.error||!property.data)throw Error('fixture_property_failed');
 const analysis=await admin.from('analyses').insert({owner_id:owner,property_id:property.data.id,business_type:'coffee-shop',business_category:'coffee-shop',status:'free_ready'}).select('id').single();if(analysis.error||!analysis.data)throw Error('fixture_analysis_failed');
 const input=await admin.from('analysis_inputs').insert({analysis_id:analysis.data.id,version:1,user_supplied:{developmentFixture:'phase7-test-only'}}).select('id').single();if(input.error||!input.data)throw Error('fixture_input_failed');
 const projection=validateFreeProjection({schemaVersion:2,analysisId:analysis.data.id,generatedAt:new Date().toISOString(),property:{address:'Synthetic Phase 7 payment verification property — not analysed',resolution:'manual_unverified',precision:'unknown'},businessType:'coffee-shop',earlyView:{headline:'Synthetic payment test: no analysis performed.',reason:'No provider, AI or scoring execution.',meaning:'no_basis',strength:'insufficient',keyQuestions:['Development fixture only'],coverage:'No measured data'},dimensions:['customer-base','market-position','customer-access','premises'].map(id=>({id,title:'Synthetic fixture',conclusion:'Not analysed.',reason:'Synthetic payment verification only.',strength:'insufficient',meaning:'no_basis',score:null,scoreNote:'No score generated.',question:'Real analysis is outside this fixture.',implication:'No commercial conclusion.',why:{support:[],opposition:[],alternatives:[],unknowns:['No analysis performed'],observations:[],comparison:null,sources:[]}}))});
 const report=await admin.from('reports').insert({analysis_id:analysis.data.id,input_id:input.data.id,version:1,schema_version:2,tier:'free',status:'ready',free_projection:projection as unknown as Json}).select('id').single();if(report.error||!report.data)throw Error('fixture_report_failed');
 const audit=await admin.from('system_events').insert({analysis_id:analysis.data.id,report_id:report.data.id,event_type:'phase7_synthetic_fixture',outcome:'test',safe_metadata:{synthetic:true,providerCalls:0,aiCalls:0,scoreCalls:0}});if(audit.error)throw Error('fixture_audit_failed');
 if(browserGuest){
  writeFileSync('supabase/.temp/payments/guest-proof.json',JSON.stringify({report:report.data.id,analysis:analysis.data.id,owner}));
  console.log(JSON.stringify({syntheticGuestFixtureReady:true,existingBrowserSessionRetained:true,providerCalls:0,aiCalls:0,scoreCalls:0}));return;
 }
 const link=await admin.auth.admin.generateLink({type:'magiclink',email:email!});if(link.error||!link.data.properties.hashed_token)throw Error('fixture_link_failed');
 // One-time credential remains ignored/private. Never print it or claim email delivery.
 const handoff={url:`http://localhost:3000/auth/confirm?token_hash=${encodeURIComponent(link.data.properties.hashed_token)}&type=email`,report:report.data.id,analysis:analysis.data.id,owner};
 writeFileSync('supabase/.temp/payments/local-proof.json',JSON.stringify(handoff));
 console.log(JSON.stringify({syntheticFixtureReady:true,privateHandoffSaved:true,providerCalls:0,aiCalls:0,scoreCalls:0,retainedImmutableTestHistory:true}));
}
prepare().catch(()=>{console.error('Development fixture proof unavailable; no secret, token, identity or provider payload logged. Partial synthetic records are retained for scoped review.');process.exitCode=1;});

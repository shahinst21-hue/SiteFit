/* global Request,FormData */
import process from 'node:process';import console from 'node:console';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL,URL} from 'node:url';import {registerHooks} from 'node:module';import ts from 'typescript';
import {hashProof,CLAIM_COOKIE} from '../../lib/auth/purchase-flow.ts';
import {CHECKOUT_INTENT_COOKIE,signCheckoutIntent} from '../../lib/auth/checkout-intent.ts';
import {salePolicy} from '../../lib/legal/sale.ts';
const mode=process.argv[2],method=mode.startsWith('email')?'email':'google';
const guest='00000000-0000-4000-8000-000000000001',target='00000000-0000-4000-8000-000000000002',report='00000000-0000-4000-8000-000000000003',id='00000000-0000-4000-8000-000000000004';
const jar=new Map(),calls=[],writes=[];let proof={id,capability:'a'.repeat(64),browser:'b'.repeat(64)},user={id:guest,is_anonymous:true},recordAttempts=0,emailRedirect=null,tokenUses=0;
let claim={id,guest_id:guest,report_id:report,method:mode==='switch'?'email':null,state:'pending',expires_at:new Date(Date.now()+(mode==='expired'?-1000:3600000)).toISOString(),auth_target_id:mode==='verified'?target:null,target_id:null,email_sha256:mode==='switch'?hashProof('old@example.invalid'):null};
process.env.VERCEL_ENV='production';process.env.SITE_URL='https://sitefit.co.uk';process.env.SITEFIT_CONTROLLED_TRIAL_ENABLED='1';process.env.SITEFIT_CONTROLLED_TRIAL_ID=id;process.env.SUPABASE_URL='https://vsfkkroxgntoumoqcfcy.supabase.co';process.env.SUPABASE_SECRET_KEY='synthetic-private-signing-secret';
jar.set(CLAIM_COOKIE,{value:`${id}.${proof.capability}.${proof.browser}`});
const consent={version:salePolicy.version,buyerKind:'consumer',termsAccepted:true,immediateRequested:true,acknowledgement:true};
jar.set(CHECKOUT_INTENT_COOKIE,{value:signCheckoutIntent(report,consent,process.env.SUPABASE_SECRET_KEY,Date.now()-(mode==='expired-intent'?700000:0))});
const permanent=()=>({id:target,is_anonymous:false,email:'buyer@example.invalid',email_confirmed_at:'2026-10-28',identities:[{provider:method}]});
const auth={
 async signInWithOAuth(input){calls.push('oauth');assert.equal(input.provider,'google');assert.equal(input.options.redirectTo,'https://sitefit.co.uk/purchase/callback');assert.equal(input.options.skipBrowserRedirect,true);return {data:{url:process.env.SUPABASE_URL+'/auth/v1/authorize?provider=google'},error:null};},
 async signInWithOtp(input){calls.push('email');assert.equal(input.email,'buyer@example.invalid');assert.equal(input.options.shouldCreateUser,true);emailRedirect=input.options.emailRedirectTo;assert.match(input.options.emailRedirectTo,/^https:\/\/sitefit\.co\.uk\/purchase\/callback\?continuation=/);return {error:mode==='email-unavailable'?{status:403,code:'email_address_not_authorized'}:null};},
 async linkIdentity(){assert.fail('Manual identity linking must not be used');},async updateUser(){assert.fail('Guest email-change registration must not be used');},
 async exchangeCodeForSession(){calls.push('exchange');user=permanent();return {error:null};},
 async verifyOtp(input){assert.equal(input.type,'email');calls.push('otp');tokenUses++;if(mode==='email-expired-link'||tokenUses>1)return {error:{code:'otp_expired'}};user=permanent();return {error:null};},
 async getUser(){return {data:{user},error:null};},
};
const client={auth,async rpc(name,args){assert.ok(['read_sitefit_free','read_sitefit_purchase'].includes(name));assert.equal(args.p_report,report);return {data:name==='read_sitefit_free'?{analysisId:id}:null,error:null};}};
const valid=p=>{assert.deepEqual(p,proof);};
globalThis.purchaseSigninFixture={
 origin:mode==='email-foreign-origin'?'https://foreign.invalid':'https://sitefit.co.uk',
 emailFinish(c,t,cap,r){assert.equal(c,id);assert.equal(t,target);assert.equal(cap,proof.capability);assert.equal(r,report);recordAttempts++;if(mode==='email-post-auth-retry'&&recordAttempts===1)throw Error('temporary DB outage');claim.state='completed';claim.auth_target_id=t;claim.target_id=t;calls.push('finish');return report;},
 jar:{get:name=>jar.get(name),set:(name,value,options)=>{writes.push({name,value,options});jar.set(name,{value});},delete:({name})=>jar.delete(name)},
 verified:async()=>({client,user}),server:async()=>client,
 read(p){valid(p);return {...claim};},
 prepare(g,r,p){assert.equal(g,guest);assert.equal(r,report);assert.ok(claim.state==='cancelled');proof={...p,id};claim={...claim,method:null,email_sha256:null,state:'pending',auth_target_id:null,expires_at:new Date(Date.now()+3600000).toISOString()};calls.push('prepare');return {...claim};},
 cancel(p,g){valid(p);assert.equal(g,guest);assert.equal(claim.auth_target_id,null);claim.state='cancelled';calls.push('cancel');},
 start(p,g,m,email){valid(p);assert.equal(g,guest);claim.method=m;claim.email_sha256=email?hashProof(email.toLowerCase()):null;calls.push('start');},
 record(p,t,m){valid(p);assert.equal(t,target);assert.equal(m,method);recordAttempts++;if(mode==='receipt-retry'&&recordAttempts===1)throw Error('temporary database failure');claim.auth_target_id=t;calls.push('record');},
 finish(p,t){valid(p);assert.equal(claim.auth_target_id,t);assert.equal(t,target);claim.state='completed';claim.target_id=t;calls.push('finish');return report;},
};
const mocks={
 'server-only':'export {};',
 'next/link':'export default function Link(){return null;}',
 'next/headers':'export const cookies=async()=>globalThis.purchaseSigninFixture.jar;export const headers=async()=>new Headers({origin:globalThis.purchaseSigninFixture.origin});',
 'next/navigation':'export const notFound=()=>{throw Error("NOT_FOUND")};export const redirect=url=>{throw Error("REDIRECT:"+url)};',
 'next/server':'export const NextResponse={redirect:(url,status)=>new Response(null,{status,headers:{Location:String(url)}})};',
 '@/lib/supabase/server':'export const verifiedUser=()=>globalThis.purchaseSigninFixture.verified();export const createServerSupabase=()=>globalThis.purchaseSigninFixture.server();',
 '@/lib/auth/claim-repository':'export const finishEmailClaim=(...a)=>globalThis.purchaseSigninFixture.emailFinish(...a);export const readClaim=p=>globalThis.purchaseSigninFixture.read(p);export const prepareClaim=(...a)=>globalThis.purchaseSigninFixture.prepare(...a);export const startClaimAuth=(...a)=>globalThis.purchaseSigninFixture.start(...a);export const recordClaimAuth=(...a)=>globalThis.purchaseSigninFixture.record(...a);export const finishClaim=(...a)=>globalThis.purchaseSigninFixture.finish(...a);export const cancelClaim=(...a)=>globalThis.purchaseSigninFixture.cancel(...a);',
 '@/lib/proof/trial':'export const assertTrialOwner=async()=>{};',
 '@/components/purchase-auth':'export const PurchaseAuth=()=>null;',
 '@/components/purchase-claim':'export const PurchaseClaim=()=>null;',
 '@/components/checkout-continuation':'export const CheckoutContinuation=()=>null;',
};
registerHooks({resolve(s,c,next){
 if(mocks[s])return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};
 if(s.startsWith('@/')||s.startsWith('.')){
  const base=s.startsWith('@/')?path.resolve(s.slice(2)):path.resolve(path.dirname(fileURLToPath(c.parentURL)),s);
  if(base.replaceAll('\\','/').endsWith('/lib/auth/claim-repository.ts'))return {url:'data:text/javascript,'+encodeURIComponent(mocks['@/lib/auth/claim-repository']),shortCircuit:true};
  if(!path.extname(base))for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,c);
 }return next(s,c);
},load(url,c,next){if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c);}});
globalThis.fetch=async()=>assert.fail('No external transport or payment permitted');
const {POST}=await import('../../app/purchase/identity/route.ts');
if(mode==='foreign')user={id:target,is_anonymous:true};
const identity=await POST(new Request('https://sitefit.co.uk/purchase/identity',{method:'POST',headers:{origin:mode==='cross-origin'?'https://foreign.invalid':'https://sitefit.co.uk','content-type':'application/json'},body:JSON.stringify({action:method,email:'buyer@example.invalid'})}));
if(['foreign','cross-origin','verified','email-unavailable'].includes(mode)){
 assert.equal(identity.status,mode==='cross-origin'?403:mode==='email-unavailable'?503:400);const value=await identity.json();assert.notEqual(value.sent,true);assert.ok(!calls.includes('finish'));if(mode!=='email-unavailable')assert.ok(!calls.includes('oauth')&&!calls.includes('email')&&!calls.includes('cancel'));
}else{
 assert.equal(identity.status,200);const data=await identity.json();if(method==='google'){assert.match(data.url,/\/auth\/v1\/authorize\?provider=google/);assert.ok(calls.includes('oauth'));}else assert.equal(data.sent,true);
 if(['switch','expired'].includes(mode)){assert.ok(calls.includes('cancel')&&calls.includes('prepare'));assert.notEqual(proof.capability,'a'.repeat(64));assert.notEqual(proof.browser,'b'.repeat(64));assert.equal(claim.report_id,report);}
 if(['email-device','email-post-auth-retry','email-expired-link','email-foreign-origin','email-tamper','email-replay'].includes(mode)){
  jar.clear(); // Fresh device: neither anonymous browser proof nor checkout consent is copied.
  const {confirmSignIn}=await import('../../app/auth/actions.ts');
  const form=new FormData();form.set('token_hash','c'.repeat(64));form.set('next',mode==='email-tamper'?emailRedirect+'.tamper':emailRedirect);
  const failure=['email-expired-link','email-foreign-origin','email-tamper'].includes(mode);
  await assert.rejects(confirmSignIn(form),new RegExp('^Error: REDIRECT:'+(failure?'/login\\?error=invalid-link':mode==='email-post-auth-retry'?'/auth/confirm\\?retry=1':'/purchase/resume\\?report='+report)+'$'));
  if(mode==='email-post-auth-retry'){const retry=new FormData();retry.set('retry','1');await assert.rejects(confirmSignIn(retry),new RegExp('^Error: REDIRECT:/purchase/resume\\?report='+report+'$'));assert.equal(tokenUses,1);}
  if(mode==='email-replay')await assert.rejects(confirmSignIn(form),/^Error: REDIRECT:\/login\?error=invalid-link$/);
  assert.equal(jar.has(CLAIM_COOKIE),false);
  if(failure)assert.equal(calls.includes('finish'),false);else{
   assert.equal(claim.target_id,target);assert.equal(calls.filter(c=>c==='finish').length,1);
   const {default:Resume}=await import('../../app/purchase/resume/page.tsx');await assert.rejects(Resume({searchParams:Promise.resolve({report})}),new RegExp('^Error: REDIRECT:/snapshots/'+report+'\\?purchase=1&signed_in=1$'));
  }
 }else{
 const {GET}=await import('../../app/purchase/callback/route.ts');const callback=await GET({nextUrl:new URL('https://sitefit.co.uk/purchase/callback?code='+'c'.repeat(24))});assert.equal(callback.status,303);assert.equal(callback.headers.get('location'),'https://sitefit.co.uk/purchase/resume');
 const {default:AuthPage}=await import('../../app/purchase/auth/page.tsx');await assert.rejects(AuthPage({searchParams:Promise.resolve({})}),/^Error: REDIRECT:\/purchase\/resume$/);
 const {POST:complete}=await import('../../app/purchase/claim/route.ts');const connected=await complete(new Request('https://sitefit.co.uk/purchase/claim',{method:'POST',headers:{origin:'https://sitefit.co.uk','content-type':'application/json'},body:'{}'}));assert.equal(connected.status,200);assert.equal((await connected.json()).url,'/purchase/resume?report='+report);assert.equal(claim.target_id,target);
 const {default:Resume}=await import('../../app/purchase/resume/page.tsx');await assert.rejects(Resume({searchParams:Promise.resolve({report})}),new RegExp('^Error: REDIRECT:'+(mode==='expired-intent'?'/snapshots/'+report+'\\?purchase=1&signed_in=1':'/purchase/continue')+'$'));
 if(mode!=='expired-intent'){const {default:Continue}=await import('../../app/purchase/continue/page.tsx');const element=await Continue();assert.equal(element.props.report,report);assert.deepEqual(element.props.consent,consent);}
 assert.equal(calls.filter(c=>c==='finish').length,1);assert.equal(claim.report_id,report);
 }
}
console.log(JSON.stringify({mode,originalReportRetained:true,paymentRequests:0,externalRequests:0}));

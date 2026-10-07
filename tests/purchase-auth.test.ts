import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { claimCookie,newProof,permanentIdentity,hashProof,signedAuthReceipt,validAuthReceipt } from "../lib/auth/purchase-flow.ts";
import { purchaseOrigin,purchaseSameOrigin,stripeConfig } from "../lib/payments/config.ts";
import { boundedJson } from "../lib/payments/http.ts";
const id="70000000-0000-4000-8000-000000000001";
const permanent={id,is_anonymous:false,email:"owner@example.invalid",email_confirmed_at:"2026-10-06T10:00:00Z",identities:[{provider:"email"}]};
test("declared development redirects retain both generic and purchase PKCE callbacks",async()=>{
 const config=await readFile(new URL("../supabase/config.toml",import.meta.url),"utf8");
 const list=config.match(/additional_redirect_urls\s*=\s*\[([\s\S]*?)\]/)?.[1];
 assert.ok(list,"Explicit development redirect allowlist required");
 const urls=Array.from(list.matchAll(/"([^"\n]+)"/g),m=>m[1]);
 for(const path of ["/auth/callback","/purchase/callback"])
  assert.ok(urls.includes(`http://localhost:3000${path}`),`Missing exact Local ${path}`);
 assert.equal(urls.some(url=>url.includes("*")),false,"Development callbacks must not require wildcard exposure");
});
test("purchase admission requires verified permanent platform identity, never email alone",()=>{
 assert.equal(permanentIdentity(permanent),true);
 assert.equal(permanentIdentity({...permanent,identities:[{provider:"google"}]}),true);
 for(const user of [null,{...permanent,is_anonymous:true},{...permanent,email_confirmed_at:undefined},{...permanent,identities:[]},{...permanent,id:"fake"},{...permanent,email:"a@b"}])assert.equal(permanentIdentity(user),false);
});
test("continuation proofs are independently random, exact and hashed",()=>{
 const capability=newProof(),browser=newProof();assert.notEqual(capability,browser);
 const value=`${id}.${capability}.${browser}`;assert.deepEqual(claimCookie(value),{id,capability,browser});
 for(const invalid of [undefined,value+".extra",value.toUpperCase(),`${id}.${capability}`,`fake.${capability}.${browser}`])assert.equal(claimCookie(invalid),null);
 assert.match(hashProof(capability),/^[a-f0-9]{64}$/);assert.notEqual(hashProof(capability),capability);
});
test("purchase environment fails closed including production flags and forged browser hosts",()=>{
 const local={SITEFIT_TEST_PURCHASES_ENABLED:"true",SITEFIT_PURCHASE_ORIGIN:"http://localhost:3000"};
 assert.equal(purchaseOrigin(local),"http://localhost:3000");
 for(const env of [{},{...local,VERCEL_ENV:"production"},{...local,VERCEL:"1"},{...local,SITEFIT_PURCHASE_ORIGIN:"https://evil.invalid"},{...local,SITEFIT_PURCHASE_ORIGIN:"http://localhost:3000/path"}])assert.equal(purchaseOrigin(env),null);
 assert.equal(purchaseOrigin({...local,VERCEL:"1",VERCEL_ENV:"preview",SITEFIT_PURCHASE_ORIGIN:"https://sitefit-preview.vercel.app"}),"https://sitefit-preview.vercel.app");
 assert.equal(purchaseSameOrigin(new Request("http://evil.invalid",{headers:{origin:"http://localhost:3000"}}),local),true);
 for(const headers of ([{origin:"https://evil.invalid"},{origin:"http://localhost:3000","sec-fetch-site":"cross-site"},{}] as Record<string,string>[]))assert.equal(purchaseSameOrigin(new Request("http://localhost:3000",{headers}),local),false);
 assert.throws(()=>stripeConfig({...local,STRIPE_SECRET_KEY:"sk_live_example",STRIPE_FULL_REPORT_PRICE_ID:"price_example"}));
 assert.throws(()=>stripeConfig(local));
});
test("browser mutation input bounds reject malformed, oversized and non-object JSON",async()=>{
 const request=(body:string,type="application/json")=>new Request("http://localhost:3000",{method:"POST",headers:{"content-type":type},body});
 assert.deepEqual(await boundedJson(request('{"action":"email"}')),{action:"email"});
 for(const req of [request("[]"),request("null"),request("bad"),request('{"x":"'+"a".repeat(1024)+'"}'),request("{}","text/plain")])await assert.rejects(()=>boundedJson(req));
});
test('PKCE continuation receipt cannot be forged, moved to another intent/target or used after expiry',()=>{
 const proof={id,capability:newProof(),browser:newProof()},target='70000000-0000-4000-8000-000000000002';
 const value=signedAuthReceipt(proof,target,'google','test-private-fixture',1000);
 assert.equal(validAuthReceipt(value,proof,target,'google','test-private-fixture',1001),true);
 for(const valid of [validAuthReceipt(value+'.extra',proof,target,'google','test-private-fixture',1001),validAuthReceipt(value,proof,id,'google','test-private-fixture',1001),validAuthReceipt(value,{...proof,browser:newProof()},target,'google','test-private-fixture',1001),validAuthReceipt(value,proof,target,'email','test-private-fixture',1001),validAuthReceipt(value,proof,target,'google','other-key',1001),validAuthReceipt(value,proof,target,'google','test-private-fixture',601000)])assert.equal(valid,false);
});

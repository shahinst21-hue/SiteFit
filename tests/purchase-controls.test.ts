import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { retryPurchaseNavigation,purchaseNavigation } from "../lib/payments/purchase-navigation.ts";
import { purchaseAvailableOnHost } from "../lib/payments/config.ts";
const origin="https://preview.example.org", report="00000000-0000-4000-8000-000000000001";
test("purchase presentation is unavailable for missing Test credentials, wrong Preview host and Production",()=>{
  const env={VERCEL:"1",VERCEL_ENV:"preview",SITEFIT_TEST_PURCHASES_ENABLED:"true",SITEFIT_PURCHASE_ORIGIN:origin,STRIPE_SECRET_KEY:"sk_test_synthetic",STRIPE_FULL_REPORT_PRICE_ID:"price_synthetic"};
  assert.equal(purchaseAvailableOnHost(env,"preview.example.org"),true);
  for(const [config,host] of [[{},"preview.example.org"],[env,"old-preview.example.org"],[env,null],[{...env,STRIPE_SECRET_KEY:undefined},"preview.example.org"],[{...env,VERCEL_ENV:"production"},"preview.example.org"]] as const)
    assert.equal(purchaseAvailableOnHost(config,host),false);
});
test("Snapshot desktop and mobile purchase controls share report-bound purchase actions; no price anchor fallback",async()=>{
  const text=await readFile(new URL("../components/free-snapshot.tsx",import.meta.url),"utf8");
  const source=ts.createSourceFile("snapshot.tsx",text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const controls: string[]=[];let priceAnchors=0;
  function visit(node:ts.Node){
    if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(source)==="PurchaseButton"){
      const attributes=node.attributes.properties.filter(ts.isJsxAttribute);
      const id=attributes.find(a=>a.name.getText(source)==="controlId")?.initializer;
      assert.ok(id?.getText(source).includes('snapshot-purchase-'));
      assert.equal(attributes.find(a=>a.name.getText(source)==="report")?.initializer?.getText(source).replace(/\s/g,''),"{!demo?purchaseReport:undefined}");
    }
    if(ts.isCallExpression(node)&&node.expression.getText(source)==='purchase'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))controls.push(`snapshot-purchase-${node.arguments[0].text}`);
    if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(source)==="a"&&node.getText(source).includes("Check the Full Case"))priceAnchors++;
    ts.forEachChild(node,visit);
  }
  visit(source);assert.deepEqual(controls.sort(),["snapshot-purchase-brief","snapshot-purchase-mobile","snapshot-purchase-primary"]);assert.equal(priceAnchors,0);
});
test("purchase start preserves report identity and only accepts real authentication/resume destinations",async()=>{
  for(const destination of ["/purchase/auth",`/purchase/resume?report=${report}`]){
    const fetcher:typeof fetch=async(url,init)=>{assert.equal(url,"/purchase/start");assert.equal(init?.method,"POST");assert.deepEqual(JSON.parse(String(init?.body)),{reportId:report});return Response.json({url:destination});};
    assert.equal(await purchaseNavigation(report,false,origin,fetcher),new URL(destination,origin).href);
  }
  for(const destination of ["#full-case","#report-outline",`/snapshots/${report}`,"/purchase/auth#full-case","https://evil.example/purchase/auth"])
    await assert.rejects(()=>purchaseNavigation(report,false,origin,async()=>Response.json({url:destination})));
});
test("verified checkout uses its separate POST and rejects page anchors, non-Stripe redirects and failed responses",async()=>{
  assert.equal(await purchaseNavigation(report,true,origin,async(url,init)=>{assert.equal(url,"/purchase/checkout");assert.deepEqual(JSON.parse(String(init?.body)),{reportId:report});return Response.json({url:"https://checkout.stripe.com/c/pay/synthetic_test_only"});}),"https://checkout.stripe.com/c/pay/synthetic_test_only");
  for(const destination of ["#full-case","/purchase/auth?next=https://evil.example","https://checkout.stripe.com/not-checkout"])
    await assert.rejects(()=>purchaseNavigation(report,true,origin,async()=>Response.json({url:destination})));
  await assert.rejects(()=>purchaseNavigation(report,false,origin,async()=>Response.json({url:"/purchase/auth"},{status:503})));
});

test("verified Stripe Checkout preserves provider fragment while internal anchors and credential URLs remain rejected",async()=>{
  const destination="https://checkout.stripe.com/c/pay/synthetic_test_only#synthetic-provider-state";
  assert.equal(await purchaseNavigation(report,true,origin,async()=>Response.json({url:destination})),destination);
  for(const url of ["https://user:password@checkout.stripe.com/c/pay/synthetic_test_only#state","https://checkout.stripe.com.evil.example/c/pay/test#state"])
    await assert.rejects(()=>purchaseNavigation(report,true,origin,async()=>Response.json({url})));
  await assert.rejects(()=>purchaseNavigation(report,false,origin,async()=>Response.json({url:"/purchase/resume#state"})));
});

test('checkout permits only the fixed login continuation and preserved guest claim, never an arbitrary internal redirect',async()=>{
 for(const destination of ['/login?next=%2Fpurchase%2Fcontinue','/purchase/auth'])assert.equal(await purchaseNavigation(report,true,origin,async()=>Response.json({url:destination})),origin+destination);
 for(const destination of ['/login?next=https://evil.example','/login?next=%2Fpurchase%2Fcontinue&extra=1','/login?next=%2Fpurchase%2Fcontinue#fragment','/purchase/auth#fragment','https://evil.example/login?next=%2Fpurchase%2Fcontinue'])await assert.rejects(()=>purchaseNavigation(report,true,origin,async()=>Response.json({url:destination})));
});

test('client accepts the verified f/pay Stripe format and keeps provider fragment state',async()=>{
 const destination='https://checkout.stripe.com/f/pay/cs_live_synthetic#synthetic-provider-state';
 assert.equal(await purchaseNavigation(report,true,origin,async()=>Response.json({url:destination})),destination);
 for(const url of ['https://checkout.stripe.com:8443/f/pay/example','https://checkout.stripe.com.evil.example/f/pay/example','https://user@checkout.stripe.com/f/pay/example','https://checkout.stripe.com/f/pay/','https://checkout.stripe.com/f/other/example'])await assert.rejects(()=>purchaseNavigation(report,true,origin,async()=>Response.json({url})));
});

test('bounded Checkout recovery errors explain the saved state without forwarding provider details',async()=>{
 const fetcher=(code:string)=>async()=>new Response(JSON.stringify({error:'private provider details must not surface',code}),{status:409});
 await assert.rejects(()=>purchaseNavigation(report,true,origin,fetcher('checkout_reconciliation_required') as typeof fetch),/previous payment attempt needs verification/);
 await assert.rejects(()=>purchaseNavigation(report,true,origin,fetcher('trial_full_budget_exhausted') as typeof fetch),/Full Report purchase allocated/);
 try{await purchaseNavigation(report,true,origin,fetcher('secret-provider-code') as typeof fetch);assert.fail();}catch(e){assert.ok(e instanceof Error);assert.doesNotMatch(e.message,/private provider|secret-provider/);}
});

test('payment retry uses owner-scoped POST and validates secure recovery destinations',async()=>{
 for(const url of ['https://checkout.stripe.com/c/pay/synthetic',`/purchase/return?purchase=${report}`,`/snapshots/${report}?purchase=1`])assert.equal(await retryPurchaseNavigation(report,report,origin,async(path,init)=>{assert.equal(path,'/purchase/retry');assert.equal(init?.method,'POST');assert.deepEqual(JSON.parse(String(init?.body)),{purchaseId:report});return Response.json({url});}),new URL(url,origin).href);
 for(const url of ['https://evil.example/','/account','javascript:alert(1)',`/snapshots/${report}?purchase=1#unsafe`])await assert.rejects(()=>retryPurchaseNavigation(report,report,origin,async()=>Response.json({url})));
 await assert.rejects(()=>retryPurchaseNavigation(report,report,origin,async()=>Response.json({error:'uncertain'},{status:409})));
});

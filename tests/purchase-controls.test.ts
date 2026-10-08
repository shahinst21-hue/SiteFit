import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { purchaseNavigation } from "../lib/payments/purchase-navigation.ts";
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
      if(id&&ts.isStringLiteral(id))controls.push(id.text);
      assert.equal(attributes.find(a=>a.name.getText(source)==="report")?.initializer?.getText(source),"{!demo ? purchaseReport : undefined}");
    }
    if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(source)==="a"&&node.getText(source).includes("Check the Full Case"))priceAnchors++;
    ts.forEachChild(node,visit);
  }
  visit(source);assert.deepEqual(controls.sort(),["snapshot-purchase-mobile","snapshot-purchase-primary"]);assert.equal(priceAnchors,0);
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
  for(const destination of ["#full-case","/purchase/auth","https://checkout.stripe.com/not-checkout"])
    await assert.rejects(()=>purchaseNavigation(report,true,origin,async()=>Response.json({url:destination})));
  await assert.rejects(()=>purchaseNavigation(report,false,origin,async()=>Response.json({url:"/purchase/auth"},{status:503})));
});

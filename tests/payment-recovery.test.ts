import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import { activeTestPurchaseId, activePurchaseId } from "../lib/payments/purchase-projection.ts";

test("returning purchase recovery admits only a complete active Test projection", () => {
  const id = "ffc2fa96-1f39-49ba-aeda-ee3ada803300";
  const confirmed = { id, status: "succeeded", access: "active", test: true, reportGenerated: false };
  assert.equal(activeTestPurchaseId(confirmed), id);
  assert.equal(activePurchaseId({...confirmed,test:false},false),id);
  assert.equal(activePurchaseId(confirmed,false),null);
  assert.equal(activePurchaseId({...confirmed,test:false,access:'revoked'},false),null);
  for (const value of [null, undefined, [], id, {},
    { ...confirmed, id: "https://outside.example" },
    { ...confirmed, status: "pending" }, { ...confirmed, status: "refunded" },
    { ...confirmed, access: "suspended" }, { ...confirmed, access: "revoked" },
    { ...confirmed, test: false }, { ...confirmed, test: "true" },
    { ...confirmed, reportGenerated: true }, { ...confirmed, reportGenerated: undefined }]) {
    assert.equal(activeTestPurchaseId(value), null);
  }
});

test("actual Live purchase UI shows confirmed status and stored Ready report without Test claims",()=>{
 const id="ffc2fa96-1f39-49ba-aeda-ee3ada803300";
 const initial={id,report:id,status:"succeeded",access:"active",test:false,confirmationAvailable:true,fulfilment:{state:"ready",reportId:id}};
 const render=(value:unknown)=>{const r=spawnSync(process.execPath,["tests/fixtures/render-purchase-status.mjs"],{encoding:"utf8",input:JSON.stringify(value)});assert.equal(r.status,0,r.stderr);return r.stdout;};
 const live=render(initial);assert.match(live,/Payment confirmed\./);assert.match(live,new RegExp(`/reports/${id}`));assert.match(live,/Download contract confirmation/);assert.doesNotMatch(live,/Test payment|\[object Object\]|generation is not enabled/);
 assert.match(render({...initial,test:true}),/Test payment confirmed\./);
});

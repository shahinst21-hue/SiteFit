import {spawnSync} from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import {salePolicy,validateSaleConsent,requireApprovedSale,cancellationReason} from "../lib/legal/sale.ts";
import {confirmationPDF} from "../lib/legal/confirmation.ts";
import {PDFDocument} from "pdf-lib";
const consent={version:salePolicy.version,buyerKind:"consumer",termsAccepted:true,immediateRequested:true,acknowledgement:true};
test("draft sale cannot be activated through submitted consent; all independent unchecked fields reject",()=>{
 assert.throws(requireApprovedSale,/not_approved/);assert.deepEqual(validateSaleConsent(consent),consent);
 for(const key of ["termsAccepted","immediateRequested","acknowledgement"])assert.throws(()=>validateSaleConsent({...consent,[key]:false}));
 assert.throws(()=>validateSaleConsent({...consent,version:"invented"}));assert.throws(()=>validateSaleConsent({...consent,waiver:true}));
 assert.equal(validateSaleConsent({...consent,buyerKind:"business"}).acknowledgement,true);
 assert.equal(salePolicy.consumerCancellationDays,14);
 assert.equal(salePolicy.reportAccessDays,30);assert.equal(salePolicy.additionalCheckoutFeeMinor,0);assert.equal(salePolicy.priceMinor,2900);
});
test("cancellation reasons are bounded; requests are distinct from checkout cancellation",()=>{
 for(const reason of ["change_of_mind","failed_delivery","report_problem","other"])assert.equal(cancellationReason(reason),reason);
 assert.throws(()=>cancellationReason("raw private complaint"));assert.throws(()=>cancellationReason("cancel=1"));
});
test("contract PDF requires complete frozen policy text; prepared PDF is not legal delivery",async()=>{
 await assert.rejects(()=>confirmationPDF({version:"draft",policy:{}}));
 const bytes=await confirmationPDF({version:"synthetic-only",acceptedAt:"2026-10-12",consent,policy:{termsText:"Synthetic terms. Statutory rights unaffected.",privacyText:"Synthetic privacy policy for verification only.",retentionText:"Synthetic retention criteria for verification only."}});
 assert.ok((await PDFDocument.load(bytes)).getPageCount()>0);
});

test("actual checkout UI starts unchecked and cannot enable draft supply",()=>{
 const r=spawnSync(process.execPath,["tests/fixtures/render-sale.mjs"],{encoding:"utf8"});assert.equal(r.status,0,r.stderr);
 assert.equal((r.stdout.match(/type="checkbox"/g)||[]).length,3);assert.doesNotMatch(r.stdout,/checked=""/);
 assert.match(r.stdout,/disabled=""/);assert.match(r.stdout,/contractual 14-day cancellation/);assert.match(r.stdout,/not itself remove/);
});

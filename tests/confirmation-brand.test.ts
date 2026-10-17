import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';import {confirmationPDF} from '../lib/legal/confirmation.ts';import {confirmationEmail} from '../lib/legal/confirmation-email.ts';
test('manual confirmation email keeps brand, safe reference, test distinction and no false receipt',()=>{
 const sample=confirmationEmail({reference:'<script>&"',rehearsal:true});assert.match(sample.subject,/TEST/);assert.match(sample.html,/#b2f34c/);assert.match(sample.html,/&lt;script&gt;&amp;&quot;/);assert.doesNotMatch(sample.html,/<script>/);assert.match(sample.text,/No payment, contract, consent/);
 const live=confirmationEmail({reference:'purchase-reference'});assert.match(live.text,/Payment confirmation and report readiness are separate/);assert.doesNotMatch(live.text,/report is ready|payment received|rights are waived/);assert.throws(()=>confirmationEmail({reference:''}));
});
test('branded confirmation PDF paginates long frozen text and retains document metadata',async()=>{
 const text=('Frozen approved text — statutory rights retained. ').repeat(400);
 const bytes=await confirmationPDF({version:'synthetic-only',acceptedAt:'2026-10-16',consent:{buyerKind:'consumer',termsAccepted:true,immediateRequested:true,acknowledgement:true},policy:{termsText:text,privacyText:'Synthetic privacy information only.',retentionText:'Synthetic retention information only.'}});
 const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>4);assert.equal(pdf.getTitle(),'SiteFit — contract confirmation');assert.equal(pdf.getAuthor(),'SiteFit');for(const page of pdf.getPages())assert.equal(page.getWidth(),595.28);
});
test('actual rendered progress has accessible percentages and no invented page-retrieval percentage',()=>{
 const r=spawnSync(process.execPath,['tests/fixtures/render-progress.mjs'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const html=r.stdout;
 assert.match(html,/sitefit-wordmark\.svg/);assert.match(html,/aria-valuenow="60"/);assert.match(html,/aria-valuenow="100"/);assert.match(html,/3 of 5 steps confirmed, 60 percent, updates paused/);assert.doesNotMatch(html,/\[object Object\]|undefined|NaN/);
 const opening=html.slice(html.lastIndexOf('class="page-wrap'));assert.match(opening,/role="progressbar"/);assert.doesNotMatch(opening,/aria-valuenow|gp-value/);
});

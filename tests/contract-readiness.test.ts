import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {PDFDocument,PDFPage} from 'pdf-lib';
import {confirmationPDF} from '../lib/legal/confirmation.ts';
import {consentLabels,policyVersions,termsSections,privacySections,retentionSections,launchPolicySnapshot,policyText,formationRule,deliveryCommitment} from '../lib/legal/policy-text.ts';
import {salePolicy,requireApprovedSale,validateSaleConsent} from '../lib/legal/sale.ts';
import {seller} from '../lib/legal/seller.ts';
import {publicSeller,legalPublication} from '../lib/legal/publication.ts';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]!));
test('public legal and purchase output withholds address and unapproved wording while private snapshots stay complete',()=>{
 const run=spawnSync(process.execPath,['tests/fixtures/render-sale.mjs','policies'],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
 const pages=JSON.parse(run.stdout) as {terms:string;privacy:string;contact:string};
 const snapshot=launchPolicySnapshot();
 for(const page of Object.values(pages)){
  assert.ok(page.includes('Shahin Shahmir'));assert.ok(page.includes('SiteFit'));
  assert.ok(!page.includes(escape(seller.address)));assert.doesNotMatch(page,/Dower House/);
 }
 for(const page of [pages.terms,pages.privacy]){
  assert.match(page,/Purchases are currently unavailable/);
  for(const section of [...termsSections,...privacySections,...retentionSections])assert.ok(!page.includes(escape(section.body)),section.title);
 }
 assert.equal(snapshot.termsText,policyText(termsSections));assert.equal(snapshot.privacyText,policyText(privacySections));assert.equal(snapshot.retentionText,policyText(retentionSections));
 const withheld=spawnSync(process.execPath,['tests/fixtures/render-sale.mjs'],{encoding:'utf8'});assert.equal(withheld.status,0,withheld.stderr);
 assert.match(withheld.stdout,/Purchases are currently unavailable/);assert.doesNotMatch(withheld.stdout,/Dower House|checkbox|Continue to Checkout/);
 assert.ok(!withheld.stdout.includes(escape(formationRule)));assert.ok(!withheld.stdout.includes(escape(deliveryCommitment)));
 for(const label of Object.values(snapshot.consentLabels))assert.ok(!withheld.stdout.includes(escape(label)));
 assert.equal(legalPublication.approved,false);assert.equal(legalPublication.sellerDisclosuresApproved,false);
 assert.equal(publicSeller.name,seller.name);assert.equal(publicSeller.tradingName,seller.tradingName);assert.equal(publicSeller.email,seller.email);
 assert.equal(snapshot.sellerAddress,seller.address);
 // The future gated form is preserved: supplied wording remains exact and choices initially unchecked.
 const ui=spawnSync(process.execPath,['tests/fixtures/render-sale.mjs','consent'],{encoding:'utf8'});assert.equal(ui.status,0,ui.stderr);
 for(const label of Object.values(snapshot.consentLabels))assert.ok(ui.stdout.includes(escape(label)));
 assert.ok(ui.stdout.includes(escape(formationRule)));assert.ok(ui.stdout.includes(escape(deliveryCommitment)));
 assert.match(ui.stdout,/disabled=""/);assert.doesNotMatch(ui.stdout,/checked=""|Final wording awaits|Legal entity.*awaiting/);
 assert.equal(salePolicy.version,policyVersions.sale);assert.equal(salePolicy.classification,'digital_content');assert.equal(salePolicy.approved,false);assert.throws(requireApprovedSale);
 assert.throws(()=>validateSaleConsent({version:'sitefit-sale-v1-launch-draft',buyerKind:'consumer',termsAccepted:true,immediateRequested:true,acknowledgement:true}));
});
test('PDF renders the frozen wording, never current labels for historical contracts; review PDF contains every section',async()=>{
 const policy=launchPolicySnapshot();
 const original=PDFPage.prototype.drawText,drawn:string[]=[];
 PDFPage.prototype.drawText=function(text,options){drawn.push(text);return original.call(this,text,options);};
 try{
  const record={version:policyVersions.sale,acceptedAt:'2026-10-16T00:00:00.000Z',consent:{buyerKind:'synthetic rehearsal only',termsAccepted:false,immediateRequested:false,acknowledgement:false},policy};
  const bytes=await confirmationPDF(record,{rehearsal:true});
  const content=drawn.filter(text=>text!=='PURCHASE RECORD').join(' ').replace(/\s+/g,' ');
  for(const section of [...termsSections,...privacySections,...retentionSections])assert.ok(content.includes(section.body.replace(/\s+/g,' ')),section.title);
  for(const label of Object.values(consentLabels))assert.ok(content.includes(label));
  assert.match(content,/Choices recorded/);assert.match(content,/TEST ONLY/);assert.doesNotMatch(content,/\[object Object\]|undefined/);
  assert.equal((await PDFDocument.load(bytes)).getTitle(),'SiteFit — delivery rehearsal, no contract');
  const historical={...record,version:'historical',policy:{termsText:'Original historical terms, unchanged.',privacyText:'Original historical privacy, unchanged.',retentionText:'Original historical retention, unchanged.'}};
  drawn.length=0;await confirmationPDF(historical);assert.doesNotMatch(drawn.join(' '),/Wording shown with these choices|I expressly request/);
  drawn.length=0;await confirmationPDF({...record,policy:{...policy,consentLabels:{termsAccepted:'Original stored terms acknowledgement.',immediateRequested:'Original stored immediate request.',acknowledgement:'Original stored rights acknowledgement.'}}});
  assert.match(drawn.join(' '),/Original stored immediate request/);assert.doesNotMatch(drawn.join(' '),/I expressly request/);
  await assert.rejects(()=>confirmationPDF({...record,policy:{...policy,consentLabels:{termsAccepted:45}}}),/confirmation_unavailable/);
 }finally{PDFPage.prototype.drawText=original;}
});

import test from 'node:test';import assert from 'node:assert/strict';
import {verifyRehearsal} from '../scripts/payments/verify-confirmation-rehearsal.ts';
const pdf=Buffer.from('%PDF-1.7\nSynthetic local fixture only.');
const message=`From: SiteFit <info@sitefit.co.uk>\r\nTo: <shahinst21@gmail.com>\r\nMessage-Id: <synthetic@example.invalid>\r\nContent-Type: multipart/mixed; boundary="synthetic"\r\n\r\n--synthetic\r\nSTAGE1-20261016-SYNTHETIC\r\n--synthetic\r\nContent-Type: application/pdf\r\nContent-Transfer-Encoding: base64\r\n\r\n${pdf.toString('base64')}\r\n--synthetic--`;
test('synthetic received-byte proof requires matching original PDF and complete bound MIME archive',()=>{
 const result=verifyRehearsal(pdf,pdf,message);assert.equal(result.receivedHashVerified,true);assert.equal(result.completeEmlArchived,true);assert.equal(result.confirmationRpcCalls,0);
 assert.throws(()=>verifyRehearsal(pdf,Buffer.from('%PDF-changed'),message),/mismatch/);
 assert.throws(()=>verifyRehearsal(pdf,pdf,message.replace(pdf.toString('base64'),'')),/complete_mime/);
 assert.throws(()=>verifyRehearsal(pdf,pdf,message.replace('info@sitefit.co.uk','foreign@example.invalid')),/binding/);
 assert.throws(()=>verifyRehearsal(pdf,pdf,message.replace('info@sitefit.co.uk','info@sitefit.co.uk.evil.invalid')),/binding/);
 assert.throws(()=>verifyRehearsal(pdf,pdf,message.replace('STAGE1-20261016-SYNTHETIC','different rehearsal')),/binding/);
});

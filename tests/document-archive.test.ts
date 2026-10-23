import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {archivedPDF} from '../lib/legal/document-archive.ts';
const path=`reports/00000000-0000-4000-8000-000000000001/${'a'.repeat(64)}/full-report.pdf`;
const pdf=new TextEncoder().encode('%PDF-1.7\nSynthetic only');
test('private PDF reopens the first stored bytes without rendering or overwriting',async()=>{
 const bytes=await archivedPDF(path,async()=>{throw Error('must not render');},{async download(){return {data:new Blob([pdf]),error:null};},async upload(){throw Error('must not overwrite');}});
 assert.deepEqual(bytes,pdf);
});
test('missing PDF is stored without upsert; concurrent archive returns the winning bytes',async()=>{
 let reads=0,renders=0;
 const bytes=await archivedPDF(path,async()=>{renders++;return pdf;},{async download(){reads++;return reads===1?{data:null,error:{statusCode:'404'}}:{data:new Blob([pdf]),error:null};},async upload(_path,body,options){assert.equal(_path,path);assert.deepEqual(body,pdf);assert.equal(options.upsert,false);return {data:null,error:{statusCode:'409'}};}});
 assert.deepEqual(bytes,pdf);assert.equal(reads,2);assert.equal(renders,1);
});
test('archive auth/network errors and unsafe paths fail before rendering or writing',async()=>{
 for(const error of [{statusCode:403},{statusCode:500},{statusCode:400,message:'Invalid request'},null]){
  await assert.rejects(()=>archivedPDF(path,async()=>{throw Error('must not render');},{async download(){return {data:null,error};},async upload(){throw Error('must not write');}}),/document_read_unavailable/);
 }
 await assert.rejects(()=>archivedPDF('../private.pdf',async()=>pdf),/invalid_document_path/);
 await assert.rejects(()=>archivedPDF(path,async()=>pdf,{async download(){return {data:new Blob(['not a PDF']),error:null};},async upload(){throw Error('must not write');}}),/invalid_archived_pdf/);
});
test('owner-admin contract preparation remains denied while the sale policy is unapproved',()=>{
 const result=spawnSync(process.execPath,['--conditions=react-server','scripts/payments/prepare-contract-confirmation.ts','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'],{encoding:'utf8'});
 assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/No delivery recorded or email sent/);
});

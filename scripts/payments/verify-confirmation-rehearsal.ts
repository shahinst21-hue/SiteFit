import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
/** Offline evidence verification only. Does not send mail, upload files or mark contract delivery. */
export function verifyRehearsal(original:Uint8Array,received:Uint8Array,eml:string){
 if(Buffer.from(original).subarray(0,5).toString()!=='%PDF-'||digest(original)!==digest(received))throw Error('received_attachment_mismatch');
 const headers=eml.split(/\r?\n\r?\n/,1)[0]!;
 if(!/^From:[^\r\n]*<info@sitefit\.co\.uk>[ \t]*\r?$/im.test(headers)||!/^To:[^\r\n]*<shahinst21@gmail\.com>[ \t]*\r?$/im.test(headers)||!/^Message-ID:\s*<[^\r\n<>]+>/im.test(headers)||!eml.includes('STAGE1-20261016-SYNTHETIC'))throw Error('rehearsal_message_binding_missing');
 // Gmail's displayed original can omit attachment content. It is not an original-message archive.
 if(!/Content-Type:\s*application\/pdf/i.test(eml)||!eml.replace(/\s/g,'').includes(Buffer.from(original).toString('base64')))throw Error('complete_mime_attachment_missing');
 return {synthetic:true,receivedPdfSha256:digest(received),originalPdfSha256:digest(original),receivedHashVerified:true,completeEmlSha256:digest(Buffer.from(eml)),completeEmlArchived:true,confirmationRpcCalls:0};
}
async function main(){
 const dir=path.resolve('supabase/.temp/stage1-contract-rehearsal');
 const [original,received,eml]=await Promise.all([fs.readFile(path.join(dir,'sitefit-stage1-rehearsal.pdf')),fs.readFile(path.join(dir,'received.pdf')),fs.readFile(path.join(dir,'received.eml'),'utf8')]);
 const result=verifyRehearsal(original,received,eml);
 await fs.writeFile(path.join(dir,'received-verification.json'),JSON.stringify(result,null,2),{flag:'wx'});
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('Rehearsal proof incomplete: received files missing, changed or not the full original message. No delivery recorded.');process.exitCode=1;});

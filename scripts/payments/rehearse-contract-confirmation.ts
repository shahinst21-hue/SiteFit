import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {confirmationPDF} from '../../lib/legal/confirmation.ts';
import {confirmationEmail} from '../../lib/legal/confirmation-email.ts';
import {launchPolicySnapshot,policyVersions} from '../../lib/legal/policy-text.ts';

// OFFLINE ONLY. No customer input, credentials, network, email send or delivery RPC.
const directory=path.resolve('supabase/.temp/stage1-contract-rehearsal');
await fs.mkdir(directory,{recursive:true});
const record={version:policyVersions.sale,acceptedAt:'2026-10-16T00:00:00.000Z',
 consent:{buyerKind:'synthetic rehearsal only',termsAccepted:false,immediateRequested:false,acknowledgement:false},policy:launchPolicySnapshot()};
const bytes=await confirmationPDF(record,{rehearsal:true});
// Fail rather than replacing the exact attachment whose receipt/hash may already be under review.
await fs.writeFile(path.join(directory,'sitefit-stage1-rehearsal.pdf'),bytes,{flag:'wx'});
const sha256=createHash('sha256').update(bytes).digest('hex');
const reference='STAGE1-20261016-SYNTHETIC';
const email=confirmationEmail({reference,rehearsal:true});
await fs.writeFile(path.join(directory,'email.html'),email.html);
await fs.writeFile(path.join(directory,'email.txt'),email.text+`\n\nAttachment SHA-256: ${sha256}\n`);
await fs.writeFile(path.join(directory,'frozen-record.json'),JSON.stringify(record,null,2));
await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify({reference,policyVersion:record.version,sha256,bytes:bytes.length,synthetic:true,sent:false,received:false,confirmationRecorded:false},null,2));
console.log(JSON.stringify({prepared:true,synthetic:true,path:path.join(directory,'sitefit-stage1-rehearsal.pdf'),sha256,bytes:bytes.length,sent:false,confirmationRecorded:false}));

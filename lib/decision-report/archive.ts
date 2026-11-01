import 'server-only';
import {createHash} from 'node:crypto';
import {packetDigest} from '../analysis/canonical.ts';
import {frameworkClient} from '../data/server-client.ts';
import {documentBucket} from '../legal/document-archive.ts';
import {thawDecision,type FrozenDecision} from './frozen.ts';
import type {GeographyBucket} from './geography.ts';
export type ArchivedDecision={version:'archived-decision-v1';parentDigest:string;digest:string;path:string;artifactDigest:string;business:string;address:string;date:string;catchmentsDigest:string;baselineInputDigest:string};
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const bucket=()=>frameworkClient().storage.from(documentBucket) as GeographyBucket;
export function validateDecisionArchive(value:unknown,parentDigest:string){
 const v=value as ArchivedDecision;
 if(!v||v.version!=='archived-decision-v1'||v.parentDigest!==parentDigest||![v.digest,v.artifactDigest,v.catchmentsDigest,v.baselineInputDigest].every(s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s))||
  !/^reports\/[a-f0-9-]{36}\/[a-f0-9]{64}\/decision-report\.json$/.test(v.path)||v.path.split('/')[2]!==v.digest||typeof v.address!=='string'||v.address.length>1000||!Number.isFinite(Date.parse(v.date)))throw Error('invalid_decision_archive');
 return v;
}
/** Append a frozen, validated analytical document using existing private Storage.
 * This avoids raising the existing 128 KiB customer-projection limit. */
export async function archiveFrozenDecision(reportId:string,frozen:FrozenDecision,store:GeographyBucket=bucket()):Promise<ArchivedDecision>{
 if(!/^[a-f0-9-]{36}$/.test(reportId))throw Error('invalid_archive_report');
 const report=thawDecision(frozen,frozen.parentDigest),bytes=Buffer.from(JSON.stringify(frozen)),path=`reports/${reportId}/${report.digest}/decision-report.json`;
 const prior=await store.download(path);
 if(prior.data){if(sha(new Uint8Array(await prior.data.arrayBuffer()))!==sha(bytes))throw Error('decision_archive_conflict');}
 else{
  const e=prior.error as {statusCode?:number|string;message?:string};
  if(!(Number(e?.statusCode)===404||Number(e?.statusCode)===400&&e?.message==='Object not found'))throw Error('decision_archive_read_unavailable');
  const written=await store.upload(path,bytes,{contentType:'application/json',upsert:false});if(written.error)throw Error('decision_archive_write_unavailable');
 }
 return {version:'archived-decision-v1',parentDigest:report.parentDigest,digest:report.digest,path,artifactDigest:sha(bytes),business:report.business,address:report.address,date:report.date,catchmentsDigest:report.catchmentsArtifact?.digest??packetDigest(report.catchments),baselineInputDigest:packetDigest(report.scenarios.find(s=>s.id==='base')?.input)};
}
export async function loadFrozenDecision(value:unknown,parentDigest:string,store?:GeographyBucket){
 if((value as {version?:string})?.version!=='archived-decision-v1')return thawDecision(value,parentDigest);
 const ref=validateDecisionArchive(value,parentDigest),result=await(store??bucket()).download(ref.path);
 if(!result.data||result.data.size>120000)throw Error('decision_archive_unavailable');
 const bytes=new Uint8Array(await result.data.arrayBuffer());if(sha(bytes)!==ref.artifactDigest)throw Error('decision_archive_integrity');
 const report=thawDecision(JSON.parse(Buffer.from(bytes).toString()),parentDigest);
 if(report.digest!==ref.digest||report.address!==ref.address||report.date!==ref.date||report.business!==ref.business||
  (report.catchmentsArtifact?.digest??packetDigest(report.catchments))!==ref.catchmentsDigest||packetDigest(report.scenarios.find(s=>s.id==='base')?.input)!==ref.baselineInputDigest)throw Error('decision_archive_binding');
 return report;
}

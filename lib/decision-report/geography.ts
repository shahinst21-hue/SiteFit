import 'server-only';
import {createHash} from 'node:crypto';
import {packetDigest} from '../analysis/canonical.ts';
import {frameworkClient} from '../data/server-client.ts';
import {documentBucket} from '../legal/document-archive.ts';
import {geoapifyWalkingMatrix,type WalkingMatrix} from '../data/adapters/geoapify.ts';
import {validPoint,type Point} from '../spatial/model.ts';
import type {Competitor,DecisionReport,MapEvidence} from './types.ts';
import type {SnapshotMap} from '../snapshot/model.ts';

type Result={data:Blob|null;error:unknown};
export type GeographyBucket={download:(path:string)=>Promise<Result>;upload:(path:string,data:Uint8Array,options:{contentType:string;upsert:false})=>Promise<{error:unknown}>};
export type DecisionGeography={version:'decision-geography-v1';map:MapEvidence;artifact:{path:string;digest:string};routes:WalkingMatrix|null;candidateIds:string[]};
type Stored={version:'decision-geography-v1';map:MapEvidence;png:string;routes:WalkingMatrix|null;candidateIds:string[]};
const sha=(v:Uint8Array)=>createHash('sha256').update(v).digest('hex');
const bucket=()=>frameworkClient().storage.from(documentBucket) as GeographyBucket;
const missing=(error:unknown)=>{const e=error as {statusCode?:string|number;message?:string};return e&&(Number(e.statusCode)===404||Number(e.statusCode)===400&&e.message==='Object not found');};
async function saved(store:GeographyBucket,path:string){
  const r=await store.download(path);if(r.data){if(r.data.size>3000000)throw Error('geography_storage_bounds');return new Uint8Array(await r.data.arrayBuffer());}
  if(!missing(r.error))throw Error('geography_read_unavailable');return null;
}
const encode=(value:unknown)=>Buffer.from(JSON.stringify(value));
export async function archiveDecisionCatchments(freeReportId:string,map:SnapshotMap|null,store:GeographyBucket=bucket()){
  const digest=packetDigest(map),path=`reports/${freeReportId}/${digest}/decision-catchments.json`;
  const prior=await saved(store,path);
  if(prior){if(packetDigest(JSON.parse(Buffer.from(prior).toString()))!==digest)throw Error('catchments_archive_integrity');}
  else{const result=await store.upload(path,encode(map),{contentType:'application/json',upsert:false});if(result.error)throw Error('catchments_archive_unavailable');}
  return {path,digest};
}
export async function readDecisionCatchments(artifact:{path:string;digest:string},store:GeographyBucket=bucket()):Promise<SnapshotMap|null>{
  if(!/^reports\/[a-f0-9-]{36}\/[a-f0-9]{64}\/decision-catchments\.json$/.test(artifact.path))throw Error('catchments_archive_path_invalid');
  const bytes=await saved(store,artifact.path);if(!bytes)throw Error('catchments_archive_unavailable');
  const map=JSON.parse(Buffer.from(bytes).toString());if(packetDigest(map)!==artifact.digest)throw Error('catchments_archive_integrity');return map;
}
/** Development proof only. One immutable intent per source BEFORE dispatch.
 * Lost responses, HTTP errors and expired acknowledgements never authorise retry.
 * Reuses the existing private document bucket and walking adapter. */
export async function acquireDecisionGeography(args:{freeReportId:string;contextDigest:string;origin:Point;candidates:Competitor[];key:string|undefined;store?:GeographyBucket;fetcher?:typeof fetch;now?:()=>Date}){
  if(process.env.VERCEL_ENV==='production')throw Error('decision_geography_not_released');
  if(!/^[a-f0-9-]{36}$/.test(args.freeReportId)||!/^[a-f0-9]{64}$/.test(args.contextDigest)||!validPoint(args.origin)||['unknown','postcode_centroid'].includes(args.origin.precision))throw Error('geography_origin_unqualified');
  if(!args.key||/\s/.test(args.key))throw Error('geography_configuration_missing');
  const candidates=args.candidates.slice(0,8),candidateIds=candidates.map(c=>c.id);
  const binding=packetDigest({version:'decision-geography-v1',context:args.contextDigest,origin:args.origin,candidates:candidates.map(c=>({id:c.id,point:c.point}))});
  const root=`reports/${args.freeReportId}/${binding}`,store=args.store??bucket(),fetcher=args.fetcher??fetch,now=args.now??(()=>new Date());
  const dispatch=async(name:string,run:()=>Promise<unknown>)=>{
    const resultPath=`${root}/${name}.json`,prior=await saved(store,resultPath);
    if(prior)return JSON.parse(Buffer.from(prior).toString());
    const intent=await store.upload(`${root}/${name}-intent.json`,encode({version:'decision-geography-intent-v1',binding,source:name,reservedAt:now().toISOString(),expectedCredits:name==='street-map'?4:candidates.length}),{contentType:'application/json',upsert:false});
    if(intent.error)throw Error('geography_dispatch_requires_reconciliation');
    const result=await run(),bytes=encode(result);
    const written=await store.upload(resultPath,bytes,{contentType:'application/json',upsert:false});
    if(written.error)throw Error('geography_persistence_requires_reconciliation');
    return result;
  };
  const image=await dispatch('street-map',async()=>{
    const url=new URL('https://maps.geoapify.com/v1/staticmap');
    for(const [key,value] of Object.entries({style:'osm-bright-grey',width:'1000',height:'720',center:`lonlat:${args.origin.longitude},${args.origin.latitude}`,zoom:'14',format:'png',apiKey:args.key!}))url.searchParams.set(key,value);
    const response=await fetcher(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok||!response.headers.get('content-type')?.startsWith('image/png'))throw Error('geography_map_unavailable');
    const reader=response.body?.getReader();if(!reader)throw Error('geography_map_unavailable');
    const chunks:Uint8Array[]=[];let size=0;
    try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2000000)throw Error('geography_map_bounds');chunks.push(part.value);}}finally{await reader.cancel();}
    const bytes=Buffer.concat(chunks);
    if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==1000||bytes.readUInt32BE(20)!==720)throw Error('geography_map_invalid');
    const map:MapEvidence={center:[args.origin.longitude,args.origin.latitude],zoom:14,tileSize:512,width:1000,height:720,asset:'automatic-basemap-v1.png',sha256:sha(bytes),attribution:'© OpenStreetMap contributors · © OpenMapTiles · Powered by Geoapify',observedAt:now().toISOString()};
    return {map,png:bytes.toString('base64')};
  }) as {map:MapEvidence;png:string};
  const routes=candidates.length?await dispatch('walking-routes',()=>geoapifyWalkingMatrix({key:args.key,fetcher,now})(args.origin,candidates.map((c,i)=>({id:`target-${i+1}`,point:{longitude:c.point[0],latitude:c.point[1],crs:'EPSG:4326',precision:'unknown',source:'saved-business-source-point'}})))) as WalkingMatrix:null;
  const content:Stored={version:'decision-geography-v1',...image,routes,candidateIds},bytes=encode(content),path=`${root}/decision-geography.json`;
  const previous=await saved(store,path);
  if(previous&&sha(previous)!==sha(bytes))throw Error('geography_immutable_conflict');
  if(!previous){const written=await store.upload(path,bytes,{contentType:'application/json',upsert:false});if(written.error)throw Error('geography_archive_unavailable');}
  return {version:'decision-geography-v1',map:content.map,routes,candidateIds,artifact:{path,digest:sha(bytes)}} satisfies DecisionGeography;
}
/** Owned read only. Never calls Geoapify, routing, AI or a calculator. */
export async function hydrateDecisionGeography(report:DecisionReport,store:GeographyBucket=bucket()){
  if(report.catchmentsArtifact)report.catchments=await readDecisionCatchments(report.catchmentsArtifact,store);
  const artifact=report.geographyArtifact;if(!artifact)return report;
  if(!/^reports\/[a-f0-9-]{36}\/[a-f0-9]{64}\/decision-geography\.json$/.test(artifact.path))throw Error('geography_archive_path_invalid');
  const bytes=await saved(store,artifact.path);if(!bytes||sha(bytes)!==artifact.digest)throw Error('geography_archive_integrity');
  const content=JSON.parse(Buffer.from(bytes).toString()) as Stored;
  const png=Buffer.from(content.png,'base64');
  if(content.version!=='decision-geography-v1'||packetDigest(content.map)!==packetDigest(report.map)||sha(png)!==report.map?.sha256)throw Error('geography_map_integrity');
  report.mapImage=`data:image/png;base64,${content.png}`;return report;
}

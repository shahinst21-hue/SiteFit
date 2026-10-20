import {readResidential} from '../lib/snapshot/read-residential.ts';
import type {FreeProjection} from '../lib/analysis/projection.ts';
import {mapViewport} from "../lib/report-dashboard/geography.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import {context,result} from './fixtures/data/framework.ts';
import {policy} from '../lib/data/policy.ts';
import {storedSnapshotContext} from '../lib/snapshot/context.ts';
import {admittedTile,snapshotTilePath} from '../lib/snapshot/tiles.ts';
import {geoapifyTile} from '../lib/snapshot/tile-fetch.ts';
import {readSnapshotContext} from '../lib/snapshot/read-context.ts';
import {savedSnapshotReview} from '../lib/snapshot/review.ts';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '../lib/supabase/database.types.ts';
function row(){const c=context(),r=result();r.meta.licence=policy('tfl-stop-points');if(r.payload?.kind==='transport_access_points')r.payload.items[0].point={longitude:-.101,latitude:51.501,crs:'EPSG:4326',precision:'unknown',source:'tfl-stop-point'};return {analysis_id:c.analysisId,input_id:c.inputId,source:r.meta.source,expires_at:null,provider_metadata:{...r,payload:undefined},normalised_data:r.payload};}
test('stored context restores postcode geography and named source points without inventing exact premises, routes or catchments',()=>{
 const c=context(),r=row(),before=JSON.stringify([c,r]),view=storedSnapshotContext(c,[r]);
 assert.match(view.precision,/Postcode context/);assert.equal(view.map.status,'available');assert.equal(view.map.layers[0].id,'context-origin');assert.equal(view.map.layers[1].features?.[0].label,'Synthetic stop');assert.deepEqual(view.stopGroups,[{label:'bus',count:1}]);assert.equal(view.foodTotal,null);assert.ok(view.map.layers.every(l=>l.polygons.length===0&&l.kind!=='catchment'));assert.equal(JSON.stringify([c,r]),before);
});
test('wrong input, duplicates, revoked licence, corrupted checksum, expired or invalid rows cannot supply map records',()=>{
 for(const change of [r=>({...r,input_id:'foreign'}),r=>({...r,expires_at:'2020-01-01T00:00:00Z'}),r=>({...r,normalised_data:{kind:'fabricated'}}),r=>({...r,provider_metadata:{...r.provider_metadata,meta:{...r.provider_metadata.meta,checksum:'a'.repeat(64)}}}),r=>({...r,provider_metadata:{...r.provider_metadata,meta:{...r.provider_metadata.meta,licence:{...r.provider_metadata.meta.licence,normalised:{allowed:false,maxDays:0,condition:'denied'}}}}})] as ((r:ReturnType<typeof row>)=>unknown)[]){const view=storedSnapshotContext(context(),[change(row())]);assert.equal(view.map.layers.length,1);assert.equal(view.stopGroups.length,0);}
 assert.equal(storedSnapshotContext(context(),[row(),row()]).map.layers.length,1);
});
test('tile proxy admits only integer geographic tiles inside owned saved context, never arbitrary URLs',()=>{
 const map=storedSnapshotContext(context(),[row()]).map;
 const z=15,n=2**z,x=Math.floor((-.1+180)/360*n),y=Math.floor((1-Math.asinh(Math.tan(51.5*Math.PI/180))/Math.PI)/2*n);
 assert.ok(admittedTile(map,z,x,y));for(const p of [[19,x,y],[15,0,0],[15,-1,y],[15,x+.5,y],[0,0,0]])assert.equal(admittedTile(map,...p as [number,number,number]),false);
 assert.equal(snapshotTilePath('report',`https://tile.openstreetmap.org/${z}/${x}/${y}.png`),`/snapshots/report/tiles/${z}/${x}/${y}`);assert.equal(snapshotTilePath('x','https://evil.invalid/secret'),'');
});
test('tile fetch coalesces concurrent requests and does not retry failed provider responses',async()=>{
 let calls=0;const mock:typeof fetch=async(url,init)=>{calls++;assert.equal(new URL(String(url)).hostname,'maps.geoapify.com');assert.equal(init?.redirect,'error');return new Response(new Uint8Array([137,80,78,71,13,10,26,10]),{headers:{'content-type':'image/png'}});};
 const values=await Promise.all([geoapifyTile('synthetic-key',14,8190,5440,mock),geoapifyTile('synthetic-key',14,8190,5440,mock)]);assert.equal(calls,1);assert.equal(values[0]?.byteLength,8);
 const fail:typeof fetch=async()=>{calls++;return new Response('denied',{status:403});};assert.equal(await geoapifyTile('synthetic-key',14,8191,5440,fail),null);assert.equal(await geoapifyTile('synthetic-key',14,8191,5440,fail),null);assert.equal(calls,2);
});
test('foreign/anonymous read denial precedes any privileged context lookup; review never exists in Production',async()=>{
 const denied={rpc:async()=>({data:null,error:{message:'unavailable'}})} as unknown as SupabaseClient<Database>;
 assert.equal(await readSnapshotContext(denied,'foreign'),null);
 for(const env of [{VERCEL_ENV:'production',NODE_ENV:'production',SITEFIT_SNAPSHOT_REVIEW_ACCESS:'vercel-authenticated',SITEFIT_SNAPSHOT_REVIEW:'fake'},{VERCEL_ENV:'preview',SITEFIT_SNAPSHOT_REVIEW:'fake'}])assert.equal(savedSnapshotReview(env as NodeJS.ProcessEnv),null);
});

test("responsive viewport edge tiles remain admitted while distant tiles remain forbidden",()=>{
 const map=storedSnapshotContext(context(),[]).map;
 map.bounds=[-.11109794,51.40421,-.09301,51.41621];
 for(const width of [280,390,855,1280])for(const pan of [-.5,0,.5])for(const zoom of [0,1,2,3]){
  const b=map.bounds,dx=b[2]-b[0],dy=b[3]-b[1],cx=(b[0]+b[2])/2+pan*dx,cy=(b[1]+b[3])/2;
  const view=mapViewport([cx-dx/2**(zoom+1),cy-dy/2**(zoom+1),cx+dx/2**(zoom+1),cy+dy/2**(zoom+1)],width,320);
  for(const tile of view.tiles){const match=tile.url.match(/(\d+)\/(\d+)\/(\d+)\.png$/)!;assert.ok(admittedTile(map,Number(match[1]),Number(match[2]),Number(match[3])),width+"/"+pan+"/"+zoom+"/"+tile.url);}
 }
 assert.equal(admittedTile(map,14,0,0),false);
});

test('population recovery rejects unowned reports before any privileged read or external execution',async()=>{
 let calls=0;const denied={rpc:()=>({abortSignal:async()=>{calls++;return {data:null,error:{message:'denied'}};}})} as unknown as SupabaseClient<Database>;
 const projection={schemaVersion:3,analysisId:context().analysisId,residentialCatchment:null} as FreeProjection;
 assert.equal(await readResidential(denied,'foreign',projection),projection);assert.equal(calls,1);
});

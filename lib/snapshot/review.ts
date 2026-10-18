import 'server-only';
import {gunzipSync,brotliDecompressSync} from 'node:zlib';
import {validateFreeProjection} from '../analysis/projection.ts';
import {validateSnapshotAdvice,validateAdvisorResearch} from '../analysis/advisor.ts';
import {storedSnapshotContext} from './context.ts';
/** Private, branch-scoped presentation review. No Production credentials or writes.
 * Configure only on a Vercel-authenticated Preview; never shipped as a fixture. */
export function savedSnapshotReview(env:NodeJS.ProcessEnv){
 if(env.VERCEL_ENV!=='preview'&&env.NODE_ENV!=='development'||env.SITEFIT_SNAPSHOT_REVIEW_ACCESS!=='vercel-authenticated')return null;
 const encoded=env.SITEFIT_SNAPSHOT_REVIEW;
 if(!encoded||encoded.length>40000)return null;
 try{
  const decoded=encoded.startsWith('br:')?brotliDecompressSync(Buffer.from(encoded.slice(3),'base64'),{maxOutputLength:200000}):gunzipSync(Buffer.from(encoded,'base64'),{maxOutputLength:200000});
  const saved=JSON.parse(decoded.toString('utf8'));
  const report=validateFreeProjection(saved.report);
  if(saved.advice)report.earlyView.advisor=validateSnapshotAdvice(saved.advice);
  const context=storedSnapshotContext(saved.context,saved.sources);
  if(context.map.status!=='available')return null;
  return {report,context,research:validateAdvisorResearch(saved.research??[])};
 }catch{return null;}
}

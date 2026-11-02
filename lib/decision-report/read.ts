import 'server-only';
import {readDashboard} from '../report-dashboard/read.ts';
import {decisionFromDashboard} from './compile.ts';
import {loadFrozenDecision} from './archive.ts';
import {hydrateDecisionGeography} from './geography.ts';
export async function readDecisionReport(id:string){
  // Same verified permanent session, RLS/paid ownership and representation rights as V1.
  const result=await readDashboard(id);
  if(!result?.dashboard||result.dashboard.structuredPreview)return null;
  try{
    const frozen='frozenDecision' in result?result.frozenDecision:null;
    if(frozen){const report=await loadFrozenDecision(frozen.edition,frozen.parentDigest);report.reportId=id;return {report:await hydrateDecisionGeography(report),archiveDocuments:true};}
    const reviewed=await decisionFromDashboard(result.dashboard);
    if(!reviewed.researchDigest)return null; // Historical reports need an explicit reviewed edition; never attach generic Ruislip economics.
    return {report:reviewed,archiveDocuments:result.archiveDocuments===true};}
  catch{return null;}
}

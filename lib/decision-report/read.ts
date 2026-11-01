import 'server-only';
import {readDashboard} from '../report-dashboard/read.ts';
import {decisionFromDashboard} from './compile.ts';
import {verifiedUser} from '../supabase/server.ts';
import {fullRepository} from '../report-intelligence/repository.ts';
import {loadFrozenDecision} from './archive.ts';
import {packetDigest} from '../analysis/canonical.ts';
import {hydrateDecisionGeography} from './geography.ts';
export async function readDecisionReport(id:string){
  // Same verified permanent session, RLS/paid ownership and representation rights as V1.
  const result=await readDashboard(id);
  if(!result?.dashboard||result.dashboard.structuredPreview)return null;
  try{
    // The existing paid dashboard and its read contract stay unchanged. The
    // separate edition reads its frozen extension only after that owned read.
    const {user}=await verifiedUser();if(!user)return null;
    const edition=await fullRepository(user.id).read(id);
    const {decisionEdition,contentDigest:_,...parent}=edition.projection as Record<string,unknown>;void _;
    if(decisionEdition){const report=await loadFrozenDecision(decisionEdition,packetDigest(parent));report.reportId=id;return {report:await hydrateDecisionGeography(report),archiveDocuments:result.archiveDocuments===true};}
    return {report:await decisionFromDashboard(result.dashboard),archiveDocuments:result.archiveDocuments===true};}
  catch{return null;}
}

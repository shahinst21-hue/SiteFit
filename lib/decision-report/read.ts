import 'server-only';
import {readDashboard} from '../report-dashboard/read.ts';
import {decisionFromDashboard} from './compile.ts';
export async function readDecisionReport(id:string){
  // Same verified permanent session, RLS/paid ownership and representation rights as V1.
  const result=await readDashboard(id);
  if(!result?.dashboard||result.dashboard.structuredPreview)return null;
  try{return {report:await decisionFromDashboard(result.dashboard),archiveDocuments:result.archiveDocuments===true};}
  catch{return null;}
}

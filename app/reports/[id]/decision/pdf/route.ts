import {readDecisionReport} from '@/lib/decision-report/read';
import {renderDecisionPDF,decisionPdfVersion} from '@/lib/decision-report/pdf';
import {packetDigest} from '@/lib/analysis/canonical';
import {archivedPDF} from '@/lib/legal/document-archive';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const result=await readDecisionReport(id);if(!result)return new Response('Report unavailable',{status:404,headers});
  try{
    const render=()=>renderDecisionPDF(result.report);
    const digest=packetDigest({report:result.report.digest,renderer:decisionPdfVersion});
    // Distinct digest appends a new artifact. Existing V1 files and projections are untouched.
    const bytes=result.archiveDocuments?await archivedPDF(`reports/${id}/${digest}/full-report.pdf`,render):await render();
    return new Response(new Uint8Array(bytes),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="sitefit-decision-report.pdf"'}});
  }catch{return new Response('Export unavailable. Your saved editions are unchanged.',{status:422,headers});}
}

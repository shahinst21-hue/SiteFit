import {readDashboard} from '@/lib/report-dashboard/read';
import {renderReportPDF,reportPdfVersion} from '@/lib/report-dashboard/pdf';
import {packetDigest} from '@/lib/analysis/canonical';
import {reportPages} from '@/lib/report-dashboard/model';
import type {SectionKey} from '@/lib/report-intelligence/catalog';
import {canExportDashboard} from '@/lib/report-dashboard/structured-preview';
import {archivedPDF} from '@/lib/legal/document-archive';
import {loadFrozenDecision} from '@/lib/decision-report/archive';
import {hydrateDecisionGeography} from '@/lib/decision-report/geography';
import {renderDecisionPDF,decisionPdfVersion} from '@/lib/decision-report/pdf';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params,section=new URL(request.url).searchParams.get('section');
  if(section&&!reportPages.some(p=>p.key===section))return new Response('Invalid section',{status:400,headers:privateHeaders});
  const result=await readDashboard(id);if(!result)return new Response('Report unavailable',{status:404,headers:privateHeaders});
  if(!result.dashboard)return new Response('Report not Ready',{status:409,headers:privateHeaders});
  if(!canExportDashboard(result.dashboard,section))return new Response('Full Report not Ready; only qualified rental evidence is available in owner Preview.',{status:409,headers:privateHeaders});
  try{
    // Whole-report exports prefer only a saved edition. Historical reports and
    // current-page exports keep their existing renderer/cache paths unchanged.
    const frozen='frozenDecision' in result?result.frozenDecision:null;
    if(!section&&frozen){
      const report=await loadFrozenDecision(frozen.edition,frozen.parentDigest);report.reportId=id;
      const digest=packetDigest({report:report.digest,renderer:decisionPdfVersion});
      const bytes=await archivedPDF(`reports/${id}/${digest}/full-report.pdf`,async()=>renderDecisionPDF(await hydrateDecisionGeography(report)));
      return new Response(new Uint8Array(bytes),{headers:{...privateHeaders,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="sitefit-full-report.pdf"'}});
    }
    const render=()=>renderReportPDF(result.dashboard!,section as SectionKey|undefined||undefined);
    // New render formats append a distinct immutable artifact. Never overwrite
    // earlier customer downloads or alter the stored Ready report itself.
    const artifactDigest=packetDigest({reportDigest:result.dashboard.digest,renderVersion:reportPdfVersion});
    const bytes=result.archiveDocuments?await archivedPDF(`reports/${id}/${artifactDigest}/${section??'full-report'}.pdf`,render):await render();
    return new Response(new Uint8Array(bytes),{headers:{...privateHeaders,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="sitefit-${section??'full-report'}.pdf"`}});}
  catch{return new Response('Export unavailable for this edition. Your saved report is unchanged.',{status:422,headers:privateHeaders});}
}

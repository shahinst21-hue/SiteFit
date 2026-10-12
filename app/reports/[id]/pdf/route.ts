import {readDashboard} from '@/lib/report-dashboard/read';
import {renderReportPDF} from '@/lib/report-dashboard/pdf';
import {reportPages} from '@/lib/report-dashboard/model';
import type {SectionKey} from '@/lib/report-intelligence/catalog';
import {canExportDashboard} from '@/lib/report-dashboard/structured-preview';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params,section=new URL(request.url).searchParams.get('section');
  if(section&&!reportPages.some(p=>p.key===section))return new Response('Invalid section',{status:400,headers:privateHeaders});
  const result=await readDashboard(id);if(!result)return new Response('Report unavailable',{status:404,headers:privateHeaders});
  if(!result.dashboard)return new Response('Report not Ready',{status:409,headers:privateHeaders});
  if(!canExportDashboard(result.dashboard,section))return new Response('Full Report not Ready; only qualified rental evidence is available in owner Preview.',{status:409,headers:privateHeaders});
  try{const bytes=await renderReportPDF(result.dashboard,section as SectionKey|undefined||undefined);return new Response(new Uint8Array(bytes),{headers:{...privateHeaders,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="sitefit-${section??'full-report'}.pdf"`}});}
  catch{return new Response('Export unavailable for this edition. Your saved report is unchanged.',{status:422,headers:privateHeaders});}
}

import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {readDashboard} from '@/lib/report-dashboard/read';
import {reportPages} from '@/lib/report-dashboard/model';
import {ReportDashboard} from '@/components/report-dashboard/dashboard';
import type {SectionKey} from '@/lib/report-intelligence/catalog';
import '../../report-dashboard.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Your Full Report',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Report({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{section?:string}>}){
  const {id}=await params,result=await readDashboard(id);if(!result)notFound();
  if(!result.dashboard)return <div className="rd-shell"><span className="rd-kicker">REPORT STATUS</span><h1>Your report is not ready to open.</h1><p>Saved stage: {result.status.stage.replaceAll('-',' ')}.</p><p>Completed steps: {result.status.completed.join(', ')||'none'}. Closing this page does not remove saved progress.</p><p>Checking status does not restart preparation or take another payment.</p><a className="rd-button" href={`/reports/${id}`}>Check progress</a><a className="rd-button" href="/account">Return to your account</a></div>;
  const {section}=await searchParams,initial=reportPages.some(p=>p.key===section)?section as SectionKey:result.dashboard.structuredPreview?'rental-context':'overview';
  return <ReportDashboard report={result.dashboard} initial={initial}/>;
}

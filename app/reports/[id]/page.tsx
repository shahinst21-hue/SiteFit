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
  if(!result.dashboard)return <div className="rd-shell"><span className="rd-kicker">SAVED REPORT STATUS</span><h1>Your report has not reached Ready.</h1><p>Current stored stage: {result.status.stage.replaceAll('-',' ')}.</p><p>Accepted stages: {result.status.completed.join(', ')||'none'}. Closing this page does not remove saved progress.</p><p>Refreshing reads stored status only. No automatic AI retry or new charge is initiated.</p><a className="rd-button" href={`/reports/${id}`}>Check stored progress</a><a className="rd-button" href="/account">Return to your account</a></div>;
  const {section}=await searchParams,initial=reportPages.some(p=>p.key===section)?section as SectionKey:'overview';
  return <ReportDashboard report={result.dashboard} initial={initial}/>;
}

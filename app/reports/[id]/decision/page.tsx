import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {readDecisionReport} from '@/lib/decision-report/read';
import {DecisionReportView} from '@/components/decision-report/report';
import '../../../decision-report.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Your decision report',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function DecisionPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const result=await readDecisionReport(id);if(!result)notFound();
  const {geographyArtifact:internalMap,catchmentsArtifact:internalContours,...report}=result.report;
  void internalMap;void internalContours;
  return <DecisionReportView report={report}/>;
}

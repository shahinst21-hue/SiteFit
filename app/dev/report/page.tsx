import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {dashboardEnabled} from '@/lib/report-dashboard/gate';
import {ReportDashboard} from '@/components/report-dashboard/dashboard';
import {reportPages,type Dashboard} from '@/lib/report-dashboard/model';
import type {SectionKey} from '@/lib/report-intelligence/catalog';
import coffee from '@/tests/fixtures/dashboard/coffee-shop.json';
import restaurant from '@/tests/fixtures/dashboard/restaurant.json';
import salon from '@/tests/fixtures/dashboard/hair-salon.json';
import rentalProof from '@/tests/fixtures/dashboard/rental-source-proof.json';
import {RentalEvidence} from '@/components/report-dashboard/rent';
import '../../report-dashboard.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Dashboard development review',robots:{index:false,follow:false}};
export default async function DevelopmentReport({searchParams}:{searchParams:Promise<{concept?:string;section?:string;data?:string;rentalProof?:string}>}){
  const host=(await headers()).get('host')?.split(':')[0]??'';
  if(process.env.NODE_ENV!=='development'&&!dashboardEnabled(process.env,host))notFound();
  const params=await searchParams;
  if(params.rentalProof==='1')return <main id="main-content" className="dw-workspace" style={{display:'block',minHeight:'auto'}}><div className="dw-content">
    <p className="eyebrow">Development source verification · not a Ready report</p>
    <div className="dw-heading"><h1>Retained rental evidence</h1></div><p>{rentalProof.property}</p>
    <p>This demonstrates the repaired rental preparation bridge using the stored PropertyData observation. Original frozen reports and their conclusions remain unchanged.</p>
    <RentalEvidence report={{rental:rentalProof.rental,references:rentalProof.references} as unknown as Dashboard}/>
    <p>No AI or provider request runs on this page. These dated figures are market context, not an offer for the selected unit.</p>
    <a href="/dev/report?section=rental-context">Back to the frozen report</a>
  </div></main>;
  const selected=params.concept==='restaurant'?restaurant:params.concept==='salon'?salon:coffee;
  const report=structuredClone(selected) as unknown as Dashboard;
  if(params.data==='worst'){
    report.address='طراحی آزمایشی — A very long address for stress testing only, Unit 12345, The Extremely Long Named Commercial Building with an adjoining frontage, London · 非ラテン文字';
    report.editionLabel='Synthetic presentation stress fixture — not real measurements';
    report.operators?.items.forEach((o,i)=>{if(i===0)o.name='ExtremelyLongUnbrokenOperatorNameForOverflowTesting'.repeat(4);});
    if(report.sources[0])report.sources[0].value=1234567890;
  }
  if(params.data==='empty'){report.sources=[];report.references=[];report.operators=null;report.profiles=[];report.rental=[];report.timeline=[];report.map=null;report.transport=[];report.scenarios=null;report.summary=null;report.index.value=null;report.actions=[];report.pages.forEach(p=>{p.conclusion='No supported conclusion in this empty stress fixture.';p.analysis=[];p.test=null;p.factIds=[];p.cautions=[];});}
  const initial=reportPages.some(p=>p.key===params.section)?params.section as SectionKey:'overview';
  return <><div className="page-wrap" style={{paddingTop:16,paddingBottom:0}}><p><b>Development review:</b> frozen real-source editorial drafts, not hosted Ready reports or purchased reports. Stress states are synthetic.</p><nav aria-label="Development report fixture"><a href="/dev/report?concept=coffee">Coffee shop</a> · <a href="/dev/report?concept=restaurant">Restaurant</a> · <a href="/dev/report?concept=salon">Salon</a> · <a href="/dev/report?data=worst">Worst case</a> · <a href="/dev/report?data=empty">Empty</a></nav></div><ReportDashboard report={report} initial={initial}/></>;
}

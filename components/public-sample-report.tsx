'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ReportDashboard} from './report-dashboard/dashboard';
import {Icon} from './icon';
import type {Dashboard} from '../lib/report-dashboard/model';
import type {SectionKey} from '../lib/report-intelligence/catalog';
import {trackSample} from '../lib/measurement/client';
import {formatPrice,site} from '../lib/site-config';

export function PublicSampleReport({report,initial}:{report:Dashboard;initial:SectionKey}) {
  const [section,setSection]=useState(initial),[heroVisible,setHeroVisible]=useState(true),[closingVisible,setClosingVisible]=useState(false);
  const hero=useRef<HTMLDivElement>(null),closing=useRef<HTMLElement>(null);
  useEffect(()=>{
    const top=new IntersectionObserver(([entry])=>setHeroVisible(entry.isIntersecting));
    const visible=new Set<Element>();
    const bottom=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);}setClosingVisible(visible.size>0);});
    if(hero.current)top.observe(hero.current);if(closing.current)bottom.observe(closing.current);
    const footer=document.querySelector('body > .site-footer');if(footer)bottom.observe(footer);
    return()=>{top.disconnect();bottom.disconnect();};
  },[]);
  useEffect(()=>{const emit=()=>trackSample('sample_section_viewed',section,'navigation');emit();window.addEventListener('sitefit-google-ready',emit);return()=>window.removeEventListener('sitefit-google-ready',emit);},[section]);
  const start=(placement:'hero'|'sticky'|'closing')=><Link className="button sample-start" href="/check-location" onClick={()=>trackSample('sample_cta_clicked',section,placement)}>Start a Free Snapshot <Icon name="arrow"/></Link>;
  const pricing=(placement:'hero'|'closing')=><Link className="text-link" href="/pricing" onClick={()=>trackSample('sample_cta_clicked',section,placement,'pricing')}>See what’s included for {formatPrice(site.pricing.fullReport)} <Icon name="arrow"/></Link>;
  return <div className="public-sample-report">
    <section className="sample-intro page-wrap" aria-labelledby="sample-title">
      <div><p className="eyebrow">SAMPLE REPORT</p><h1 id="sample-title">One location.<br/><span>The full picture.</span></h1><p className="sample-lead">Explore the recommendation, the local context and the checks that matter before signing a lease.</p><div className="sample-hero-proof"><span>8 connected sections</span><span>Clear next steps</span><span>One-off · {formatPrice(site.pricing.fullReport)}</span></div></div>
      <div className="sample-intro-actions" ref={hero}>{start('hero')}<p>Free · No account or card needed</p><a className="text-link" href="#sample-workspace">Explore the Sample Report <Icon name="down"/></a></div>
    </section>
    <div id="sample-workspace"><ReportDashboard report={report} initial={initial} onSectionChange={setSection}/></div>
    <section className="sample-closing page-wrap" ref={closing} aria-labelledby="sample-closing-title"><div><p className="eyebrow">YOUR OWN LOCATION</p><h2 id="sample-closing-title">What could change<br/>your lease decision?</h2><p>Start with a Free Snapshot for the property you are considering. Explore the deeper investigation, prioritised checks and downloadable PDF in the {formatPrice(site.pricing.fullReport)} Full Report.</p></div><div className="sample-intro-actions">{start('closing')}<p>Free · No account or card needed</p>{pricing('closing')}<small>One-off payment · No subscription</small></div></section>
    {!heroVisible&&!closingVisible&&<aside className="sample-sticky" aria-label="Check your own property"><div><strong>Now check your own location.</strong><small>Free · No account or card needed</small></div>{start('sticky')}</aside>}
  </div>;
}

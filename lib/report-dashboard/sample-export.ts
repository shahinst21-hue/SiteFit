import type {Dashboard} from './model.ts';
import type {SectionKey} from '../report-intelligence/catalog.ts';
import {reportPages} from './display.ts';
import {sampleDisclosure,sampleRecommendation,sampleVersion} from './sample-display.ts';
import {competitionMethod} from '../competition/model.ts';
import {residentialModel} from '../analysis/residential-catchment.ts';

/** Same public example as the dashboard, formatted for the existing PDF renderer. */
export function sampleExportParagraphs(report:Dashboard,key:SectionKey) {
  const decision=sampleRecommendation(report),page=report.pages.find(p=>p.key===key)!;
  const rows:{text:string;heading?:boolean}[]=[];
  const add=(text:string,heading=false)=>{if(text.trim())rows.push({text,heading});};
  add('Sample Report · Fictional scenario',true);add(sampleDisclosure);
  add(reportPages.find(p=>p.key===key)!.label,true);add(page.conclusion);
  if(key==='overview'){
    report.summary?.verdict.slice(1).forEach(t=>add(t));
    add(`Residential Catchment: ${report.residentialCatchment!.score}/100 — ${report.residentialCatchment!.rating}. Competition Headroom: ${report.competition!.score}/100 — ${report.competition!.rating}.`);
    add('Key strengths',true);report.summary?.strengths.forEach(s=>add(s.text));add('Key risks & unknowns',true);report.summary?.risks.forEach(s=>add(s.text));add('Priority action',true);add(report.summary!.priority);
  }
  if(key!=='overview')page.analysis.forEach(s=>add(s.text));
  if(key==='customer-context'){
    const r=report.residentialCatchment!;add('Residential Catchment Strength',true);add(`${r.score}/100 — ${r.rating}`);
    r.populations.forEach((n,i)=>add(`${[5,10,15][i]} min schematic walking area: ${n.toLocaleString('en-GB')} illustrative residents.`));
    r.bands.forEach((n,i)=>add(`${['0–5','5–10','10–15'][i]} min band: ${n.toLocaleString('en-GB')}; reference ${residentialModel.benchmarks[i]}; score ${r.components[i].toFixed(1)}; weight ${residentialModel.weights[i]*100}%.`));
    add(`Current ${r.version} formula: min(100, 50 × band population ÷ reference), then a weighted result of ${r.rawScore.toFixed(4)}, rounded to ${r.score}. Cumulative populations are not added.`);
    add('These are fictional inputs, not retrieved Census or walking-network evidence. Population is not observed customer demand.');
  }
  if(key==='competition'){
    const c=report.competition!;add('Competition Headroom Score',true);add(`${c.score}/100 — ${c.rating}`);
    c.counts!.forEach((n,i)=>add(`${[5,10,15][i]} min schematic walking area: ${n} illustrative similar businesses.`));
    add(competitionMethod);add(`Effective competitors ${c.effectiveCompetitors}; effective residents ${c.effectivePopulation}; density ${c.density!.toFixed(6)} per 1,000. Score = round(100 / (1 + density)).`);
    add('Fictional counts only. No business records, reviews, brands or current activity were retrieved.');
  }
  if(key==='premises'){
    add('Operating-format comparison',true);
    for(const s of report.scenarios!.scenarios){add(s.label,true);add(`Requirements: ${s.requirements.join('; ')}.`);add('Permission and usable layout unresolved. Capacity withheld. No leading format is selected.');}
  }
  if(key==='rental-context'){add('No rental price is assumed',true);add('No qualified asking rent, valuation or comparable price is supplied. Request full lease costs and obligations.');}
  if(key==='actions')for(const a of report.actions){add(`${a.rank}. ${a.action}`,true);add(`Why it changes the decision: ${a.consequence}`);}
  if(page.test&&key!=='overview'){add('What could change the decision?',true);add(page.test.text);}
  page.unknowns.forEach(t=>add(t));
  const ids=new Set([...page.factIds,...page.analysis.flatMap(s=>s.factIds)]);
  add('Illustrative inputs & limitations',true);
  if(key==='appendix')report.sources.forEach(s=>add(`${s.label}: ${s.value} ${s.units??''}. ${s.scope}. No source retrieval or observation date.`));
  else add(`Basis: fictional scenario, ${ids.size} illustrative input${ids.size===1?'':'s'}. No real source was retrieved. Full input descriptions are in Appendix.`);
  if(key==='appendix'){add(`Example version: ${sampleVersion}. Scores use the current residential and competition formulas and ${decision.version}.`);add('No real property, source release, rental price, capacity or demographic profile is represented. The map is schematic. Financial calculations are excluded.');}
  if(key!=='overview')add('Illustrative only. Not a forecast or lease clearance. Methodology: https://sitefit.co.uk/methodology.');
  return rows;
}

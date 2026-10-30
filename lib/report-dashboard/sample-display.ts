import type {Dashboard} from './model.ts';
import type {SectionKey} from '../report-intelligence/catalog.ts';
import {reportPages} from './display.ts';
import {residentialScore} from '../analysis/residential-catchment.ts';
import {competitionScore} from '../competition/model.ts';
import {decideRecommendation} from '../analysis/recommendation.ts';

export const sampleVersion = 'public-sample-v1';
export const sampleDisclosure = 'Fictional scenario · illustrative evidence. No real property, source retrieval or trading results are represented.';
export const samplePdfPath = (section?:SectionKey) => `/samples/${sampleVersion}/${section ?? 'full-report'}.pdf`;
export function sampleSection(section:unknown,hash=''):SectionKey {
  if(reportPages.some(p=>p.key===section))return section as SectionKey;
  const legacy=hash.match(/^#report-section-([0-7])$/);
  if(legacy)return reportPages[Number(legacy[1])].key;
  return ({'#report-overview':'overview','#sample-evidence':'appendix','#report-next':'actions','#report-detail':'overview','#sample-next-step':'overview'} as Record<string,SectionKey>)[hash]??'overview';
}
/** Arithmetic-only demonstration. Never admits fictional inputs as retrieved evidence. */
export function sampleRecommendation(report:Dashboard) {
  const r=report.residentialCatchment,c=report.competition;
  if(report.reportId!==null||!report.demo||!r||!c||c.provenance.retrievedAt!==null||c.provenance.complete||report.sources.some(s=>s.retrievedAt||s.reference))throw Error('invalid_public_sample');
  const population=residentialScore(r.populations,r.metadata),competition=competitionScore(c.populations??[],c.counts??[]);
  if(!population||!competition||population.score!==r.score||competition.score!==c.score||JSON.stringify(r.populations)!==JSON.stringify(c.populations))throw Error('invalid_sample_arithmetic');
  return decideRecommendation({demand:{score:population.score,rating:population.rating,version:r.version,evidenceIds:r.metadata.evidenceIds},competition:{score:competition.score,rating:competition.rating,version:c.version,evidenceIds:['sample:competition']},premises:{state:'unresolved',evidenceIds:[]},access:{state:'unresolved',evidenceIds:[]}});
}

import type {Dashboard, Page, Source, Statement} from '../report-dashboard/model.ts';
import {residentialScore} from '../analysis/residential-catchment.ts';
import {competitionScore, competitionUnavailable} from '../competition/model.ts';
import {decideRecommendation} from '../analysis/recommendation.ts';
import {evaluateScenarioFit} from '../report-intelligence/scenario-fit.ts';
import {reportPages} from '../report-dashboard/display.ts';
export {sampleVersion, sampleDisclosure} from '../report-dashboard/sample-display.ts';
import {sampleVersion} from '../report-dashboard/sample-display.ts';
import source from './sample-source-v2.json' with {type:'json'};

/** Public authored example. Never admitted source evidence or a customer fallback. */
const populations = source.populations, counts = source.counts;
const populationIds = populations.map((_,i)=>`sample:population:${[5,10,15][i]}`), competitionId = 'sample:competition';
const statement = (text:string,factIds:string[]=[]):Statement => ({text,factIds,referenceIds:[],operatorIds:[],kind:'interpretation'});

export function createSampleReport():Dashboard {
  const residential = residentialScore(populations,{evidenceIds:populationIds,snapshotIds:[],releaseIds:[],precision:'unknown',referencePeriod:'2021-03-21',retrievedAt:[],point:null})!;
  // No invented retrieval date, collection ID, source release or verified-source flags.
  const competition = {...competitionUnavailable('coffee-shop','unsupported','Walking-area category matches relative to the residential population.'),...competitionScore(populations,counts)!,counts:[...counts],populations:[...populations],records:source.records,recordTotal:source.counts[2]} as NonNullable<Dashboard['competition']>;
  const recommendation = decideRecommendation({demand:{score:residential.score,rating:residential.rating,version:residential.version,evidenceIds:populationIds},competition:{score:competition.score!,rating:competition.rating!,version:competition.version,evidenceIds:[competitionId]},premises:{state:'unresolved',evidenceIds:[]},access:{state:'unresolved',evidenceIds:[]}});
  const priority = 'Get a measured plan and written confirmation of permitted use before shortlisting.';
  const strengths = [statement('A strong residential base gives repeat coffee visits a proposition to test.',populationIds),statement('Moderate competitive headroom leaves room to investigate a distinct offer.',[competitionId])];
  const risks = [statement('Permitted use and usable layout are unresolved; either could rule out your concept.',['sample:premises']),statement('Residents are not customers. Buying intent and passing trade remain unverified.',populationIds),statement('Lease costs and obligations are unknown. Obtain the proposed terms in writing.',['sample:lease'])];
  const content:Record<Page['key'],{conclusion:string;analysis:Statement[];test:string;unknowns:string[]}> = {
    overview:{conclusion:recommendation.title,analysis:[statement('The example combines strong residential context with moderate competition headroom. Premises constraints must be resolved before it can become a shortlist candidate.',[...populationIds,competitionId,'sample:premises'])],test:priority,unknowns:['A recommendation supports investigation, not lease commitment.']},
    'customer-context':{conclusion:'A residential base worth testing, rather than proven coffee demand.',analysis:[statement('Nearby residents could support repeat visits if the offer, prices and trading hours suit them.',populationIds),statement('Workplace activity, visitors and purchase intent have not been established. Test the intended trading periods on a visit.',populationIds)],test:'Observe the entrance during the hours you intend to trade.',unknowns:['Demographic context and residential population do not establish purchase intent.']},
    competition:{conclusion:'Moderate headroom calls for a clear reason to choose your coffee shop.',analysis:[statement('The walking-area counts describe same-category businesses within cumulative walking areas. Compare the offers people could choose instead.',[competitionId]),statement('Menus, prices, customer reviews, brand strength and current activity remain unverified.',[competitionId])],test:'Compare nearby offers, prices and opening hours before choosing your proposition.',unknowns:['Offers, current trading status, reviews and brand strength need local verification.']},
    access:{conclusion:'Check the approach to the entrance at your intended trading hours.',analysis:[statement('Transport connections provide useful access context. Observe the final approach to the entrance during intended trading periods.',['sample:approach']),statement('Walking-network estimates describe reach, not measured pedestrian footfall or buying intent.',['sample:approach'])],test:'Walk the approach and observe the entrance during morning and lunchtime periods.',unknowns:['Check entrances, barriers and the approach during intended opening hours.']},
    premises:{conclusion:'Permission and layout could change the concept before you shortlist.',analysis:[statement('The format comparison explores different layout configurations. Confirm permitted use and a measured plan before choosing one.',['sample:premises']),statement('Takeaway, balanced and sit-in formats have different preparation, storage, circulation and customer-facility requirements.',['sample:premises'])],test:priority,unknowns:['Usable area, capacity, lawful use and required works remain unknown.']},
    'rental-context':{conclusion:'Establish the full lease commitment before comparing the opportunity.',analysis:[statement('Use the market context to frame lease discussions. Obtain the actual asking rent, rates, charges and repair obligations in writing.',['sample:lease'])],test:'Obtain rent, rates, service charges, repair obligations and break terms in writing.',unknowns:['Market benchmarks are separate from the selected unit’s quoted or agreed rent.']},
    actions:{conclusion:'Resolve the questions that could change your decision first.',analysis:[statement('Start with permission and usable layout. Then test the approach, compare the coffee offer and establish the lease obligations.',['sample:premises','sample:approach',competitionId,'sample:lease'])],test:priority,unknowns:['Checking an action organises this page visit; it does not verify a fact.']},
    appendix:{conclusion:'Explore the evidence behind the assessment.',analysis:[statement('The source directory separates stored area estimates, business records and sample assumptions. Scope and reference periods stay attached to each finding.',['sample:premises',...populationIds,competitionId])],test:'Read the methodology before interpreting the example as a property assessment.',unknowns:['This example cannot establish demand, permission, capacity, rent or commercial success.']},
  };
  const sources:Source[] = [
    ...populations.map((value,i)=>({id:populationIds[i],section:'customer-context' as const,label:`Residential population · ${[5,10,15][i]} minute area`,value,units:'people',scope:`${[5,10,15][i]} minute walking area; cumulative estimate`})),
    {id:competitionId,section:'competition' as const,label:'Similar businesses in walking areas',value:counts.join(' / '),units:'businesses',scope:'5 / 10 / 15 minute walking areas; cumulative counts'},
    {id:'sample:premises',section:'premises' as const,label:'Permission and usable layout',value:'Unknown',units:null,scope:'Selected premises; documents require verification'},
    {id:'sample:approach',section:'access' as const,label:'Interrupted approach',value:'Approach requires verification',units:null,scope:'Final approach requires an in-person check'},
    {id:'sample:lease',section:'rental-context' as const,label:'Rent and lease terms',value:'Unknown',units:null,scope:'Lease terms require verification'},
  ].map(s=>({...s,kind:'modelled estimate',strength:'Contextual',precision:'Area context',effectiveAt:null,retrievedAt:null,reference:null,provider:'Sample dataset',release:null,adapter:sampleVersion,limitations:['Context does not establish observed demand or premises permission.'],licence:'Authored sample case',notices:[],statistical:'Area context and sample assumptions.'}));
  const report:Dashboard = {version:'report-dashboard-v1',presentationMode:'public-sample',reportId:null,digest:sampleVersion,generatedAt:source.generatedAt,address:'London coffee shop',business:'coffee-shop',businessLabel:'Coffee shop',precision:'Area context',analysisTimestamp:null,editionLabel:'Sample Report',demo:true,residentialCatchment:residential,competition,recommendation,
    pages:reportPages.map(({key})=>({key,conclusion:content[key].conclusion,analysis:content[key].analysis,test:statement(content[key].test,content[key].analysis.flatMap(s=>s.factIds)),cautions:[],factIds:[...new Set(content[key].analysis.flatMap(s=>s.factIds))],referenceIds:[],unknowns:content[key].unknowns,availability:'Available',direction:'conditional'})),sources,references:[],summary:{verdict:[recommendation.title,'Strong residential context and moderate competition headroom make the proposition worth testing; the premises remain unresolved.','Do not commit to a lease on these example scores.'],strengths,risks,priority},readiness:'Permission and layout unresolved',index:{label:'Resident & Workplace Context Index',value:null,scope:'Not calculated in this sample case',method:'',components:[]},scenarios:evaluateScenarioFit({businessType:'coffee-shop',facts:[]}),operators:null,profiles:[],timeline:[],rental:[],
    actions:[
      {rank:1,action:priority,consequence:'An incompatible use or layout could rule out the concept before further investigation.',factIds:['sample:premises']},
      {rank:2,action:'Observe the entrance and approach during your intended trading periods.',consequence:'If people do not pass the entrance, neighbourhood activity may not translate into visits.',factIds:['sample:approach',...populationIds]},
      {rank:3,action:'Compare nearby coffee offers, prices and opening hours.',consequence:'If your offer does not give people a reason to switch, reconsider the proposition.',factIds:[competitionId]},
      {rank:4,action:'Obtain the full proposed lease costs and obligations in writing.',consequence:'Unacceptable costs, repairs or break terms could change the decision even where local context is supportive.',factIds:['sample:lease']},
    ],map:null,transport:[],spatialNotices:[]};
  report.map={
    status:'available',description:source.map.description,
    bounds:[source.map.bounds[0],source.map.bounds[1],source.map.bounds[2],source.map.bounds[3]],
    layers:source.map.layers.map(l=>({
      id:l.id,label:l.label,kind:l.kind as NonNullable<Dashboard['map']>['layers'][number]['kind'],
      status:'available',colour:l.colour,points:[],polygons:[],
      polygonParts:l.polygonParts.map(p=>p.map(ring=>ring.map(point=>[point[0],point[1]] as [number,number])))
    }))
  };
  report.spatialNotices=['Walking areas are modelled; population and access are context, not observed visits.'];
  const bounds=report.map!.bounds!,x=(bounds[0]+bounds[2])/2,y=(bounds[1]+bounds[3])/2;
  report.transport=[{id:'sample-transport-1',name:'Underground connection',mode:'tube',distanceMetres:620,walkingMinutes:8,information:'Sample dataset · route estimate; entrances need checking.',status:'available'},{id:'sample-transport-2',name:'Rail connection',mode:'rail',distanceMetres:840,walkingMinutes:11,information:'Sample dataset · route estimate; entrances need checking.',status:'available'},{id:'sample-transport-3',name:'Local bus connection',mode:'bus',distanceMetres:210,walkingMinutes:3,information:'Sample dataset · route estimate; entrances need checking.',status:'available'}];
  report.map!.layers.push({id:'stations',label:'Transport connections',kind:'transport',status:'available',colour:'#287eaa',points:[[x+.004,y+.002],[x-.006,y-.003],[x+.001,y-.001]],polygons:[]});
  report.profiles=[{dataset:'sample-age',seconds:600,period:'Sample dataset',universe:'Sample resident profile',method:'Sample dataset',limitations:['A population profile is not observed customer demand.'],columns:[['Under 18',2200],['18–24',1700],['25–34',5600],['35–44',3600],['45–64',3300],['65 and over',1607]].map(([label,value])=>({label:String(label),value:Number(value),state:'available',share:null}))},{dataset:'sample-activity',seconds:600,period:'Sample dataset',universe:'Sample adult profile',method:'Sample dataset',limitations:['Employment categories do not establish local spending.'],columns:[['Full-time employment',7900],['Part-time employment',2100],['Self-employed',1600],['Studying',1700],['Retired',1100],['Other',939]].map(([label,value])=>({label:String(label),value:Number(value),state:'available',share:null}))}];
  report.sampleRental={benchmark:42,cohort:18,averageSqft:820,averageAnnual:34500};
  report.sources.push(...source.observations.filter(o=>typeof o.value==='number'||typeof o.value==='string').map((o,i)=>({...report.sources[0],id:`sample:source:${i}`,section:o.section as Page['key'],label:o.label,value:o.value!,units:o.units,scope:o.scope,effectiveAt:o.effectiveAt,kind:o.label.startsWith('TS')?'modelled estimate':'source record',provider:o.label.startsWith('TS')?'ONS Census 2021':'Stored source context'})));
  report.sources.push({...report.sources[0],id:'sample:profiles',section:'customer-context',label:'Resident and economic activity profiles',value:'Sample dataset',units:null,kind:'sample assumption',scope:'10 minute walking area'},{...report.sources[0],id:'sample:rent',section:'rental-context',label:'Market rental context',value:42,units:'GBP per square foot per year',kind:'sample assumption',scope:'Sample comparison cohort'});
  report.pages.find(p=>p.key==='customer-context')!.factIds.push(...report.sources.filter(s=>s.section==='customer-context').map(s=>s.id));
  report.pages.find(p=>p.key==='premises')!.factIds.push(...report.sources.filter(s=>s.section==='premises').map(s=>s.id));
  report.pages.find(p=>p.key==='rental-context')!.factIds.push('sample:rent');
  report.sources.push({...report.sources[0],id:'sample:layout',section:'premises',label:'Usable-layout scenario',value:80,units:'square metres',kind:'sample assumption',scope:'Sample dataset; not a measured plan'});
  report.pages.find(p=>p.key==='premises')!.factIds.push('sample:layout');
  report.scenarios!.scenarios.forEach((scenario,i)=>{
    scenario.physical.capacity={count:[16,24,30][i],unit:'places',status:'conditional-layout-configuration',sourceIds:['sample:layout']};
    scenario.physical.capacityWithheldReason=null;
  });
  return report;
}

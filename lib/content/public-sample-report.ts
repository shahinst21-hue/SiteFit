import type {Dashboard} from '../report-dashboard/model.ts';
import {residentialScore} from '../analysis/residential-catchment.ts';
import {competitionScore,competitionUnavailable} from '../competition/model.ts';
import {decideRecommendation} from '../analysis/recommendation.ts';
import {evaluateScenarioFit} from '../report-intelligence/scenario-fit.ts';
import {sampleVersion} from '../report-dashboard/sample-display.ts';
import source from './sample-source-v2.json' with {type:'json'};
import full from './sample-full-v3.json' with {type:'json'};
import {sampleCafeNames} from './sample-businesses.ts';
export {sampleVersion,sampleDisclosure} from '../report-dashboard/sample-display.ts';

/** Reviewed public projection. Reading this page never executes the generator or a provider. */
export function createSampleReport():Dashboard {
 const populations=source.populations,counts=source.counts;
 const populationIds=populations.map((_,i)=>`sample:population:${[5,10,15][i]}`);
 const residential=residentialScore(populations,{evidenceIds:populationIds,snapshotIds:[],releaseIds:[],precision:'unknown',referencePeriod:'2021-03-21',retrievedAt:[],point:null})!;
 // Scores preserve source-case arithmetic; this public projection cannot authorise a customer report.
 const competition={...competitionUnavailable('coffee-shop','unsupported','Walking-area category matches relative to the residential population.'),...competitionScore(populations,counts)!,counts:[...counts],populations:[...populations],records:source.records.map((record,i)=>({...record,name:sampleCafeNames[i]})),recordTotal:counts[2]} as NonNullable<Dashboard['competition']>;
 const recommendation=decideRecommendation({demand:{score:residential.score,rating:residential.rating,version:residential.version,evidenceIds:populationIds},competition:{score:competition.score!,rating:competition.rating!,version:competition.version,evidenceIds:['sample:competition']},premises:{state:'unresolved',evidenceIds:[]},access:{state:'unresolved',evidenceIds:[]}});
 const report:Dashboard={version:'report-dashboard-v1',presentationMode:'public-sample',reportId:null,digest:sampleVersion,generatedAt:full.generatedAt,address:'London coffee shop',business:'coffee-shop',businessLabel:'Coffee shop',precision:'Area context',analysisTimestamp:null,editionLabel:'Sample Report',demo:true,
  residentialCatchment:residential,competition,recommendation,pages:structuredClone(full.pages) as Dashboard['pages'],sources:structuredClone(full.sources) as Dashboard['sources'],references:structuredClone(full.references),summary:structuredClone(full.summary),actions:structuredClone(full.actions),profiles:structuredClone(full.profiles),rental:structuredClone(full.rental) as Dashboard['rental'],readiness:'Permission and layout unresolved',index:{label:'Resident & Workplace Context Index',value:null,scope:'Comparative density baselines unavailable',method:'',components:[]},scenarios:evaluateScenarioFit({businessType:'coffee-shop',facts:[]}),operators:null,timeline:[],map:{status:'available',description:source.map.description,bounds:[source.map.bounds[0],source.map.bounds[1],source.map.bounds[2],source.map.bounds[3]],layers:source.map.layers.map(l=>({id:l.id,label:l.label,kind:l.kind as NonNullable<Dashboard['map']>['layers'][number]['kind'],status:'available',colour:l.colour,points:[],polygons:[],polygonParts:l.polygonParts.map(p=>p.map(ring=>ring.map(point=>[point[0],point[1]] as [number,number])))}))},transport:[],spatialNotices:['Walking areas are modelled; population and access are context, not observed visits.']};
 // Optional descriptive examples stay separate from the original admitted observations.
 const assumption={...report.sources[0],kind:'sample assumption',provider:'Sample dataset',effectiveAt:null,retrievedAt:null,release:null,reference:null,adapter:sampleVersion,licence:'Authored sample case',statistical:'Sample assumption',strength:'Contextual',precision:'Unverified',notices:[],limitations:['Requires a measured plan or local verification.']};
 report.sources.push({...assumption,id:'sample:layout',section:'premises',label:'Usable-layout scenario',value:80,units:'square metres',scope:'Sample dataset; not a measured plan'},{...assumption,id:'sample:transport',section:'access',label:'Transport approach examples',value:'Three generic connections',units:null,scope:'Sample dataset; not verified station entrances or measured routes'});
 report.pages.find(p=>p.key==='premises')!.factIds.push('sample:layout');
 report.pages.find(p=>p.key==='access')!.factIds.push('sample:transport');
 report.scenarios!.scenarios.forEach((scenario,i)=>{scenario.physical.capacity={count:[16,24,30][i],unit:'places',status:'conditional-layout-configuration',sourceIds:['sample:layout']};scenario.physical.capacityWithheldReason=null;});
 report.transport=[{id:'sample-transport-1',name:'Underground connection',mode:'tube',distanceMetres:620,walkingMinutes:8,information:'Sample dataset · route estimate; entrances need checking.',status:'available'},{id:'sample-transport-2',name:'Rail connection',mode:'rail',distanceMetres:840,walkingMinutes:11,information:'Sample dataset · route estimate; entrances need checking.',status:'available'},{id:'sample-transport-3',name:'Local bus connection',mode:'bus',distanceMetres:210,walkingMinutes:3,information:'Sample dataset · route estimate; entrances need checking.',status:'available'}];
 const bounds=report.map!.bounds!,x=(bounds[0]+bounds[2])/2,y=(bounds[1]+bounds[3])/2;
 report.map!.layers.push({id:'stations',label:'Transport connections',kind:'transport',status:'available',colour:'#287eaa',points:[[x+.004,y+.002],[x-.006,y-.003],[x+.001,y-.001]],polygons:[]});
 return report;
}

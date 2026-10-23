import {residentialScore} from '../../lib/analysis/residential-catchment.ts';
import {competitionScore} from '../../lib/competition/model.ts';
import {competitionFixture} from './competition.ts';
import {recommendationFromScores} from '../../lib/analysis/recommendation.ts';
import {advisorFixture} from './snapshot-advisor.ts';

/** Screenshot operands for regression only; no assertion of live provider verification. */
export function recommendationFixture(){
 const populations:[number,number,number]=[1377,4629,10556];
 const residential=residentialScore(populations,{evidenceIds:['saved-population-evidence'],snapshotIds:['00000000-0000-4000-8000-000000000003'],releaseIds:[],precision:'postcode_centroid',referencePeriod:'2021-03-21',retrievedAt:['2026-10-22T10:00:00Z'],point:{longitude:-.1,latitude:51.5}})!;
 const competition={...competitionFixture([5,7,11]),populations,...competitionScore(populations,[5,7,11])!};
 const decision=recommendationFromScores(residential,competition);
 const advice={...advisorFixture(),version:'snapshot-advisor-v2' as const,recommendation:{text:decision.title,sectionIds:['customer-base','market-position'] as ('customer-base'|'market-position')[]},
   why:{text:decision.why,sectionIds:['customer-base','market-position'] as ('customer-base'|'market-position')[]},action:{text:decision.nextMove,sectionIds:['premises','customer-base'] as ('premises'|'customer-base')[]}};
 return {residential,competition,decision,advice};
}

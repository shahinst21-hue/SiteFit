/* global console, AbortSignal, Response */
import assert from 'node:assert/strict';
import {competitionScore} from '../../lib/competition/model.ts';
import {collectCompetition} from '../../lib/competition/collection.ts';
import {competitionFixture} from '../fixtures/competition.ts';
import {residentialScore,validateResidentialScore} from '../../lib/analysis/residential-catchment.ts';
import {recommendationFromScores,decideRecommendation} from '../../lib/analysis/recommendation.ts';
const square=n=>({type:'Polygon',coordinates:[[[-.1-n,51.5-n],[-.1+n,51.5-n],[-.1+n,51.5+n],[-.1-n,51.5+n],[-.1-n,51.5-n]]]});
let seed=2401024, comparisons=0;const rnd=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
for(let i=0;i<1000;i++){const p=[1+rnd()*5000,0,0];p[1]=p[0]+rnd()*10000;p[2]=p[1]+rnd()*20000;const n=[Math.floor(rnd()*20),0,0];n[1]=n[0]+Math.floor(rnd()*40);n[2]=n[1]+Math.floor(rnd()*100);const baseline=competitionScore(p,n);assert.ok(baseline.score>=0&&baseline.score<=100);assert.ok(competitionScore(p.map(x=>2*x),n).score>=baseline.score);assert.ok(competitionScore(p,n.map(x=>2*x)).score<=baseline.score);comparisons+=3;}
const ledger={async reserve(){return {id:'fixture',cached:null}},async settle(){}};
const zero=await collectCompetition({category:'coffee-shop',populations:[1000,3000,10000],geometries:[square(.01),square(.02),square(.03)],provenance:competitionFixture().provenance},ledger,'fixture',AbortSignal.timeout(3000),async()=>Response.json({type:'FeatureCollection',features:[]}));
assert.equal(zero.score,null);assert.equal(zero.provenance.coverageVerified,false);
const m={evidenceIds:[],snapshotIds:[],releaseIds:[],precision:'building',referencePeriod:'2021-03-21',retrievedAt:[],point:{longitude:-.1,latitude:51.5}};
const malformed=residentialScore([1000,3000,10000],m);assert.throws(()=>validateResidentialScore(malformed),/invalid_residential_metadata/);assert.throws(()=>recommendationFromScores(malformed,undefined),/invalid_residential_metadata/);
let decisions=0;for(const d of [0,39,40,59,60,79,80,100])for(const c of [0,39,40,59,60,79,80,100]){const metric=(x,v)=>({score:x,rating:x<40?'Limited':x<60?'Moderate':x<80?'Supportive':'Strong',version:v,evidenceIds:['verified']});const out=decideRecommendation({demand:metric(d,'residential-catchment-v1.0'),competition:metric(c,'competition_headroom_v1'),premises:{state:'unresolved',evidenceIds:[]},access:{state:'conditional',evidenceIds:[]}});assert.equal(out.status,d<40&&c<40?'hold':d<40||c<40?'caution':'conditional');decisions++;}
console.log(JSON.stringify({seed:2401024,metamorphicAssertions:comparisons,policyBoundaryCases:decisions,emptyProviderResponse:{state:zero.state,score:zero.score,coverageVerified:zero.provenance.coverageVerified},provenanceBoundaryRejected:true,externalCalls:0}));

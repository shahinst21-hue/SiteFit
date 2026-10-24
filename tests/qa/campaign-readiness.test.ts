/** Independent acceptance probes. Run explicitly; known failures are preserved, not waived. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {productionSupabaseTarget,PRODUCTION_SUPABASE_REF} from '../../lib/supabase/config.ts';
import {sourceCollectionAllowed} from '../../lib/release/policy.ts';
import {collectCompetition} from '../../lib/competition/collection.ts';
import {competitionFixture} from '../fixtures/competition.ts';
import {spawnSync} from 'node:child_process';

test('REL-04: isolated writable execution must reject a Production database target',()=>{
  const production=new URL(`https://${PRODUCTION_SUPABASE_REF}.supabase.co`);
  for(const marker of [undefined,'preview','development']){
    const env={VERCEL_ENV:marker};
    assert.equal(productionSupabaseTarget(env,production)&&sourceCollectionAllowed(env,'localhost'),false,
      `mixed Production database and ${marker??'missing'} environment accepted`);
  }
});

test('GEO-F01: empty Places alone cannot certify usable provider coverage',async()=>{
  const square=(n:number)=>({type:'Polygon' as const,coordinates:[[[-.1-n,51.5-n],[-.1+n,51.5-n],[-.1+n,51.5+n],[-.1-n,51.5+n],[-.1-n,51.5-n]] as [number,number][]]});
  const ledger={async reserve(){return {id:'fixture',cached:null};},async settle(){}};
  const result=await collectCompetition({category:'coffee-shop',populations:[1000,3000,10000],geometries:[square(.01),square(.02),square(.03)],provenance:competitionFixture().provenance},ledger,'fixture',AbortSignal.timeout(3000),async()=>Response.json({type:'FeatureCollection',features:[]}));
  assert.notEqual(result.state,'ready','no independent provider coverage evidence was supplied');
});

test('UI-07: one complete population snapshot must not be described as partial',()=>{
  const rendered=spawnSync(process.execPath,['tests/fixtures/render-copy.mjs','competition-details'],{encoding:'utf8',timeout:120000});
  assert.equal(rendered.status,0,rendered.stderr);
  const text=rendered.stdout.replace(/<[^>]*>/g,'');
  assert.match(text,/Residential population evidence: available for all three walking bands/);
});

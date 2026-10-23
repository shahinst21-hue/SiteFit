import test from 'node:test';
import assert from 'node:assert/strict';
import {compactSources,compactSectionAtoms,sectionExport,validateFullProjection} from '../lib/report-intelligence/export.ts';
import {sectionKeys,type Fact} from '../lib/report-intelligence/catalog.ts';
import {packetDigest} from '../lib/analysis/canonical.ts';

test('compact report provenance and repeated analytical text export losslessly; broken references fail closed',()=>{
  const fact={id:'fact-one',evidenceId:'evidence-one',section:'customer-context',dataset:'dated-residents',value:120,
    units:'persons',scope:'dated native area; not customers',effectiveAt:'2021-03-21',retrievedAt:'2026-10-11',
    limitations:['not current demand'],source:{provider:'official'},licence:{retention:'derived permitted'},statistical:{allocation:'area'},
    strength:'limited',kind:'derived',sourceClass:'official',freshness:'dated',precision:'area'} as unknown as Fact;
  const atom={id:'reason-one',section:'customer-context',role:'reason',text:'Dated residents support context only.',factIds:[fact.id],rule:'bounded-context'};
  const original=sectionKeys.map(key=>({key,availability:'partial',factIds:[fact.id],reasons:[atom],cautions:[atom]}));
  const content={version:'full-report-v1',bindingDigest:'a'.repeat(64),financialEngineIncluded:false,
    ...compactSources([fact]),...compactSectionAtoms(original),supplementReferences:[]};
  const projection={...content,contentDigest:packetDigest(content)};
  const exported=sectionExport(projection,'customer-context');
  assert.deepEqual(exported.sources,[fact]);
  assert.deepEqual(exported.section.reasons,[atom]);
  assert.deepEqual(exported.section.cautions,[atom]);
  assert.equal(content.atomTexts.length,1);
  const invalid=structuredClone(content); invalid.sourceDirectory[0].metadata.source=999;
  assert.throws(()=>validateFullProjection({...invalid,contentDigest:packetDigest(invalid)}));
  const invalidText=structuredClone(content);invalidText.atomTexts=[];
  assert.throws(()=>validateFullProjection({...invalidText,contentDigest:packetDigest(invalidText)}));
});

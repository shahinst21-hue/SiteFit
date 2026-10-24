import test from 'node:test';
import assert from 'node:assert/strict';
import {earlyReportSection} from '../lib/analysis/report-section.ts';

test('policy collection references stay in the decision projection and never become narrative claim references',()=>{
 const source='10000000-0000-4000-8000-000000000001',collection='20000000-0000-4000-8000-000000000002';
 const early={headline:'Proceed with caution',evidenceIds:[source],advisor:{why:{text:'Compare local offers.',evidenceIds:[source]}},decision:{inputs:{competition:{evidenceIds:[collection]}}}};
 const before=JSON.stringify(early),section=earlyReportSection(early);
 const references=(v:unknown):string[]=>!v||typeof v!=='object'?[]:Object.entries(v).flatMap(([k,x])=>k==='evidenceIds'?x as string[]:references(x));
 assert.ok(references(early).includes(collection));
 assert.deepEqual(new Set(references(section)),new Set([source]));
 assert.equal(section.section,'early-view');assert.deepEqual(section.advisor,early.advisor);assert.equal(JSON.stringify(early),before);
 assert.deepEqual(earlyReportSection({headline:'Legacy',evidenceIds:[source]}),{section:'early-view',headline:'Legacy',evidenceIds:[source]});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotPersistenceDiagnostic,reportSnapshotPersistenceFailure} from '../lib/analysis/persistence-diagnostics.ts';
test('failed Snapshot persistence retains only recognised SQL reason/state codes',()=>{
 assert.deepEqual(snapshotPersistenceDiagnostic({message:'enriched_evidence_operand_path',code:'23514',details:'private address and report',hint:'secret'}),
  {reason:'enriched_evidence_operand_path',databaseCode:'23514'});
 for(const error of [{message:'enriched_evidence_operand_path private address',code:'secret'},Error('private report prose'),null,undefined]){
  const value=snapshotPersistenceDiagnostic(error);assert.doesNotMatch(JSON.stringify(value),/private|secret|address|prose/);
 }
 assert.deepEqual(snapshotPersistenceDiagnostic(null),{reason:'missing_ready_identifier',databaseCode:null});
 const seen:unknown[]=[];reportSnapshotPersistenceFailure({message:'invalid_section_evidence',code:'23514'},(event,detail)=>seen.push({event,detail}));
 assert.deepEqual(seen,[{event:'snapshot_persistence_failure',detail:{reason:'invalid_section_evidence',databaseCode:'23514'}}]);
 assert.doesNotThrow(()=>reportSnapshotPersistenceFailure(null,()=>{throw Error('logger unavailable');}));
});

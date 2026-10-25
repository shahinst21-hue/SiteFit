import test from 'node:test';
import assert from 'node:assert/strict';
import {assertMigrationIdentities,migrationIdentity} from '../scripts/check-migration-identities.ts';
const row=(name:string,sql='select 1;')=>migrationIdentity('supabase/migrations/'+name,new TextEncoder().encode(sql));
test('migration identity preflight detects the observed cross-PR timestamp collision before deployment',()=>{
 const allocation=row('20261025120000_development_acceptance_allocation.sql');
 const correction=row('20261025120000_unavailable_catchment_evidence.sql');
 assert.throws(()=>assertMigrationIdentities([allocation,correction]),/migration_version_reused/);
 assert.throws(()=>assertMigrationIdentities([correction],[],[allocation]),/migration_pending_collision/);
 const unique=row('20261025200000_unavailable_catchment_evidence.sql');
 assert.equal(assertMigrationIdentities([unique],[],[allocation]),1);
 assert.equal(assertMigrationIdentities([unique],[],[unique,unique]),1);
});
test('history checks refuse missing, renamed or edited applied migration identities',()=>{
 const applied=row('20261024150000_original.sql');
 assert.equal(assertMigrationIdentities([applied],[applied]),1);
 for(const changed of [[],[row('20261024150000_renamed.sql')],[row('20261024150000_original.sql','select 2;')]]){
  assert.throws(()=>assertMigrationIdentities(changed,[applied]),/migration_history_changed/);
 }
 assert.throws(()=>assertMigrationIdentities([row('bad.sql')]),/migration_filename_invalid/);
});

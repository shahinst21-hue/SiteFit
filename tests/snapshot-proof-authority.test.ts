import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledSnapshotConfigured} from '../lib/proof/authority.ts';
import {releasePolicy} from '../lib/release/policy.ts';
import {proofPolicy} from '../lib/proof/repository.ts';
test('one-case Snapshot configuration cannot approve sales, Full, other hosts or Preview',()=>{
 const env={VERCEL_ENV:'production',SITE_URL:'https://sitefit.co.uk',SITEFIT_CONTROLLED_PROOF_ENABLED:'1',SITEFIT_CONTROLLED_PROOF_ID:'11111111-1111-4111-8111-111111111111'};
 assert.equal(controlledSnapshotConfigured(env,'sitefit.co.uk'),true);
 for(const changed of [{SITEFIT_CONTROLLED_PROOF_ENABLED:'0'},{SITEFIT_CONTROLLED_PROOF_ID:''},{VERCEL_ENV:'preview'},{SITE_URL:'https://other.example'}])assert.equal(controlledSnapshotConfigured({...env,...changed},'sitefit.co.uk'),false);
 assert.equal(controlledSnapshotConfigured(env,'other.example'),false);
 assert.equal(proofPolicy.activationApproved,false);assert.equal(releasePolicy.paidExecutionApproved,false);assert.equal(releasePolicy.sourceCollectionApproved,false);
});

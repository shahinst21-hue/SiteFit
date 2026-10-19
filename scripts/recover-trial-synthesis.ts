// Explicit operator command only. No environment-file loading, retries or public endpoint.
import assert from 'node:assert/strict';
import {recoverTrialSynthesis} from '../lib/proof/recover-synthesis.ts';
const [id,owner,approval]=process.argv.slice(2);
assert.equal(approval,'--execute-approved-synthesis');
assert.equal(process.env.VERCEL_ENV,'production');
assert.equal(process.env.SUPABASE_URL,'https://vsfkkroxgntoumoqcfcy.supabase.co');
const started=Date.now();
const result=await recoverTrialSynthesis(id,owner);
console.log(JSON.stringify({...result,elapsedMs:Date.now()-started}));

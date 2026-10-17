import {releasePreflight} from '../lib/release/preflight.ts';
// Explicit process environment only: do not silently load Development credentials.
const result=releasePreflight(process.env);
console.log(JSON.stringify(result,null,2));
console.log('Offline shapes and existing approval fences only. No secret values, network requests, activation or spending. Configuration completeness is not launch verification.');
if(!result.configurationComplete||!result.approvals.production||!result.approvals.paidExecution||!result.approvals.sourceCollection||!result.approvals.salePolicy)process.exitCode=1;

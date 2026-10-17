import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('actual login offers Google with sales/execution disabled; invalid Production target stays unavailable',()=>{
 const env={VERCEL_ENV:'production',SUPABASE_URL:'https://vsfkkroxgntoumoqcfcy.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SITEFIT_COMMERCIAL_ENABLED:'0',SITEFIT_COMMERCIAL_EXECUTION:'0',SITEFIT_TEST_PURCHASES_ENABLED:'false',SITEFIT_REPORT_INTELLIGENCE_VERIFICATION:'0'};
 function render(values:Record<string,string>){const result=spawnSync(process.execPath,['tests/fixtures/render-login.mjs'],{input:JSON.stringify(values),encoding:'utf8'});assert.equal(result.status,0,result.stderr);return result.stdout}
 const html=render(env);assert.match(html,/Continue with Google/);assert.match(html,/Sign-in options/);assert.doesNotMatch(html,/disabled=""[^>]*>Continue with Google/);
 const unavailable=render({...env,SUPABASE_URL:'https://idlsjusbrmyucccostxt.supabase.co'});assert.doesNotMatch(unavailable,/Continue with Google/);assert.match(unavailable,/could not connect to sign-in/);
});

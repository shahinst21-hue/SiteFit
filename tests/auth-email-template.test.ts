import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';

test('branded account email retains Supabase verification URL and contains no executable/tracking or alternate token flow',async()=>{
 const html=await readFile(new URL('../supabase/templates/account-access.html',import.meta.url),'utf8');
 assert.equal((html.match(/\{\{\s*\.ConfirmationURL\s*\}\}/g)??[]).length,1);
 assert.match(html,/<a href="\{\{ \.ConfirmationURL \}\}"/);
 assert.doesNotMatch(html,/TokenHash|RedirectTo|<script|<iframe|<form|onclick=|javascript:|data:image|utm_|tracking|\.Data\b/i);
 const urls=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(urls,['https://sitefit.co.uk','https://sitefit.co.uk/brand/sitefit-wordmark-email.png','{{ .ConfirmationURL }}','mailto:info@sitefit.co.uk']);
 assert.match(html,/same browser/);assert.match(html,/one hour/);assert.match(html,/used once/);
 const png=await readFile(new URL('../public/brand/sitefit-wordmark-email.png',import.meta.url));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),480);assert.ok(png.readUInt32BE(20)>50);
});

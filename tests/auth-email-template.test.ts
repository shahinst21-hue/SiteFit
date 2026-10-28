import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';

test('branded account email uses a SiteFit POST-confirmed one-time token without browser dependence or tracking',async()=>{
 const html=await readFile(new URL('../supabase/templates/account-access.html',import.meta.url),'utf8');
 assert.equal((html.match(/\{\{\s*\.TokenHash\s*\}\}/g)??[]).length,1);
 assert.match(html, /\/auth\/confirm\?token_hash=/);
 assert.doesNotMatch(html,/ConfirmationURL|<script|<iframe|<form|onclick=|javascript:|data:image|utm_|tracking|\.Data\b/i);
 const urls=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(urls,['https://sitefit.co.uk','https://sitefit.co.uk/brand/sitefit-wordmark-email.png','{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email&amp;next={{ .RedirectTo }}','mailto:info@sitefit.co.uk']);
 assert.doesNotMatch(html,/same browser/);assert.match(html,/device where you want to sign in/);assert.match(html,/one hour/);assert.match(html,/used once/);
 const png=await readFile(new URL('../public/brand/sitefit-wordmark-email.png',import.meta.url));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),480);assert.ok(png.readUInt32BE(20)>50);
});

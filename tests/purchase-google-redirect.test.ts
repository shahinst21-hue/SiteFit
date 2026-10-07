import {test} from 'node:test';
import assert from 'node:assert/strict';
import {googleAuthRedirect} from '../lib/auth/google-redirect.ts';
test('Google manual linking admits only the SDK provider URL and exact Supabase callback',()=>{
 const origin='https://example.supabase.co';
 const oauth=`${origin}/auth/v1/authorize?provider=google`;
 const link=`https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=${encodeURIComponent(origin+'/auth/v1/callback')}`;
 assert.equal(googleAuthRedirect(oauth,origin,false),oauth);
 assert.equal(googleAuthRedirect(link,origin,true),link);
 for(const [url,linking] of [[link,false],[link.replace('accounts.google.com','accounts.google.com.evil.example'),true],[link.replace('https:','http:'),true],[link.replace('/o/oauth2/v2/auth','/other'),true],[link.replace(encodeURIComponent(origin),encodeURIComponent('https://foreign.example')),true],[oauth.replace('provider=google','provider=github'),false],[origin+'/auth/v1/logout',true]])assert.throws(()=>googleAuthRedirect(String(url),origin,Boolean(linking)));
});

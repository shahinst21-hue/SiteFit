import test from 'node:test';
import assert from 'node:assert/strict';
import {publicIndexingEnabled,publicRobotsRules,pageMetadata,articleMetadata} from '../lib/seo.ts';
import {releasePolicy,commercialExecution,sourceCollectionAllowed} from '../lib/release/policy.ts';
import {localPosts} from '../lib/content/posts.ts';
import {isPublished} from '../lib/content/safety.ts';

const env={VERCEL_ENV:'production',SITE_URL:'https://sitefit.co.uk',SITEFIT_CONTROLLED_TRIAL_ENABLED:'1',
 SITEFIT_CONTROLLED_TRIAL_ID:'00000000-0000-4000-8000-000000000001',SITEFIT_PUBLIC_INDEXING_ENABLED:'1'};

test('explicit indexing approval works on the existing admitted Production origin without broad release activation',()=>{
 assert.equal(releasePolicy.productionApproved,false);
 assert.equal(publicIndexingEnabled(env),true);
 assert.equal(commercialExecution({...env,SITEFIT_COMMERCIAL_EXECUTION:'1'},'sitefit.co.uk'),false);
 assert.equal(sourceCollectionAllowed({...env,SITEFIT_COMMERCIAL_SOURCE_COLLECTION:'1'},'sitefit.co.uk'),false);
 for(const change of [{SITEFIT_PUBLIC_INDEXING_ENABLED:'0'},{SITEFIT_PUBLIC_INDEXING_ENABLED:undefined},
  {VERCEL_ENV:'preview'},{VERCEL_ENV:'development'},{SITE_URL:'https://other.invalid'},
  {SITE_URL:'https://sitefit.co.uk/path'},{SITE_URL:'http://localhost:3000'},
  {SITEFIT_CONTROLLED_TRIAL_ENABLED:'0'},{SITEFIT_CONTROLLED_TRIAL_ID:'invalid'}])
  assert.equal(publicIndexingEnabled({...env,...change}),false,JSON.stringify(change));
});

test('enabled public crawling retains every private path exclusion and disabled/Preview deny all',()=>{
 const rules=publicRobotsRules(env) as {userAgent:string;allow:string;disallow:string[]};
 assert.equal(rules.allow,'/');
 for(const path of ['/login','/account','/snapshots/','/reports/','/purchase/','/internal/','/dev/',
  '/auth/','/check-location','/preview/','/admin/','/api/'])assert.ok(rules.disallow.includes(path),path);
 assert.deepEqual(publicRobotsRules({...env,SITEFIT_PUBLIC_INDEXING_ENABLED:'0'}),{userAgent:'*',disallow:'/'});
 assert.deepEqual(publicRobotsRules({...env,VERCEL_ENV:'preview'}),{userAgent:'*',disallow:'/'});
});

test('actual public metadata and published articles become indexable while account-entry/legal pages stay noindex',()=>{
 const original=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));
 try{
  Object.assign(process.env,env);
  for(const path of ['/','/pricing','/how-it-works','/methodology','/contact','/blog','/sample-report'])
   assert.deepEqual(pageMetadata(path).robots,{index:true,follow:true},path);
  for(const path of ['/login','/check-location','/privacy','/terms'])
   assert.deepEqual(pageMetadata(path).robots,{index:false,follow:false},path);
  const article=localPosts.find(post=>isPublished(post));assert.ok(article);
  assert.deepEqual(articleMetadata(article).robots,{index:true,follow:true});
  process.env.VERCEL_ENV='preview';
  assert.deepEqual(pageMetadata('/').robots,{index:false,follow:false});
  assert.deepEqual(articleMetadata(article).robots,{index:false,follow:false});
 }finally{for(const[key,value]of Object.entries(original)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});

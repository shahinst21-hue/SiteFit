import { test } from "node:test";
import assert from "node:assert/strict";
import { webEvidenceSearch, estimatedSearchUsd, publicReference } from "../lib/web-evidence/search.ts";
import { addressMatch, finding, validateFinding, reconcileRent, projectDiscovery } from "../lib/web-evidence/model.ts";
import { verifyPublicCandidate } from "../lib/web-evidence/verify.ts";
import { reviewRent } from "../lib/web-evidence/rent.ts";
import { webDiscoveryRepository } from "../lib/web-evidence/repository.ts";
import { collectDiscovery } from "../lib/web-evidence/collect.ts";
import { context, ids } from "./fixtures/data/framework.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import type { CollectionContext } from "../lib/data/contracts.ts";
import { collectHistory } from "../lib/premises-history/collect.ts";
import { packetDigest } from "../lib/analysis/canonical.ts";

function discoveryContext(): CollectionContext {
  return {...context(),schemaVersion:2,selectedProperty:{...context().selectedProperty,resolution:"provider_verified"},
    enrichment:{schemaVersion:1,releases:Object.fromEntries(enrichmentReleaseKeys.map(k=>[k,ids.release])) as EnrichmentInput["releases"],
      identity:{state:"matched",uprn:"123456789",point:{latitude:51.5,longitude:-.1,crs:"EPSG:4326",precision:"building",source:"os-open-uprn"},
        coordinateBasis:"address_building_not_entrance",method:"exact_selected_address_components",retrievedAt:"2026-10-09T12:00:00Z",
        selectedParts:{primary:"33",secondary:"Ground Floor and Basement",street:"Broadway Market",town:"London",postcode:"E8 4PH"},observedCredits:10,missingReason:null}}};
}

test("web discovery is explicit, one dispatch, sourced, private and bounded", async () => {
  let calls = 0;
  const provider = webEvidenceSearch({ enabled: true, approvedUsd: .5, key: "sk-synthetic-not-a-credential", fetch: async (url, init) => {
    calls++; assert.equal(url, "https://api.openai.com/v1/responses");
    const request = JSON.parse(String(init?.body));
    assert.equal(request.max_tool_calls, 1); assert.equal(request.max_output_tokens, 512); assert.equal(request.store, false);
    assert.equal(request.tools[0].search_context_size, "low"); assert.equal(request.tools[0].return_token_budget, "default");
    assert.doesNotMatch(request.input, /ownerId|uprn|guest|email/);
    return Response.json({ model: "gpt-6.1-sol", status: "completed", usage: { input_tokens: 1000, output_tokens: 100 }, output: [
      { type: "web_search_call", action: { sources: [{ url: "https://example.org/listing" }] } },
      { type: "message", content: [{ type: "output_text", text: JSON.stringify({ candidates: [{ url: "https://example.org/listing", proposedFact: "A synthetic candidate, not verified evidence." }] }) }] },
    ] });
  } });
  const result = await provider.discover("10 Synthetic Road London E8 4PH");
  assert.equal(result.receipt.estimatedUsd, .013); assert.equal(result.candidates.length, 1);
  await assert.rejects(provider.discover("10 Synthetic Road London E8 4PH"), /dispatch_limit/); assert.equal(calls, 1);
});
test("failed requests consume dispatch and disabled discovery makes no request", async () => {
  let calls = 0; const fetcher: typeof fetch = async () => { calls++; throw new Error("private upstream detail"); };
  const off = webEvidenceSearch({ enabled: false, approvedUsd: .5, fetch: fetcher });
  await assert.rejects(off.discover("10 Synthetic Road"), /disabled/); assert.equal(calls, 0);
  const on = webEvidenceSearch({ enabled: true, approvedUsd: .5, key: "sk-synthetic", fetch: fetcher });
  await assert.rejects(on.discover("10 Synthetic Road"), /provider_unavailable/);
  await assert.rejects(on.discover("10 Synthetic Road"), /dispatch_limit/); assert.equal(calls, 1);
});
test("unsafe references and address prompt payloads fail closed; long context pricing is explicit", async () => {
  for (const url of ["http://example.org", "https://localhost/", "https://127.0.0.1/", "https://user:pass@example.org/", "https://example.org/?token=private"]) assert.equal(publicReference(url), false);
  const provider = webEvidenceSearch({ enabled: true, approvedUsd: .5, key: "sk-synthetic", fetch: async () => { throw new Error("must not dispatch"); } });
  await assert.rejects(provider.discover("person@example.org"), /invalid_request/);
  assert.equal(estimatedSearchUsd(128000, 512, 1), .27112);
  assert.equal(estimatedSearchUsd(300000, 100, 1), 1.2115);
});

test("unit matching never upgrades a building or neighbouring flat; only explicit floor aliases match", () => {
  const a = { primary: "33", street: "Broadway Market", postcode: "E8 4PH", unit: "Ground Floor and Basement" };
  assert.equal(addressMatch(a,{ ...a,unit:"Basement To Ground Floor" }), "exact_unit");
  assert.equal(addressMatch(a,{ ...a,unit:null }), "building_only");
  assert.equal(addressMatch({ ...a,unit:null },a), "building_only");
  assert.equal(addressMatch(a,{ ...a,unit:"First Floor" }), "rejected");
  assert.equal(addressMatch(a,{ ...a,primary:"33A" }), "rejected");
  assert.equal(addressMatch(a,{ ...a,postcode:"E8 4PJ" }), "rejected");
});
test("source verification ignores AI text and admits only independently read reusable facts", async () => {
  let calls = 0;
  const target = { primary:"33",street:"Broadway Market",postcode:"E8 4PH",unit:"Ground Floor and Basement" };
  const options = { now: () => new Date("2026-10-09T12:00:00Z"), fetch: (async (url, init) => {
    calls++; assert.equal(url,"https://api.ratings.food.gov.uk/Establishments/1225476");
    assert.equal(init?.redirect,"error"); assert.equal((init?.headers as Record<string,string>).Authorization,undefined);
    return Response.json({ FHRSID:1225476,BusinessName:"Synthetic Business",AddressLine1:"Basement To Ground Floor 33 Broadway Market",PostCode:"E8 4PH",RatingDate:"2025-03-05" });
  }) as typeof fetch };
  const unknown = await verifyPublicCandidate("https://example.org/agent",target,options);
  assert.equal(unknown.state,"rights_unknown"); assert.equal(calls,0);
  const result = await verifyPublicCandidate("https://ratings.food.gov.uk/business/1225476",target,options);
  assert.equal(result.state,"verified"); assert.equal(result.findings[0].match,"exact_unit");
  assert.equal(result.findings[0].eventDate,null); assert.equal(result.findings[0].publishedDate,null);
  assert.equal(result.findings[0].dateMeaning,"observation_only");
  assert.throws(() => validateFinding({ ...result.findings[0],value:"Invented prior occupant" }), /discovery_invalid/);
  assert.throws(() => finding({ ...result.findings[0], kind:"asking_rent",value:45000 }), /discovery_invalid/);
  assert.throws(() => finding({ ...result.findings[0],kind:"business_change" }),/discovery_invalid/);
  assert.throws(() => finding({ ...result.findings[0],sourceRecord:"469850" }),/discovery_invalid/);
  assert.throws(() => finding({ ...result.findings[0],eventDate:"2025-03-05",dateMeaning:"inspection_date" }),/discovery_invalid/);
  assert.throws(() => finding({ ...result.findings[0],sourceAddress:{...target,unit:null} }),/discovery_invalid/);
});
test("conflicting rent classes survive; the newest estimate is never preferred as actual unit rent", () => {
  const records = [
    { id:"old-contract",kind:"reported_contract_rent" as const,match:"exact_unit" as const,effectiveDate:null,sourceVerified:true },
    { id:"new-estimate",kind:"market_estimate" as const,match:"exact_unit" as const,effectiveDate:"2026-10-09",sourceVerified:true },
    { id:"wrong-unit",kind:"asking_rent" as const,match:"building_only" as const,effectiveDate:"2026-10-09",sourceVerified:true },
  ];
  const results = reconcileRent(records); assert.equal(results.length,3);
  assert.equal(results.some(r => r.exactUnitDatedAskingEvidence),false);
  assert.match(results[0].relevance,/not independently verified/); assert.match(results[1].relevance,/market estimate/);
});
test("commercial rent, floor area, lease/charges and dates stay explicit; unknown rights never enter storage", () => {
  const address = { primary:"33",street:"Broadway Market",postcode:"E8 4PH",unit:"Ground Floor and Basement" };
  const review = { address,url:"https://example.org/synthetic-listing",observedAt:"2026-10-09T12:00:00Z",publishedDate:null,effectiveDate:null,
    kind:"reported_contract_rent",annualGbp:45000,amountQualifier:"exact",areaSquareMetres:null,areaBasis:"unknown",leaseTerms:null,additionalCharges:null,vat:"unknown",reuse:"unknown" };
  const result=reviewRent(review,address); assert.equal(result.match,"exact_unit"); assert.equal(result.retainContent,false); assert.equal(result.currentRentEstablished,false);
  assert.equal(result.reason,"commercial_reuse_unconfirmed"); assert.equal("annualGbp" in result,false);
  assert.throws(() => reviewRent({ ...review,annualGbp:NaN },address), /rent_review_invalid/);
  assert.throws(() => reviewRent({ ...review,publishedDate:"2026-11-01" },address), /rent_review_invalid/);
  assert.equal(reviewRent({ ...review,address:{ ...address,unit:"First Floor" } },address).reason,"wrong_property_or_unit");
});
test("owned stored preparation replay invokes no source/search/context writes", async () => {
  const previousFetch=globalThis.fetch, previousUrl=process.env.SUPABASE_URL,previousKey=process.env.SUPABASE_SECRET_KEY;
  const owner="00000000-0000-4000-8000-000000000091", analysis="00000000-0000-4000-8000-000000000092", input="00000000-0000-4000-8000-000000000093";
  const bundle={schemaVersion:1,analysisId:analysis,inputId:input,propertyId:"00000000-0000-4000-8000-000000000094",contextDigest:"a".repeat(64),
    generatedAt:"2026-10-09T12:00:00Z",outcome:"unavailable",findings:[],references:[],sourceBindings:[],searchReceipt:null,limitations:["Synthetic unavailable proof."]};
  let requests=0,providerCalls=0;
  process.env.SUPABASE_URL="https://synthetic.supabase.co";process.env.SUPABASE_SECRET_KEY="sb_secret_synthetic";
  globalThis.fetch=async url=>{ requests++;const path=new URL(String(url)).pathname;
    if(path.endsWith("/authorise_sitefit_web_discovery"))return Response.json(null);
    assert.ok(path.endsWith("/read_sitefit_web_discovery"));return Response.json(bundle);
  };
  try {const result=await webDiscoveryRepository(owner).prepare(analysis,input,{discover:async()=>{providerCalls++;throw Error("must_not_dispatch");}});
    assert.deepEqual(result,bundle);assert.equal(requests,2);assert.equal(providerCalls,0);
  } finally {globalThis.fetch=previousFetch;
    if(previousUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=previousUrl;
    if(previousKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=previousKey;
  }
});

test("duplicate references spend one verification; later failure preserves independently admitted facts", async () => {
  let verified=0;
  const url="https://ratings.food.gov.uk/business/1225476";
  const receipt={model:"gpt-6.1-sol",promptVersion:"commercial-discovery-v1",generatedAt:"2026-10-09T12:00:00Z",packetDigest:"a".repeat(64),
    inputTokens:100,outputTokens:50,toolCalls:1,durationMs:100,estimatedUsd:.0107,priceVersion:"openai-standard-2026-10-09",store:false as const};
  const record=finding({kind:"business_name",value:"Synthetic operator",basis:"Synthetic source observation.",source:url,sourceRecord:"1225476",
    observedAt:"2026-10-09T12:00:00Z",publishedDate:null,eventDate:null,dateMeaning:"observation_only",match:"exact_unit",policyId:"fsa-ogl-v3",
    sourceAddress:{primary:"33",street:"Broadway Market",postcode:"E8 4PH",unit:"Ground Floor and Basement"}});
  const bundle=await collectDiscovery(discoveryContext(),[],{now:()=>new Date(receipt.generatedAt),
    discover:async()=>({receipt,candidates:[{url,proposedFact:"Untrusted proposal"},{url,proposedFact:"Duplicate"},{url:"https://example.org/failed",proposedFact:"Failed"}]}),
    verify:async candidate=>{verified++;if(candidate!==url)throw Error("private error must not survive");return {url,state:"verified",findings:[record]};}});
  assert.equal(verified,2);assert.equal(bundle.findings.length,1);assert.equal(bundle.outcome,"success");
  assert.ok(!JSON.stringify(bundle).includes("private error"));assert.equal(projectDiscovery(bundle,null).rent.state,"unknown");
  const ineligible=discoveryContext();ineligible.region.eligible=false;
  let calls=0;const unavailable=await collectDiscovery(ineligible,[],{discover:async()=>{calls++;throw Error("must not dispatch");}});
  assert.equal(unavailable.outcome,"unavailable");assert.equal(calls,0);
});

test("fresh paid preparation binds source checksums and persists admitted evidence; subsequent replay is stored-only", async () => {
  const oldFetch=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SECRET_KEY;
  const c=discoveryContext(),owner="00000000-0000-4000-8000-000000000091";
  let saved:unknown=null,searches=0,writes=0;
  process.env.SUPABASE_URL="https://synthetic.supabase.co";process.env.SUPABASE_SECRET_KEY="sb_secret_synthetic";
  globalThis.fetch=async(url,init)=>{
    const path=new URL(String(url)).pathname;
    if(path.endsWith("/authorise_sitefit_web_discovery"))return Response.json(null);
    if(path.endsWith("/read_sitefit_web_discovery"))return Response.json(saved);
    if(path.endsWith("/analysis_inputs"))return Response.json({resolved_context:c});
    if(path.endsWith("/data_snapshots"))return Response.json([]);
    assert.ok(path.endsWith("/freeze_sitefit_web_discovery"));writes++;
    const params=JSON.parse(String(init?.body));assert.equal(params.p_owner,owner);assert.equal(params.p_analysis,c.analysisId);
    assert.deepEqual(JSON.parse(params.p_context_canonical),c);saved=params.p_bundle;return Response.json(saved);
  };
  try {
    const options={discover:async()=>{searches++;return {candidates:[{url:"https://ratings.food.gov.uk/business/1225476",proposedFact:"Never copy this proposal"}],
      receipt:{model:"gpt-6.1-sol",promptVersion:"commercial-discovery-v1",generatedAt:"2026-10-09T12:00:00Z",packetDigest:"a".repeat(64),
        inputTokens:100,outputTokens:50,toolCalls:1,durationMs:100,estimatedUsd:.0107,priceVersion:"openai-standard-2026-10-09",store:false as const}};},
      verify:async(url:string,target:Parameters<typeof verifyPublicCandidate>[1])=>verifyPublicCandidate(url,target,{fetch:async()=>Response.json({FHRSID:1225476,BusinessName:"Synthetic operator",AddressLine1:"Basement To Ground Floor 33 Broadway Market",PostCode:"E8 4PH"})})};
    const repository=webDiscoveryRepository(owner),first=await repository.prepare(c.analysisId,c.inputId,options);
    const second=await repository.prepare(c.analysisId,c.inputId,options);
    assert.equal(first.findings.length,1);assert.equal(first.findings[0].match,"exact_unit");assert.deepEqual(first,second);
    assert.equal(searches,1);assert.equal(writes,1);assert.ok(!JSON.stringify(first).includes("Never copy"));
  } finally {globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;
    if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;}
});

test("stored history and discovery remain separate, context-bound and immutable during projection", async () => {
  const c=discoveryContext();c.region.eligible=false;
  let calls=0;
  const history=await collectHistory(c,[],{fetcher:async()=>{calls++;throw Error("must_not_dispatch");}});
  const bundle=await collectDiscovery(c,[],{discover:async()=>{calls++;throw Error("must_not_dispatch");}});
  const original=packetDigest(history),view=projectDiscovery(bundle,history);
  assert.equal(view.historyDigest,original);assert.deepEqual(view.premisesEvents,history.events);
  assert.equal(packetDigest(history),original);assert.equal(calls,0);assert.equal(view.rent.automaticFinancialAssumption,false);
  assert.throws(()=>projectDiscovery(bundle,{...history,inputId:"00000000-0000-4000-8000-000000000096"}),/discovery_history_context_invalid/);
});

import assert from "node:assert/strict";
import { publicPages } from "../lib/site-config.ts";
import { localPosts } from "../lib/content/posts.ts";
import { isPublished } from "../lib/content/safety.ts";
import { reportPages } from "../lib/report-dashboard/display.ts";
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {seller} from '../lib/legal/seller.ts';
import {legalPublicationReady,publicSeller} from '../lib/legal/publication.ts';
import {formationRule,deliveryCommitment} from '../lib/legal/policy-text.ts';

const base = new URL(process.argv[2] ?? "http://127.0.0.1:3000");
if (
  !["http:", "https:"].includes(base.protocol) ||
  base.username ||
  base.password ||
  base.search ||
  base.hash
)
  throw new Error(
    "Provide a site origin, never credentials or a query string.",
  );
const posts = localPosts.filter((post) => isPublished(post));
const indexingMode = process.argv[3];
if (indexingMode !== undefined && !["indexed", "noindex"].includes(indexingMode))
  throw Error("Indexing verification mode must be indexed or noindex.");
const paths = [
  ...publicPages.map((page) => page.path),
  ...posts.map((post) => `/blog/${post.slug}`),
];
const titles = new Set<string>();
const links = new Set<string>();
const scripts = new Set<string>();
function assertSecurityHeaders(response: Response, route: string) {
  assert.equal(response.headers.get("x-content-type-options"), "nosniff", `${route}: MIME sniffing protection missing`);
  assert.equal(response.headers.get("x-frame-options"), "DENY", `${route}: framing protection missing`);
  const directives = (response.headers.get("content-security-policy") ?? "").split(";").map(value => value.trim());
  for (const required of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"])
    assert.ok(directives.includes(required), `${route}: required CSP directive missing: ${required}`);
}
async function get(path: string, manual = false) {
  const response = await fetch(new URL(path, base), {
    redirect: manual ? "manual" : "error",
    signal: AbortSignal.timeout(15000),
  });
  assertSecurityHeaders(response, path);
  return response;
}
for (const path of paths) {
  const response = await get(path);
  assert.equal(response.status, 200, `${path}: expected HTTP 200`);
  const html = await response.text();
  if (indexingMode) {
    const shouldIndex = indexingMode === "indexed" && !["/login", "/check-location", "/privacy", "/terms"].includes(path);
    const robotsMeta = html.match(/<meta name="robots" content="([^"]+)"/)?.[1]?.split(/,\s*/);
    assert.ok(robotsMeta?.includes(shouldIndex ? "index" : "noindex"), `${path}: incorrect indexing metadata`);
    assert.ok(robotsMeta?.includes(shouldIndex ? "follow" : "nofollow"), `${path}: incorrect follow metadata`);
    if (shouldIndex) assert.doesNotMatch(response.headers.get("x-robots-tag") ?? "", /noindex/i, `${path}: public indexing blocked by header`);
  }
  for (const match of html.matchAll(/<script\b[^>]*src="([^"]+)"/g)) {
    const resource = new URL(match[1].replaceAll("&amp;", "&"), base);
    assert.equal(resource.origin, base.origin, `${path}: unexpected external script in initial HTML`);
    scripts.add(resource.pathname + resource.search);
  }
  if(!legalPublicationReady()){
    if(['/terms','/privacy','/contact'].includes(path))assert.ok(html.includes(seller.address),path+': approved seller address missing');
    else assert.ok(!html.includes(seller.address.split(',')[0]),path+': seller address outside intended legal/contact locations');
    if(['/terms','/privacy'].includes(path)){
      assert.ok(html.includes(publicSeller.name)&&html.includes(publicSeller.tradingName),path+': public seller identity missing');
      assert.match(html,/Purchases are currently unavailable/);
      assert.ok(!html.includes(formationRule)&&!html.includes(deliveryCommitment),path+': unpublished contract wording exposed');
      assert.doesNotMatch(html,/Prelaunch review version|sitefit-sale-v1-20261016-review/);
    }
  }
  assert.doesNotMatch(
    html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]*>/g, " "),
    /early preview|development preview|London first|reports are not available yet|coming soon|prototype|feature unavailable/i,
    path + ": obsolete customer wording",
  );
  if (path === "/sample-report") {
    assert.match(html,/data-presentation="public-sample"/);
    for(const section of reportPages)assert.ok(html.includes(`?section=${section.key}`),`Sample navigation missing ${section.key}`);
    assert.match(html,/Conditional shortlist/);
    assert.doesNotMatch(html,/class="dw-download"|Download sample PDF|How this sample score is calculated/);
    for(const path of ['/samples/public-sample-v1/full-report.pdf','/samples/public-sample-v1/customer-context.pdf'])assert.equal((await get(path)).status,404,'Sample exports must not be available');
  }
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert.ok(title && !titles.has(title), `${path}: missing or duplicate title`);
  titles.add(title);
  assert.equal(
    (html.match(/<h1(?:\s|>)/g) ?? []).length,
    1,
    `${path}: expected one H1`,
  );
  assert.match(
    html,
    /<html[^>]*lang="en-GB"/,
    `${path}: missing document language`,
  );
  assert.match(
    html,
    /<meta name="description" content="[^"]+"/,
    `${path}: missing description`,
  );
  assert.match(
    html,
    /<link rel="canonical" href="https?:\/\/[^"]+"/,
    `${path}: missing absolute canonical`,
  );
  assert.match(
    html,
    /<meta property="og:image" content="[^"]+"/,
    `${path}: missing social image`,
  );
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    if (match[1].startsWith("/")) links.add(match[1].split("#")[0]);
  }
  if (path.startsWith("/blog/")) {
    const raw = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    )?.[1];
    assert.ok(raw, `${path}: missing JSON-LD`);
    const data = JSON.parse(raw);
    assert.equal(data["@type"], "BlogPosting");
    assert.ok(data.datePublished && data.author?.name && data.publisher?.name);
    assert.match(html, /<meta property="og:type" content="article"/);
    assert.match(
      html,
      /<article\b/,
      `${path}: expected server-rendered article`,
    );
  }
}
for (const link of links)
  assert.equal((await get(link)).status, 200, `Broken internal link: ${link}`);
for (const script of scripts) {
  const response = await get(script);
  assert.equal(response.status, 200, `Unavailable application script: ${script}`);
  assert.match(response.headers.get("content-type") ?? "", /(?:text|application)\/javascript/, `${script}: expected JavaScript MIME type`);
  await response.arrayBuffer();
}
for (const path of ["/missing-public-page", "/blog/missing-article"]) {
  const response = await get(path);
  assert.equal(response.status, 404, `${path}: expected HTTP 404`);
  assert.match(await response.text(), /noindex/);
}
const xml = await (await get("/sitemap.xml")).text();
assert.ok(
  xml.includes("/sample-report"),
  "Sample Report missing from public sitemap",
);
const account = await get("/account", true);
assert.equal(
  account.status,
  307,
  "Anonymous account access must redirect before streaming",
);
assert.equal(
  new URL(account.headers.get("location")!, base).pathname,
  "/login",
);
const callback = await get(
  "/auth/callback?error=denied&error_description=untrusted-provider-error&next=https://example.invalid",
  true,
);
assert.equal(callback.status, 303);
assert.equal(
  new URL(callback.headers.get("location")!, base).pathname,
  "/login",
);
assert.ok(
  !(callback.headers.get("location") ?? "").includes(
    "untrusted-provider-error",
  ),
);
assert.match(callback.headers.get("cache-control") ?? "", /no-store/);
const confirm = await get("/auth/confirm");
assert.equal(confirm.status, 200);
assert.match(await confirm.text(), /Request a new sign-in link/);
for (const post of posts)
  assert.ok(
    xml.includes(`/blog/${post.slug}`),
    "Published article missing from sitemap",
  );
assert.ok(!xml.includes("/login") && !xml.includes("/check-location"));
const robots = await (await get("/robots.txt")).text();
assert.match(robots, /User-Agent: \*/);
assert.match(robots, /Sitemap:/);
if (indexingMode === "indexed") {
  assert.match(robots, /^Allow: \/$/m);
  assert.doesNotMatch(robots, /^Disallow: \/$/m);
  for (const path of ["/login", "/account", "/reports/", "/snapshots/", "/purchase/", "/internal/", "/dev/", "/auth/", "/check-location", "/preview/", "/admin/", "/api/"])
    assert.ok(robots.split(/\r?\n/).includes(`Disallow: ${path}`), `${path}: private crawl exclusion missing`);
} else if (indexingMode === "noindex") assert.match(robots, /^Disallow: \/$/m);
const image = await get("/social-image");
assert.equal(image.status, 200);
assert.match(image.headers.get("content-type") ?? "", /image\/png/);
const bytes = Buffer.from(await image.arrayBuffer());
assert.ok(bytes.length > 1000);
assert.equal(bytes.readUInt32BE(16), 1200);
assert.equal(bytes.readUInt32BE(20), 630);
// Address route boundaries only: no valid paid lookup or live key in normal CI.
for (const operation of ["lookup", "search", "resolve", "manual"]) {
  const route = new URL(`/api/addresses/${operation}`, base);
  const unsupported = await fetch(route, {
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  assertSecurityHeaders(unsupported, route.pathname);
  assert.equal(unsupported.status, 405);
  const invalid = await fetch(route, {
    method: "POST",
    headers: { origin: route.origin, "content-type": "application/json" },
    body: "{}",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  assertSecurityHeaders(invalid, route.pathname);
  assert.equal(invalid.status, 400);
  assert.match(invalid.headers.get("cache-control") ?? "", /no-store/);
  const crossOrigin = await fetch(route, {
    method: "POST",
    headers: {
      origin: "https://foreign.invalid",
      "content-type": "application/json",
    },
    body: "{}",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  assertSecurityHeaders(crossOrigin, route.pathname);
  assert.equal(crossOrigin.status, 403);
}
// Recovery must never execute via GET or a cross-site POST, including keyless builds.
for(const recoveryPath of ['/api/analyses/recover','/api/reports/recover']){
const recoveryURL=new URL(recoveryPath,base);
const recoveryGet=await fetch(recoveryURL,{redirect:'error',signal:AbortSignal.timeout(10000)});
assert.equal(recoveryGet.status,405);assertSecurityHeaders(recoveryGet,recoveryURL.pathname);
const recoveryCross=await fetch(recoveryURL,{method:'POST',headers:{origin:'https://foreign.invalid','content-type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(10000)});
assert.equal(recoveryCross.status,403);assert.match(recoveryCross.headers.get('cache-control')??'',/no-store/);
assertSecurityHeaders(recoveryCross,recoveryURL.pathname);
}
if(!legalPublicationReady()&&['localhost','127.0.0.1','[::1]'].includes(base.hostname)){
  const root=path.resolve('.next/static');
  const assets=(await readdir(root,{recursive:true})).filter(name=>/\.(?:js|map)$/.test(name));
  assert.ok(assets.length,'Built client assets missing for publication boundary verification');
  for(const file of assets){const text=await readFile(path.join(root,file),'utf8');assert.ok(!text.includes(seller.address)&&!text.includes(seller.address.split(',')[0]),'Private seller address in a public client asset');assert.ok(!text.includes(formationRule)&&!text.includes(deliveryCommitment),'Unpublished contract wording in a public client asset');}
}
console.log(
  `PASS: ${paths.length} public pages/articles, ${links.size} internal paths, ${scripts.size} same-origin scripts, security headers on pages/assets/redirects/404s/API errors, metadata, JSON-LD, sitemap, robots, social image, public legal/client-asset privacy and four safe address-route boundaries.`,
);

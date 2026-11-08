import assert from "node:assert/strict";
import { publicPages } from "../lib/site-config.ts";
import { localPosts } from "../lib/content/posts.ts";
import { isPublished } from "../lib/content/safety.ts";

// Read-only HTTP checks: no consent, analysis, payment or provider requests.
const base = new URL(process.argv[2] ?? "http://127.0.0.1:3000");
assert.ok(["http:", "https:"].includes(base.protocol) && !base.username && !base.password && base.pathname === "/" && !base.search && !base.hash);
const posts = localPosts.filter(post => isPublished(post));
const routes = [...publicPages.map(page => page.path), ...posts.map(post => `/blog/${post.slug}`)];
const canonicals = new Map<string, string>();
for (const route of routes) {
  const response = await fetch(new URL(route, base), { redirect: "error", signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, route);
  const html = await response.text();
  const canonicalsOnPage = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
  assert.equal(canonicalsOnPage.length, 1, `${route}: exactly one canonical`);
  const canonical = new URL(canonicalsOnPage[0][1]);
  assert.equal(canonical.pathname, route, `${route}: canonical path`);
  assert.ok(!canonical.search && !canonical.hash, `${route}: query-free canonical`);
  canonicals.set(route, canonical.href);
  assert.ok(!html.includes("<meta http-equiv=\"refresh\""), `${route}: unexpected meta refresh`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) assert.match(image[0], /\balt="[^"]*"/, `${route}: image alt attribute`);
  const data = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  for (const item of data) assert.equal(item["@context"], "https://schema.org", `${route}: schema context`);
  if (route === "/") {
    assert.equal(data.length, 1, "Homepage must contain one site identity graph");
    const graph = data[0]?.["@graph"];
    assert.ok(graph, "Homepage graph must be in rendered HTML");
    assert.equal(graph.length, 2, "Exactly one Website and Organization entity");
    assert.equal(new Set(graph.map((item: Record<string, unknown>) => item["@id"])).size, 2);
    const website = graph.find((item: Record<string, unknown>) => item["@type"] === "WebSite");
    const organization = graph.find((item: Record<string, unknown>) => item["@type"] === "Organization");
    assert.equal(website.name, "SiteFit");
    assert.equal(website.url, canonical.href);
    assert.equal(organization.url, canonical.href);
    assert.equal(website.publisher["@id"], organization["@id"]);
  }
  if (route.startsWith("/blog/")) {
    assert.equal(data.filter(item => item["@type"] === "BlogPosting").length, 1);
    assert.equal(data.filter(item => item["@type"] === "BreadcrumbList").length, 1);
    const article = data.find(item => item["@type"] === "BlogPosting");
    const breadcrumb = data.find(item => item["@type"] === "BreadcrumbList");
    assert.equal(article.mainEntityOfPage["@id"], canonical.href);
    assert.equal(breadcrumb.itemListElement.length, 2);
    assert.equal(breadcrumb.itemListElement[0].item, new URL("/blog", canonical).href);
    assert.equal(breadcrumb.itemListElement[1].item, canonical.href);
    assert.equal(breadcrumb.itemListElement[1].name, article.headline);
  }
}
const sitemap = await fetch(new URL("/sitemap.xml", base), { signal: AbortSignal.timeout(15000) });
assert.equal(sitemap.status, 200);
const locations = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const excluded = ["/login", "/check-location", "/privacy", "/terms"];
assert.deepEqual(new Set(locations), new Set(routes.filter(route => !excluded.includes(route)).map(route => canonicals.get(route))));
assert.equal(locations.length, new Set(locations).size, "Duplicate sitemap URL");
console.log(`PASS: ${routes.length} routes: canonical uniqueness/path, JSON-LD syntax and entity relationships, image alt attributes, exact public sitemap membership.`);

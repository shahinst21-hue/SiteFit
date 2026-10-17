import assert from "node:assert/strict";
const base = new URL(process.argv[2] ?? "http://127.0.0.1:3000");
if (base.username || base.password || base.search || base.hash || !["http:", "https:"].includes(base.protocol)) throw Error("Provide a site origin");
const enabled = process.argv[3] === "enabled";
const url = new URL("/api/campaign", base);
const get = await fetch(url); assert.equal(get.status, 200); assert.match(get.headers.get("cache-control") ?? "", /no-store/);
assert.equal(get.headers.get("set-cookie"), null); assert.equal((await get.json()).enabled, enabled);
const post = (body: object, origin = base.origin, cookie?: string) => fetch(url, { method: "POST",
  headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
assert.equal((await post({ action: "accept", campaign: "campaign-01" }, "https://foreign.invalid")).status, 403);
assert.equal((await post({ action: "accept", campaign: "private address" })).status, 400);
assert.equal((await post({ action: "accept", campaign: "campaign-01", privateData: "reject" })).status, 400);
const accepted = await post({ action: "accept", campaign: "campaign-01" });
assert.equal(accepted.status, enabled ? 200 : 503);
if (enabled) {
  const cookie = accepted.headers.get("set-cookie")!; assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=lax/i);
  assert.doesNotMatch(cookie, /Max-Age|Expires/i); // session-only, no invented retention period
  const saved = await fetch(url, { headers: { Cookie: cookie.split(";")[0] } }); assert.equal((await saved.json()).campaign, "campaign-01");
  const cleared = await post({ action: "clear" }); assert.equal(cleared.status, 200); assert.match(cleared.headers.get("set-cookie")!, /Max-Age=0/i);
}
const home = await (await fetch(new URL("/?sf_campaign=campaign-01&utm_term=private-input", base))).text();
assert.match(home, /COMMERCIAL LOCATION ANALYSIS/); assert.doesNotMatch(home, /UK-WIDE COMMERCIAL LOCATION DECISIONS/);
const canonical = home.match(/<link rel="canonical" href="([^"]+)"/)?.[1]; assert.ok(canonical); assert.equal(new URL(canonical).search, "");
const sitemap = await (await fetch(new URL("/sitemap.xml", base))).text();
assert.doesNotMatch(sitemap, /\/reports\/|\/purchase\/|\/snapshots\/|\/account|\/internal\/|\/dev\/|sf_campaign/);
for (const path of ["/reports/00000000-0000-4000-8000-000000000001", "/reports/00000000-0000-4000-8000-000000000001/pdf", "/purchase/confirmation", "/internal/support", "/account"]) {
  const response = await fetch(new URL(path, base), { redirect: "manual" });
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/); assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  if (response.status === 200 && !path.endsWith("/pdf")) {
    const html = await response.text();
    assert.match(html, /This page is not here\./, "Streamed denial must resolve to the existing not-found shell");
    assert.doesNotMatch(html, /data-testid="report-dashboard"|Current stored stage:/, "Anonymous response exposed report data");
  } else assert.notEqual(response.status, 200, "Anonymous private response must not expose a document");
}
console.log("Actual campaign consent/withdrawal, query-free canonical, sitemap and anonymous private indexing checks passed. No generation, source, payment or AI request.");

import assert from "node:assert/strict";
import { publicPages } from "../lib/site-config.ts";
import { localPosts } from "../lib/content/posts.ts";
import { isPublished } from "../lib/content/safety.ts";

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
const paths = [
  ...publicPages.map((page) => page.path),
  ...posts.map((post) => `/blog/${post.slug}`),
];
const titles = new Set<string>();
const links = new Set<string>();
async function get(path: string, manual = false) {
  return fetch(new URL(path, base), {
    redirect: manual ? "manual" : "error",
    signal: AbortSignal.timeout(15000),
  });
}
for (const path of paths) {
  const response = await get(path);
  assert.equal(response.status, 200, `${path}: expected HTTP 200`);
  const html = await response.text();
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
for (const path of ["/missing-public-page", "/blog/missing-article"]) {
  const response = await get(path);
  assert.equal(response.status, 404, `${path}: expected HTTP 404`);
  assert.match(await response.text(), /noindex/);
}
const xml = await (await get("/sitemap.xml")).text();
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
const image = await get("/social-image");
assert.equal(image.status, 200);
assert.match(image.headers.get("content-type") ?? "", /image\/png/);
const bytes = Buffer.from(await image.arrayBuffer());
assert.ok(bytes.length > 1000);
assert.equal(bytes.readUInt32BE(16), 1200);
assert.equal(bytes.readUInt32BE(20), 630);
console.log(
  `PASS: ${paths.length} public pages/articles, ${links.size} internal paths, metadata, JSON-LD, sitemap, robots, social image and 404s.`,
);

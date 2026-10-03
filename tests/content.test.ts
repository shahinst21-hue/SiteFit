import assert from "node:assert/strict";
import test from "node:test";
import { createLocalRepository } from "../lib/content/repository.ts";
import { localPosts } from "../lib/content/posts.ts";
import {
  readingMinutes,
  safeHref,
  serialiseJsonLd,
  validatePost,
} from "../lib/content/safety.ts";
import {
  articleCanonical,
  articleMetadata,
  blogPosting,
  pageMetadata,
  publicIndexingEnabled,
  websiteOrigin,
} from "../lib/seo.ts";
import { publicPages } from "../lib/site-config.ts";
const post = () => structuredClone(localPosts[0]!);
const now = () => new Date("2026-10-04T12:00:00Z");

test("repository handles zero, one and multiple posts and filters unpublished and future dates", async () => {
  assert.deepEqual(
    (await createLocalRepository([], now).listPublished()).posts,
    [],
  );
  assert.equal(
    (await createLocalRepository([post()], now).listPublished()).total,
    1,
  );
  const hidden = (["draft", "scheduled", "archived"] as const).map(
    (status, i) => ({
      ...post(),
      id: `hidden-${i}`,
      slug: `hidden-${i}`,
      status,
    }),
  );
  const future = {
    ...post(),
    id: "future",
    slug: "future",
    datePublished: "2099-01-01T00:00:00Z",
    dateModified: null,
  };
  const repository = createLocalRepository(
    [...localPosts, ...hidden, future],
    now,
  );
  assert.equal((await repository.listPublished()).total, 2);
  for (const item of [...hidden, future])
    assert.equal(await repository.getPublished(item.slug), null);
  assert.equal(await repository.getPublished("not-a-post"), null);
});
test("repository supports category, tags, pagination and related content without page coupling", async () => {
  const repository = createLocalRepository(localPosts, now);
  assert.equal(
    (
      await repository.listPublished({
        tag: "due-diligence",
        pageSize: 1,
        page: 2,
      })
    ).posts.length,
    1,
  );
  assert.equal(
    (await repository.listPublished({ category: "Research notes" })).posts[0]
      ?.id,
    "unknowns",
  );
  assert.equal((await repository.listPublished({ page: 100 })).posts.length, 0);
  assert.equal((await repository.related(localPosts[0]!))[0]?.id, "unknowns");
});
test("duplicate slugs and incomplete SEO or image metadata fail content validation", () => {
  assert.throws(
    () => createLocalRepository([post(), post()], now),
    /Duplicate slug/,
  );
  const missing = post();
  missing.seoDescription = "";
  missing.featuredImageAlt = "";
  assert.ok(validatePost(missing).includes("Required metadata missing"));
  assert.ok(validatePost(missing).includes("Invalid featured image"));
  assert.throws(() => createLocalRepository([missing], now));
  const canonical = post();
  canonical.canonicalUrl = "https://example.invalid/article?utm_source=test";
  assert.ok(
    validatePost(canonical).includes(
      "Canonical must not contain tracking queries or fragments",
    ),
  );
});
test("content links and CTA reject executable schemes, protocol-relative hosts and controls", () => {
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.invalid",
    "/\\evil.invalid",
    "https://user:pass@example.invalid",
    "https://example.invalid\n",
  ])
    assert.equal(safeHref(href), false, href);
  for (const href of [
    "/pricing",
    "/how-it-works#report",
    "https://example.invalid/guide",
    "#heading",
  ])
    assert.equal(safeHref(href), true, href);
  const unsafe = post();
  unsafe.cta = {
    label: "Click",
    href: "javascript:alert(1)",
    variant: "primary",
  };
  assert.ok(validatePost(unsafe).includes("Invalid CTA"));
  unsafe.content = [
    {
      type: "paragraph",
      content: [{ type: "link", text: "bad", href: "data:text/html,x" }],
    },
  ];
  assert.ok(validatePost(unsafe).includes("Unsafe content link"));
});
test("JSON-LD is truthful and script-safe, with stable canonical and publication metadata", () => {
  const item = post();
  item.title = "</script><script>alert(1)</script>";
  const data = blogPosting(item, "https://example.invalid");
  const encoded = serialiseJsonLd(data);
  assert.ok(!encoded.includes("</script>"));
  assert.deepEqual(JSON.parse(encoded), data);
  assert.equal(data["@type"], "BlogPosting");
  assert.equal(data.author["@type"], "Organization");
  assert.equal(
    data.mainEntityOfPage["@id"],
    `https://example.invalid/blog/${item.slug}`,
  );
  assert.ok(!("aggregateRating" in data));
  item.canonicalUrl = "https://example.invalid/original";
  assert.equal(articleCanonical(item), item.canonicalUrl);
  assert.equal(articleMetadata(item).description, item.seoDescription);
  assert.ok(readingMinutes(item) >= 1);
});
test("indexing requires explicit production origin; Preview stays noindex even with SITE_URL", () => {
  assert.equal(websiteOrigin({}), "http://localhost:3000");
  assert.equal(
    websiteOrigin({ VERCEL_URL: "preview.example.invalid" }),
    "https://preview.example.invalid",
  );
  assert.equal(
    publicIndexingEnabled({
      SITE_URL: "https://example.invalid",
      VERCEL_ENV: "preview",
    }),
    false,
  );
  assert.equal(
    publicIndexingEnabled({
      SITE_URL: "https://example.invalid",
      VERCEL_ENV: "production",
    }),
    true,
  );
  assert.equal(publicIndexingEnabled({ VERCEL_ENV: "production" }), false);
  assert.throws(() => websiteOrigin({ SITE_URL: "http://example.invalid" }));
  assert.throws(() =>
    websiteOrigin({ SITE_URL: "https://example.invalid/subpath" }),
  );
});
test("public pages have unique titles, descriptions and route-specific canonical metadata", () => {
  assert.equal(
    new Set(publicPages.map((page) => page.title)).size,
    publicPages.length,
  );
  assert.equal(
    new Set(publicPages.map((page) => page.description)).size,
    publicPages.length,
  );
  for (const page of publicPages) {
    assert.equal(pageMetadata(page.path).description, page.description);
    assert.ok(
      String(pageMetadata(page.path).alternates?.canonical).endsWith(page.path),
    );
  }
});

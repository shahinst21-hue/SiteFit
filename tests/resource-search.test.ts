import assert from "node:assert/strict";
import test from "node:test";
import { selectResources } from "../lib/content/search.ts";
const posts = [
  {
    id: "a",
    title: "Lease questions",
    excerpt: "A viewing checklist",
    category: "Before the lease",
    tags: ["landlord"],
    datePublished: "2026-10-03T00:00:00Z",
  },
  {
    id: "b",
    title: "Evidence matters",
    excerpt: "Interpreting sources",
    category: "Evidence",
    tags: ["limitations"],
    datePublished: "2026-10-04T00:00:00Z",
  },
];
test("Resource search combines all query terms and actual category without changing source order", () => {
  assert.deepEqual(
    selectResources(posts, "  VIEWING landlord ", "Before the lease").map(
      (p) => p.id,
    ),
    ["a"],
  );
  assert.equal(selectResources(posts, "viewing unknown").length, 0);
  assert.equal(selectResources(posts, "", "nonexistent").length, 0);
  assert.deepEqual(
    selectResources(posts).map((p) => p.id),
    ["b", "a"],
  );
  assert.deepEqual(
    posts.map((p) => p.id),
    ["a", "b"],
  );
  assert.deepEqual(
    selectResources(posts, "", "", "title").map((p) => p.id),
    ["b", "a"],
  );
});

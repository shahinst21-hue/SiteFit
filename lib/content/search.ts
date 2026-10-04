import type { BlogPost } from "./model.ts";
export type ResourceSummary = Pick<
  BlogPost,
  "id" | "title" | "excerpt" | "category" | "tags" | "datePublished"
>;
export function selectResources<T extends ResourceSummary>(
  posts: T[],
  query = "",
  category = "",
  sort = "recent",
): T[] {
  const terms = query
    .trim()
    .toLocaleLowerCase("en-GB")
    .split(/\s+/)
    .filter(Boolean);
  return posts
    .filter(
      (post) =>
        (!category || post.category === category) &&
        terms.every((term) =>
          [post.title, post.excerpt, post.category, ...post.tags]
            .join(" ")
            .toLocaleLowerCase("en-GB")
            .includes(term),
        ),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "en-GB")
        : Date.parse(b.datePublished!) - Date.parse(a.datePublished!),
    );
}

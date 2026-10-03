import type { BlogPost } from "./model.ts";
import { isPublished, validatePost } from "./safety.ts";

export type PostQuery = {
  category?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
};
export type PostPage = {
  posts: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
};
export interface ContentRepository {
  listPublished(query?: PostQuery): Promise<PostPage>;
  getPublished(slug: string): Promise<BlogPost | null>;
  related(post: BlogPost, limit?: number): Promise<BlogPost[]>;
}
export function createLocalRepository(
  posts: BlogPost[],
  now: () => Date = () => new Date(),
): ContentRepository {
  const seen = new Set<string>();
  for (const post of posts) {
    const errors = validatePost(post);
    if (seen.has(post.slug)) errors.push("Duplicate slug");
    if (errors.length)
      throw new Error(`Invalid local content ${post.id}: ${errors.join(", ")}`);
    seen.add(post.slug);
  }
  const published = () =>
    posts
      .filter((post) => isPublished(post, now()))
      .sort(
        (a, b) => Date.parse(b.datePublished!) - Date.parse(a.datePublished!),
      );
  return {
    async listPublished(query = {}) {
      const page =
        Number.isInteger(query.page) && query.page! > 0 ? query.page! : 1;
      const pageSize =
        Number.isInteger(query.pageSize) && query.pageSize! > 0
          ? Math.min(query.pageSize!, 50)
          : 12;
      const filtered = published().filter(
        (post) =>
          (!query.category || post.category === query.category) &&
          (!query.tag || post.tags.includes(query.tag)),
      );
      return {
        posts: filtered.slice((page - 1) * pageSize, page * pageSize),
        total: filtered.length,
        page,
        pageSize,
      };
    },
    async getPublished(slug) {
      return published().find((post) => post.slug === slug) ?? null;
    },
    async related(post, limit = 2) {
      return published()
        .filter(
          (other) =>
            other.slug !== post.slug &&
            (other.category === post.category ||
              other.tags.some((tag) => post.tags.includes(tag))),
        )
        .slice(0, limit);
    },
  };
}

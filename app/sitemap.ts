import type { MetadataRoute } from "next";
import { contentRepository } from "@/lib/content";
import { articleCanonical, absoluteUrl } from "@/lib/seo";
import { publicPages } from "@/lib/site-config";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = publicPages
    .filter(
      (page) =>
        !["/login", "/check-location", "/privacy", "/terms"].includes(
          page.path,
        ),
    )
    .map((page) => ({ url: absoluteUrl(page.path) }));
  const articles: MetadataRoute.Sitemap = [];
  let page = 1;
  while (true) {
    const result = await contentRepository.listPublished({
      page,
      pageSize: 50,
    });
    articles.push(
      ...result.posts.map((post) => ({
        url: articleCanonical(post),
        lastModified: post.dateModified ?? post.datePublished!,
        ...(post.featuredImage
          ? { images: [absoluteUrl(post.featuredImage.src)] }
          : {}),
      })),
    );
    if (page * result.pageSize >= result.total) break;
    page++;
  }
  return [...pages, ...articles];
}

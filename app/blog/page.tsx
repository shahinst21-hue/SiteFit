import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { PostCard } from "@/components/blog-content";
import { ResourceBrowser } from "@/components/resource-browser";
import { contentRepository } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/blog");
export default async function Blog() {
  const posts = [];
  let page = 1;
  let total: number;
  do {
    const result = await contentRepository.listPublished({
      page,
      pageSize: 50,
    });
    posts.push(...result.posts);
    total = result.total;
    page++;
  } while (posts.length < total);
  const featured = posts.find((p) => p.featured) ?? posts[0];
  return (
    <div className="page-wrap blog-index">
      <section className="resource-hero">
        <PageIntro
          eyebrow="SITEFIT RESOURCES"
          title="Build a clearer view of your next location."
        >
          <p>
            Practical guides to the evidence, questions and assumptions behind a
            commercial lease decision.
          </p>
          <Link href="/check-location" className="text-link">
            Put your next property in context ↗
          </Link>
        </PageIntro>
        {featured && <PostCard post={featured} featured />}
      </section>
      <ResourceBrowser
        items={posts.map(
          ({ id, title, excerpt, category, tags, datePublished, ...post }) => ({
            id,
            title,
            excerpt,
            category,
            tags,
            datePublished,
            card: (
              <PostCard
                post={{
                  id,
                  title,
                  excerpt,
                  category,
                  tags,
                  datePublished,
                  ...post,
                }}
              />
            ),
          }),
        )}
      />
      <div className="quiet-note">
        General guidance, not an assessment of a particular property. Articles
        do not replace professional advice.
      </div>
    </div>
  );
}

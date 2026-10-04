import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { PostCard } from "@/components/blog-content";
import { contentRepository } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/blog");
export default async function Blog() {
  const { posts } = await contentRepository.listPublished();
  const featured = posts.find((post) => post.featured) ?? posts[0];
  const recent = posts.filter((post) => post.slug !== featured?.slug);
  return (
    <div className="page-wrap blog-index">
      <PageIntro
        eyebrow="THE SITEFIT JOURNAL"
        title="Before the keys are yours."
      >
        <p>
          Practical reading for your next commercial space. Better questions,
          clearer evidence and the things still worth checking.
        </p>
      </PageIntro>
      {!featured ? (
        <section className="simple-panel">
          <h2>No published articles match this selection.</h2>
          <p>
            Read our methodology for guidance on location evidence and{" "}
            <Link href="/methodology" className="text-link">
              our approach to evidence
            </Link>
            .
          </p>
        </section>
      ) : (
        <>
          <PostCard post={featured} featured />
          {recent.length > 0 && (
            <section className="section-block">
              <p className="eyebrow">MORE FROM THE JOURNAL</p>
              <div className="post-grid">
                {recent.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
      <div className="quiet-note">
        General guidance, not an assessment of a particular property. Our
        articles do not replace professional advice.
      </div>
    </div>
  );
}

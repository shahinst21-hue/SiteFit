import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArticleCTA,
  BlogContent,
  ContentImage,
  PostCard,
} from "@/components/blog-content";
import { contentRepository } from "@/lib/content";
import { readingMinutes, serialiseJsonLd } from "@/lib/content/safety";
import { articleMetadata, blogPosting } from "@/lib/seo";
type ArticleProps = { params: Promise<{ slug: string }> };
export async function generateStaticParams() {
  const { posts } = await contentRepository.listPublished({ pageSize: 50 });
  return posts.map((post) => ({ slug: post.slug }));
}
export async function generateMetadata({ params }: ArticleProps) {
  const post = await contentRepository.getPublished((await params).slug);
  if (!post) notFound();
  return articleMetadata(post);
}
export default async function Article({ params }: ArticleProps) {
  const post = await contentRepository.getPublished((await params).slug);
  if (!post) notFound();
  const related = await contentRepository.related(post);
  return (
    <div className="page-wrap article-page">
      <Link href="/blog" className="text-link back-link">
        ← Back to Journal
      </Link>
      <header className="article-header">
        <p className="eyebrow">{post.category}</p>
        <h1>{post.title}</h1>
        <p className="article-excerpt">{post.excerpt}</p>
        <div className="article-meta">
          <span>By {post.author.name}</span>
          <time dateTime={post.datePublished!}>
            {new Date(post.datePublished!).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </time>
          <span>{readingMinutes(post)} min read</span>
          {post.dateModified !== post.datePublished && post.dateModified && (
            <time dateTime={post.dateModified}>
              Updated{" "}
              {new Date(post.dateModified).toLocaleDateString("en-GB", {
                timeZone: "UTC",
              })}
            </time>
          )}
        </div>
      </header>
      {post.featuredImage && (
        <figure className="article-featured-image">
          <ContentImage
            image={post.featuredImage}
            alt={post.featuredImageAlt}
            priority
          />
        </figure>
      )}
      <article className="article-column" aria-label={post.title}>
        <BlogContent blocks={post.content} />
        {post.cta && !post.content.some((block) => block.type === "cta") && (
          <ArticleCTA cta={post.cta} />
        )}
      </article>
      {related.length > 0 && (
        <section className="related-section">
          <h2>Keep reading</h2>
          <div className="post-grid">
            {related.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialiseJsonLd(blogPosting(post)) }}
      />
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import type {
  BlogPost,
  ContentBlock,
  ContentCTA,
  ImageAsset,
  Inline,
} from "@/lib/content/model";
import { safeHref } from "@/lib/content/safety";
import { Arrow } from "./ui";

export function ContentImage({
  image,
  alt,
  priority = false,
}: {
  image: ImageAsset;
  alt: string;
  priority?: boolean;
}) {
  // Remote assets use browser delivery until the chosen storage host has an explicit optimisation allowlist.
  return (
    <Image
      src={image.src}
      width={image.width}
      height={image.height}
      alt={alt}
      sizes="(max-width: 760px) 100vw, 760px"
      priority={priority}
      unoptimized={image.src.startsWith("https://")}
    />
  );
}
function ContentLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  if (!safeHref(href)) return <span>{children}</span>;
  return href.startsWith("https://") ? (
    <a href={href} rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href}>{children}</Link>
  );
}
function Inlines({ content }: { content: Inline[] }) {
  return (
    <>
      {content.map((item, index) =>
        item.type === "link" ? (
          <ContentLink href={item.href} key={index}>
            {item.text}
          </ContentLink>
        ) : (
          <span key={index}>
            {item.bold ? (
              <strong>
                {item.emphasis ? <em>{item.text}</em> : item.text}
              </strong>
            ) : item.emphasis ? (
              <em>{item.text}</em>
            ) : (
              item.text
            )}
          </span>
        ),
      )}
    </>
  );
}
export function ArticleCTA({ cta }: { cta: ContentCTA }) {
  return (
    <aside className="article-cta">
      {cta.heading && <h2>{cta.heading}</h2>}
      {cta.supportingText && <p>{cta.supportingText}</p>}
      <ContentLink href={cta.href}>
        <span
          className={`button ${cta.variant === "primary" ? "button-primary" : "button-secondary"}`}
        >
          {cta.label}
          <Arrow />
        </span>
      </ContentLink>
    </aside>
  );
}
export function BlogContent({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="prose article-body">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return block.level === 2 ? (
              <h2 key={index}>{block.text}</h2>
            ) : (
              <h3 key={index}>{block.text}</h3>
            );
          case "paragraph":
            return (
              <p key={index}>
                <Inlines content={block.content} />
              </p>
            );
          case "list":
            return block.ordered ? (
              <ol key={index}>
                {block.items.map((item, i) => (
                  <li key={i}>
                    <Inlines content={item} />
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={index}>
                {block.items.map((item, i) => (
                  <li key={i}>
                    <Inlines content={item} />
                  </li>
                ))}
              </ul>
            );
          case "image":
            return (
              <figure key={index}>
                <ContentImage image={block.image} alt={block.alt} />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
          case "quote":
            return (
              <blockquote key={index}>
                <p>{block.text}</p>
                {block.attribution && <cite>{block.attribution}</cite>}
              </blockquote>
            );
          case "callout":
            return (
              <aside className="article-callout" key={index}>
                <h3>{block.heading}</h3>
                <p>
                  <Inlines content={block.content} />
                </p>
              </aside>
            );
          case "table":
            return (
              <div
                key={index}
                className="table-scroll"
                role="region"
                aria-label={block.caption}
                tabIndex={0}
              >
                <table>
                  <caption>{block.caption}</caption>
                  <thead>
                    <tr>
                      {block.headers.map((header, i) => (
                        <th key={i} scope="col">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "cta":
            return <ArticleCTA key={index} cta={block.cta} />;
        }
      })}
    </div>
  );
}
export function PostCard({
  post,
  featured = false,
}: {
  post: BlogPost;
  featured?: boolean;
}) {
  return (
    <article className={featured ? "post-card featured-post" : "post-card"}>
      {post.featuredImage && (
        <Link href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true">
          <ContentImage
            image={post.featuredImage}
            alt={post.featuredImageAlt}
            priority={featured}
          />
        </Link>
      )}
      <div className="post-card-copy">
        <p className="eyebrow">{post.category}</p>
        <h2>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p>{post.excerpt}</p>
        <div className="post-card-bottom">
          <time dateTime={post.datePublished!}>
            {new Date(post.datePublished!).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </time>
          <Link
            href={`/blog/${post.slug}`}
            className="text-link"
            aria-label={`Read article: ${post.title}`}
          >
            Read article <Arrow />
          </Link>
        </div>
      </div>
    </article>
  );
}

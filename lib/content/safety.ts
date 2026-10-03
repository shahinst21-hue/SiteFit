import type { BlogPost, ContentBlock, ImageAsset } from "./model.ts";

export function safeHref(href: string): boolean {
  if (
    /\s|\\/.test(href) ||
    [...href].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    return false;
  if (/^\/(?!\/)/.test(href) || /^#[a-z0-9-]+$/i.test(href)) return true;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function validImage(image: ImageAsset) {
  return (
    safeHref(image.src) &&
    !image.src.startsWith("#") &&
    Number.isInteger(image.width) &&
    image.width > 0 &&
    Number.isInteger(image.height) &&
    image.height > 0
  );
}
export function isPublished(post: BlogPost, now = new Date()) {
  return (
    post.status === "published" &&
    post.datePublished !== null &&
    Number.isFinite(Date.parse(post.datePublished)) &&
    Date.parse(post.datePublished) <= now.getTime()
  );
}
export function validatePost(post: BlogPost): string[] {
  const errors: string[] = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug))
    errors.push("Invalid slug");
  for (const field of [
    post.id,
    post.title,
    post.excerpt,
    post.seoTitle,
    post.seoDescription,
    post.ogTitle,
    post.ogDescription,
    post.author.name,
    post.category,
  ])
    if (!field.trim()) errors.push("Required metadata missing");
  if (!post.content.length) errors.push("Empty article");
  if (
    post.status === "published" &&
    (!post.datePublished || !Number.isFinite(Date.parse(post.datePublished)))
  )
    errors.push("Publication date required");
  if (
    post.dateModified &&
    (!Number.isFinite(Date.parse(post.dateModified)) ||
      (post.datePublished &&
        Date.parse(post.dateModified) < Date.parse(post.datePublished)))
  )
    errors.push("Invalid modification date");
  if (post.canonicalUrl) {
    if (
      !safeHref(post.canonicalUrl) ||
      !post.canonicalUrl.startsWith("https://")
    )
      errors.push("Invalid canonical");
    else {
      const url = new URL(post.canonicalUrl);
      if (url.search || url.hash)
        errors.push("Canonical must not contain tracking queries or fragments");
    }
  }
  if (post.author.url && !safeHref(post.author.url))
    errors.push("Invalid author URL");
  if (
    post.featuredImage &&
    (!validImage(post.featuredImage) || !post.featuredImageAlt.trim())
  )
    errors.push("Invalid featured image");
  if (post.ogImage && !validImage(post.ogImage))
    errors.push("Invalid social image");
  if (post.cta && (!post.cta.label.trim() || !safeHref(post.cta.href)))
    errors.push("Invalid CTA");
  for (const block of post.content) {
    if (
      block.type === "image" &&
      (!validImage(block.image) || !block.alt.trim())
    )
      errors.push("Invalid inline image");
    if (
      block.type === "cta" &&
      (!block.cta.label.trim() || !safeHref(block.cta.href))
    )
      errors.push("Invalid CTA");
    if (
      block.type === "paragraph" ||
      block.type === "callout" ||
      block.type === "list"
    ) {
      const inlines =
        block.type === "list" ? block.items.flat() : block.content;
      if (
        inlines.some(
          (inline) => inline.type === "link" && !safeHref(inline.href),
        )
      )
        errors.push("Unsafe content link");
    }
    if (
      block.type === "table" &&
      (!block.headers.length ||
        block.rows.some((row) => row.length !== block.headers.length))
    )
      errors.push("Invalid table");
  }
  return errors;
}
export function blockText(block: ContentBlock): string {
  switch (block.type) {
    case "heading":
    case "quote":
      return block.text;
    case "paragraph":
      return block.content.map((item) => item.text).join(" ");
    case "callout":
      return `${block.heading} ${block.content.map((item) => item.text).join(" ")}`;
    case "list":
      return block.items
        .flat()
        .map((item) => item.text)
        .join(" ");
    case "table":
      return [block.caption, ...block.headers, ...block.rows.flat()].join(" ");
    case "image":
      return block.caption ?? "";
    case "cta":
      return [block.cta.heading, block.cta.supportingText, block.cta.label]
        .filter(Boolean)
        .join(" ");
  }
}
export function readingMinutes(post: BlogPost) {
  return Math.max(
    1,
    Math.ceil(
      post.content.map(blockText).join(" ").trim().split(/\s+/).length / 200,
    ),
  );
}
export function serialiseJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

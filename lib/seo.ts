import type { Metadata } from "next";
import type { BlogPost } from "./content/model.ts";
import { publicPages, site } from "./site-config.ts";

export function websiteOrigin(
  env: Record<string, string | undefined> = process.env,
) {
  const candidate =
    env.SITE_URL ||
    (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3000");
  const url = new URL(candidate);
  if (
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "SITE_URL must be an HTTPS origin (HTTP localhost allowed for development).",
    );
  return url.origin;
}
export function publicIndexingEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env.VERCEL_ENV === "production" &&
    Boolean(env.SITE_URL) &&
    new URL(websiteOrigin(env)).protocol === "https:"
  );
}
export function absoluteUrl(path: string, origin = websiteOrigin()) {
  return new URL(path, origin).toString();
}

export function pageMetadata(path: string): Metadata {
  const page = publicPages.find((page) => page.path === path);
  if (!page) throw new Error("Missing public page metadata");
  const index =
    publicIndexingEnabled() &&
    !["/login", "/check-location", "/privacy", "/terms"].includes(path);
  const image = {
    url: absoluteUrl("/social-image"),
    width: 1200,
    height: 630,
    alt: `${site.name}: ${site.tagline}`,
  };
  return {
    title: { absolute: `${page.title} | ${site.name}` },
    description: page.description,
    alternates: { canonical: absoluteUrl(path) },
    robots: { index, follow: index },
    openGraph: {
      type: "website",
      title: `${page.title} | ${site.name}`,
      description: page.description,
      url: absoluteUrl(path),
      siteName: site.name,
      locale: "en_GB",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.title} | ${site.name}`,
      description: page.description,
      images: [image],
    },
  };
}

export function articleCanonical(post: BlogPost, origin = websiteOrigin()) {
  return post.canonicalUrl || absoluteUrl(`/blog/${post.slug}`, origin);
}
export function articleMetadata(post: BlogPost): Metadata {
  const canonical = articleCanonical(post);
  const image = post.ogImage;
  const images = [
    {
      url: absoluteUrl(image?.src ?? "/social-image"),
      width: image?.width ?? 1200,
      height: image?.height ?? 630,
      alt: image
        ? post.featuredImageAlt || post.title
        : `${site.name}: ${site.tagline}`,
    },
  ];
  return {
    title: { absolute: `${post.seoTitle} | ${site.name}` },
    description: post.seoDescription,
    alternates: { canonical },
    robots: { index: publicIndexingEnabled(), follow: publicIndexingEnabled() },
    openGraph: {
      type: "article",
      title: post.ogTitle,
      description: post.ogDescription,
      url: canonical,
      siteName: site.name,
      locale: "en_GB",
      publishedTime: post.datePublished!,
      modifiedTime: post.dateModified ?? undefined,
      authors: [post.author.name],
      tags: post.tags,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: post.ogTitle,
      description: post.ogDescription,
      images,
    },
  };
}
export function blogPosting(post: BlogPost, origin = websiteOrigin()) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    ...(post.featuredImage
      ? {
          image: {
            "@type": "ImageObject",
            url: absoluteUrl(post.featuredImage.src, origin),
            width: post.featuredImage.width,
            height: post.featuredImage.height,
            caption: post.featuredImageAlt,
          },
        }
      : {}),
    datePublished: post.datePublished,
    ...(post.dateModified ? { dateModified: post.dateModified } : {}),
    author: {
      "@type": post.author.type,
      name: post.author.name,
      ...(post.author.url ? { url: post.author.url } : {}),
    },
    publisher: { "@type": "Organization", name: site.name, url: origin },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleCanonical(post, origin),
    },
  };
}

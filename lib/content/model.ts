export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type ImageAsset = { src: string; width: number; height: number };
export type ContentCTA = {
  label: string;
  href: string;
  heading?: string;
  supportingText?: string;
  variant: "primary" | "secondary";
};
export type Inline =
  | { type: "text"; text: string; bold?: boolean; emphasis?: boolean }
  | { type: "link"; text: string; href: string };
export type ContentBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; content: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "image"; image: ImageAsset; alt: string; caption?: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "table"; caption: string; headers: string[]; rows: string[][] }
  | { type: "callout"; heading: string; content: Inline[] }
  | { type: "cta"; cta: ContentCTA };
export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: ContentBlock[];
  featuredImage: ImageAsset | null;
  featuredImageAlt: string;
  author: { name: string; type: "Person" | "Organization"; url?: string };
  datePublished: string | null;
  dateModified: string | null;
  status: ContentStatus;
  category: string;
  tags: string[];
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string | null;
  ogTitle: string;
  ogDescription: string;
  ogImage: ImageAsset | null;
  cta: ContentCTA | null;
};

import type { MetadataRoute } from "next";
import { absoluteUrl, publicIndexingEnabled } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: publicIndexingEnabled()
      ? {
          userAgent: "*",
          allow: "/",
          disallow: [
            "/login",
            "/account",
            "/auth/",
            "/check-location",
            "/preview/",
            "/admin/",
            "/api/",
          ],
        }
      : { userAgent: "*", disallow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

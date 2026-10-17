import type { MetadataRoute } from "next";
import { absoluteUrl, publicRobotsRules } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: publicRobotsRules(),
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

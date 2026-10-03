import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { websiteOrigin } from "@/lib/seo";
import { site } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(websiteOrigin()),
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.tagline,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        <div className="preview-banner">
          Early preview <span aria-hidden="true">·</span> Explore the journey.
          Reports and purchases are not available yet.
        </div>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

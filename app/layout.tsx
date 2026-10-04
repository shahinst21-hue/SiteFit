import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { websiteOrigin } from "@/lib/seo";
import { site } from "@/lib/site-config";
import { LocationEntryProvider } from "@/components/location-entry";

export const metadata: Metadata = {
  metadataBase: new URL(websiteOrigin()),
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.tagline,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content" tabIndex={-1}>
          <LocationEntryProvider>{children}</LocationEntryProvider>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./brand.css";
import "./journey.css";
import "./snapshot-decision.css";
import "./measurement.css";
import {MeasurementControls} from "@/components/measurement-controls";
import {readPublicSupabaseConfig} from "@/lib/supabase/config";
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

export const viewport: Viewport = { themeColor: "#eaeaea", viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" data-scroll-behavior="smooth">
      <body data-clarity-mask="true">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader authConfig={readPublicSupabaseConfig(process.env)} />
        <main id="main-content" tabIndex={-1}>
          <LocationEntryProvider>{children}</LocationEntryProvider>
        </main>
        <SiteFooter />
        <MeasurementControls/>
      </body>
    </html>
  );
}

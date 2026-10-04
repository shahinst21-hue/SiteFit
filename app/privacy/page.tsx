import { PageIntro } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/privacy");
// Controller identity, rights contact, lawful basis and retention still require owner/legal review before public launch.
export default function Privacy() {
  return (
    <div className="page-wrap narrow-page">
      <PageIntro eyebrow="YOUR INFORMATION" title="Privacy at SiteFit.">
        <p>
          How the website handles the information you enter. Updated 4 October
          2026.
        </p>
      </PageIntro>
      <div className="prose">
        <h2>Location and financial details</h2>
        <p>
          Your location brief and optional financial entries stay in memory on
          the current page. They are not submitted to a server or placed in
          browser storage. Leaving or reloading clears them. Avoid entering
          sensitive personal information.
        </p>
        <h2>Accounts and session cookies</h2>
        <p>
          Email sign-in uses Supabase Auth to process your email and establish a
          session. Session cookies keep you signed in. SiteFit stores a minimal
          profile linked to your account without duplicating the authentication
          email.
        </p>
        <h2>Website delivery</h2>
        <p>
          Vercel delivers this website and may process technical request
          information needed for hosting. No marketing analytics, mailing list
          or payment collection is active on this website.
        </p>
        <h2>Property evidence</h2>
        <p>
          The checker does not create a saved property analysis. Schematic maps
          and fictional Sample Reports contain no personal property
          observations.
        </p>
        <h2>Controller and privacy requests</h2>
        <p>
          Controller identity, a privacy contact and applicable retention/rights
          arrangements are not specified on this page. This service information
          does not claim to be a complete legally reviewed privacy notice.
        </p>
      </div>
    </div>
  );
}

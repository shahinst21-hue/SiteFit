import { PageIntro } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/privacy");
// Development placeholder: identity, processors, retention and rights process require legal review before launch.
export default function Privacy() {
  return (
    <div className="page-wrap narrow-page">
      <PageIntro eyebrow="DEVELOPMENT NOTICE" title="Privacy in this preview.">
        <p>
          This is a draft notice for the current public preview, not the final
          launch policy. Last updated 3 October 2026.
        </p>
      </PageIntro>
      <div className="prose">
        <h2>Who this notice covers</h2>
        <p>
          This notice describes the SiteFit preview. The responsible legal
          entity and privacy contact must be confirmed before the live service
          opens.
        </p>
        <h2>Information you enter</h2>
        <p>
          The location checker holds entries in memory on the current page. It
          does not submit them to a server or store them in browser storage.
          Leaving or reloading clears them. Do not enter sensitive personal
          information.
        </p>
        <h2>Website delivery</h2>
        <p>
          The site is delivered through Vercel. Website delivery may involve
          technical request information processed by the hosting provider. The
          launch notice must explain the actual processing arrangements and
          providers.
        </p>
        <h2>Accounts, payments and tracking</h2>
        <p>
          Optional email sign-in uses Supabase Auth to process your email and
          establish a session. Session cookies keep you signed in. SiteFit
          stores an application profile linked to your account without
          duplicating your authentication email. No payment collection,
          marketing analytics or mailing list is active.
        </p>
        <h2>Retention and sharing</h2>
        <p>
          No property analysis or customer record is created by the checker.
          Retention periods, lawful bases and provider sharing for the future
          service are not settled in this draft.
        </p>
        <h2>Your questions and rights</h2>
        <p>
          A privacy contact and appropriate request process must be published
          before personal-data services open. Formal legal review is still
          required; no compliance certification or completed review is claimed.
        </p>
        <h2>Changes before launch</h2>
        <p>
          This draft must be replaced with reviewed information reflecting the
          live product before public launch, analysis or purchases become
          available.
        </p>
      </div>
    </div>
  );
}

import { PageIntro } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/terms");
// Development placeholder: identity, governing terms, tax/refunds and liability require legal review before launch.
export default function Terms() {
  return (
    <div className="page-wrap narrow-page">
      <PageIntro
        eyebrow="DEVELOPMENT NOTICE"
        title="Terms for exploring SiteFit."
      >
        <p>
          Draft terms for an early preview. This is not an offer to sell a live
          report. Last updated 3 October 2026.
        </p>
      </PageIntro>
      <div className="prose">
        <h2>The current service</h2>
        <p>
          You can read public pages and explore a location-entry journey. No
          property analysis, account access, purchase or report delivery is
          available.
        </p>
        <h2>Preview information</h2>
        <p>
          Planned features and initial pricing describe the intended product.
          They do not establish availability, final coverage or a final purchase
          agreement. Editorial content is general guidance, not an assessment of
          a real property.
        </p>
        <h2>Decisions and professional review</h2>
        <p>
          SiteFit does not predict business success. Investigate premises in
          person, verify documents and seek appropriate qualified advice before
          relying on information about a commercial commitment.
        </p>
        <h2>Acceptable exploration</h2>
        <p>
          Use the preview for its intended purpose and avoid entering sensitive
          information. There is no upload or support-message service here.
        </p>
        <h2>Pricing and purchases</h2>
        <p>
          No payment is collected in this preview. Final tax treatment, refunds,
          entitlement, delivery and purchase terms must be settled before sales
          open.
        </p>
        <h2>Identity, rights and liability</h2>
        <p>
          The contracting entity, governing terms, applicable customer rights
          and appropriate liability provisions remain to be reviewed and
          confirmed. This draft does not claim that legal review has occurred.
        </p>
        <h2>Before the live service opens</h2>
        <p>
          Reviewed terms reflecting the actual service must replace this
          development placeholder before launch.
        </p>
      </div>
    </div>
  );
}

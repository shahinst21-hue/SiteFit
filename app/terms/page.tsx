import { PageIntro } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/terms");
// Contracting entity, tax/refunds, entitlement and liability need owner/legal review before sales.
export default function Terms() {
  return (
    <div className="page-wrap narrow-page">
      <PageIntro
        eyebrow="SERVICE INFORMATION"
        title="Using SiteFit responsibly."
      >
        <p>
          Information about the website and the limits of its guidance. Updated
          4 October 2026.
        </p>
      </PageIntro>
      <div className="prose">
        <h2>Your location brief</h2>
        <p>
          The location check organises the address and business type you enter,
          with relevant verification questions. Local evidence has not been
          verified for that address. Optional economics stays on the page and
          produces no calculated financial result.
        </p>
        <h2>Samples and editorial guidance</h2>
        <p>
          The Sample Report is a clearly labelled fictional scenario. It is not
          an assessment of a real property. Blog articles provide general
          guidance. Neither establishes premises suitability, demand or business
          success.
        </p>
        <h2>Before a lease commitment</h2>
        <p>
          Inspect the premises, verify source documents and consult
          appropriately qualified advisers on lease, planning and financial
          matters. SiteFit does not guarantee an outcome.
        </p>
        <h2>Accounts and prices</h2>
        <p>
          Email sign-in establishes your account session; it does not create
          report or purchase entitlement. Displayed prices describe the product
          proposition. No payment is collected through this website.
        </p>
        <h2>Responsible use</h2>
        <p>
          Do not submit sensitive documents or misuse the website. The location
          checker keeps entries in page memory and clears them on navigation or
          reload.
        </p>
        <h2>Purchase and legal terms</h2>
        <p>
          This information is not a purchase agreement or a claim of completed
          legal review. Contracting identity, tax, refunds, delivery, rights and
          liability require specific terms before a transaction.
        </p>
      </div>
    </div>
  );
}

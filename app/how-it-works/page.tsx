import { PageIntro, ClosingCTA } from "@/components/ui";
import { ReportOutline } from "@/components/report-outline";
import { pageMetadata } from "@/lib/seo";
import { formatPrice, site } from "@/lib/site-config";
export const metadata = pageMetadata("/how-it-works");
export default function HowItWorks() {
  return (
    <div className="page-wrap">
      <PageIntro
        eyebrow="HOW SITEFIT WORKS"
        title="From a property address to a clearer lease decision."
      >
        <p>Start with a free first look. Choose a Full Report when you need a closer assessment.</p>
      </PageIntro>
      <ol className="journey-list">
        {[
          [
            "Enter the property address",
            "Enter a UK commercial address and postcode. Location analysis currently covers London.",
          ],
          [
            "Choose your business",
            "Coffee Shop, Restaurant, Hair Salon or Beauty Salon. Your intended use shapes the relevant checks.",
          ],
          [
            "Review your Free Snapshot",
            "See an initial assessment of local customer context, competition, access and premises questions. No account or financial inputs required.",
          ],
          [
            "Get the Full Report",
            `Sign in before Checkout for the ${formatPrice(site.pricing.fullReport)} one-off Full Report. Read the findings, risks and priority actions in your account, then download a PDF. Rental estimates appear only where supported. Financial calculations are not included.`,
          ],
        ].map(([title, text], i) => (
          <li key={title}>
            <span>0{i + 1}</span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <ReportOutline />
      <ClosingCTA />
    </div>
  );
}

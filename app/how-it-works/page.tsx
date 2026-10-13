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
        title="Two details to start. Better questions to follow."
      >
        <p>Understand the location, its risks and your next decision.</p>
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
            "Start with your location brief, key questions and evidence limitations. No account or financial inputs required.",
          ],
          [
            "Go deeper when it helps",
            `Review the ${formatPrice(site.pricing.fullReport)} Full Report format: business context, premises risks, qualified rental evidence and priority actions. Financial planning is separate and is never required to purchase or receive the report.`,
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

import { PageIntro, ClosingCTA } from "@/components/ui";
import { ReportOutline } from "@/components/report-outline";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/how-it-works");
export default function HowItWorks() {
  return (
    <div className="page-wrap">
      <PageIntro
        eyebrow="HOW SITEFIT WORKS"
        title="Two details to start. Better questions to follow."
      >
        <p>Bring the location into focus before adding the financial detail.</p>
      </PageIntro>
      <ol className="journey-list">
        {[
          [
            "Enter the property address",
            "Use the commercial address and postcode, anywhere in the UK.",
          ],
          [
            "Choose your business",
            "Coffee Shop, Restaurant, Hair Salon or Beauty Salon. Your intended use shapes the relevant checks.",
          ],
          [
            "Review your Free Snapshot",
            "Start with your location brief, key questions and evidence limitations. No account or economics required.",
          ],
          [
            "Go deeper when it helps",
            "Add optional costs after the Snapshot. Explore the Sample Report to see how supporting evidence, risks and next checks fit together.",
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

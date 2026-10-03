import { PageIntro, ClosingCTA } from "@/components/ui";
import { ReportOutline } from "@/components/report-outline";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/how-it-works");
export default function HowItWorks() {
  return (
    <div className="page-wrap">
      <PageIntro
        eyebrow="THE JOURNEY"
        title="A closer look, one step at a time."
      >
        <p>
          Start with the property you have found. Build a picture of the
          location, the costs and the questions that remain.
        </p>
      </PageIntro>
      <ol className="journey-list">
        {[
          [
            "Enter the property address",
            "Use the commercial address and postcode. In this preview you enter it yourself; address search and resolution will come later.",
          ],
          [
            "Choose your business",
            "Coffee Shop, Restaurant, Hair Salon or Beauty Salon. Your intended use gives the investigation its context.",
          ],
          [
            "Add the costs you know",
            "Rent, rates, staff costs and other optional inputs. Leave missing information blank. No calculations run in this preview.",
          ],
          [
            "Review your entries",
            "Finish the preview with an on-page summary. Your information is not submitted, and the analysis engine is not connected.",
          ],
        ].map(([title, text], index) => (
          <li key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="availability-note">
        <strong>What comes after the preview?</strong>
        <p>
          The planned journey continues with a Free Snapshot, then an optional
          one-off Full Report. Reports, payments and delivery are not available
          yet.
        </p>
      </div>
      <ReportOutline />
      <ClosingCTA />
    </div>
  );
}

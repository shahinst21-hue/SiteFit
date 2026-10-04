import { LocationWizard } from "@/components/location-wizard";
import { PageIntro } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/check-location");
export default function CheckLocation() {
  return (
    <div className="page-wrap check-page">
      <PageIntro eyebrow="FREE SNAPSHOT" title="Check your location.">
        <p>Two details. A more focused set of questions.</p>
      </PageIntro>
      <LocationWizard />
    </div>
  );
}

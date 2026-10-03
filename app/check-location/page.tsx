import { PageIntro } from "@/components/ui";
import { LocationWizard } from "@/components/location-wizard";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/check-location");
export default function CheckLocation() {
  return (
    <div className="page-wrap checker-page">
      <PageIntro eyebrow="CHECK A LOCATION" title="Tell us about the space.">
        <p>
          A few details to frame your investigation. Explore this preview
          without creating an account or submitting your information.
        </p>
      </PageIntro>
      <LocationWizard />
    </div>
  );
}

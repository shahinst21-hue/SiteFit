import { LocationWizard } from "@/components/location-wizard";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/check-location");
export default function CheckLocation() {
  return (
    <div className="page-wrap check-page">
      <LocationWizard />
    </div>
  );
}

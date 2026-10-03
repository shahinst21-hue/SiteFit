import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/contact");
export default function Contact() {
  return (
    <div className="page-wrap">
      <PageIntro eyebrow="CONTACT" title="Questions before you begin?">
        <p>
          SiteFit is in early preview. A direct contact channel will be
          published before launch; there is no monitored inbox or message form
          on this site yet.
        </p>
      </PageIntro>
      <div className="three-columns contact-cards">
        <section className="simple-panel">
          <h2>Using the preview</h2>
          <p>
            Explore the address, business type and economics steps. Nothing is
            submitted or analysed.
          </p>
          <Link href="/how-it-works" className="text-link">
            How it works ↗
          </Link>
        </section>
        <section className="simple-panel">
          <h2>Reports and availability</h2>
          <p>
            The Free Snapshot and Full Report are planned products. Neither is
            available to generate or buy today.
          </p>
          <Link href="/pricing" className="text-link">
            See planned pricing ↗
          </Link>
        </section>
        <section className="simple-panel">
          <h2>Evidence and limitations</h2>
          <p>
            See how sources, estimates and unknowns are intended to appear in
            the report.
          </p>
          <Link href="/methodology" className="text-link">
            Read our approach ↗
          </Link>
        </section>
      </div>
      <p className="fine-print">
        Please do not send personal or property documents through the preview. A
        secure support process has not been introduced.
      </p>
    </div>
  );
}

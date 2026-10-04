import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/contact");
export default function Contact() {
  return (
    <div className="page-wrap">
      <PageIntro
        eyebrow="HELP AND CONTACT"
        title="Find the right answer before you start."
      >
        <p>Guidance on your location check, report evidence and account.</p>
      </PageIntro>
      <div className="three-columns contact-cards">
        {[
          [
            "Your location check",
            "Start with an address and business type. Add economics only after your Snapshot, if it helps your investigation.",
            "/how-it-works",
            "How it works",
          ],
          [
            "Report evidence",
            "See how a report can connect opportunities, risks, evidence gaps and the questions to ask before signing.",
            "/sample-report",
            "View Sample Report",
          ],
          [
            "Your account",
            "Sign in using a one-time email link. Open it in the same browser and request a new link if it has expired.",
            "/login",
            "Account sign-in",
          ],
        ].map(([title, text, href, label]) => (
          <section className="simple-panel" key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
            <Link className="text-link" href={href}>
              {label} ↗
            </Link>
          </section>
        ))}
      </div>
      <p className="quiet-note">
        For lease, planning or financial advice, consult an appropriately
        qualified professional. This page does not accept messages or document
        uploads.
      </p>
    </div>
  );
}


import { Icon } from "@/components/icon";
import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
import {seller} from '@/lib/legal/seller';
export const metadata = pageMetadata("/contact");
export default function Contact() {
  return (
    <div className="page-wrap">
      <PageIntro
        eyebrow="HELP AND CONTACT"
        title="How can we help?"
      >
        <p>Questions about a location check, your report or a purchase? Contact SiteFit at info@sitefit.co.uk.</p>
      </PageIntro>
      <div className="three-columns contact-cards">
        {[
          [
            "Your location check",
            "Start with an address and business type. Financial inputs are not required to purchase or receive a report.",
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
            "Sign in with Google or a one-time email link. Open email links in the same browser and request a new link if needed.",
            "/login",
            "Account sign-in",
          ],
        ].map(([title, text, href, label], index) => (
          <section className="simple-panel" key={title}>
            <span className={`icon-disc ${index === 0 ? "green" : index === 1 ? "blue" : "amber"}`}><Icon name={index === 0 ? "pin" : index === 1 ? "document" : "account"}/></span>
            <h2>{title}</h2>
            <p>{text}</p>
            <Link className="text-link" href={href}>
              {label} <Icon name="external"/>
            </Link>
          </section>
        ))}
      </div>
      <section className="simple-panel"><h2>Contact SiteFit</h2><p>Support and privacy requests: <a href="mailto:info@sitefit.co.uk">info@sitefit.co.uk</a>. Please do not send passwords, payment-card details or authentication tokens.</p></section>
      <p className="quiet-note">{seller.name}, trading as {seller.tradingName}. Correspondence: {seller.address}.</p>
      <p className="quiet-note">
        For lease, planning or financial advice, consult an appropriately
        qualified professional. Email is the contact channel; this page has no document upload.
      </p>
    </div>
  );
}

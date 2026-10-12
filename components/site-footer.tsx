import Link from "next/link";
import { Wordmark } from "./ui";
import { site } from "@/lib/site-config";
import { Icon } from "./icon";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Link href="/" aria-label="SiteFit home">
            <Wordmark />
          </Link>
          <p>
            A closer look before a big commitment.
            <br />
            Commercial location decisions across the UK.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/blog"><Icon name="document"/>Resources</Link>
          <Link href="/methodology"><Icon name="shield"/>Methodology</Link>
          <Link href="/contact"><Icon name="help"/>Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {site.name}
        </span>
        <span>Census data: ONS, <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Open Government Licence v3.0</a>.</span>
      </div>
    </footer>
  );
}

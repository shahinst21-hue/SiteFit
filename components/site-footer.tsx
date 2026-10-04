import Link from "next/link";
import { Wordmark } from "./ui";
import { site } from "@/lib/site-config";

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
          <Link href="/blog">Resources</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {site.name}
        </span>
        <span>Decision support. No guarantees of business success.</span>
      </div>
    </footer>
  );
}

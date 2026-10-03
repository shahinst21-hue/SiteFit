import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/login");
export default function Login() {
  return (
    <div className="page-wrap narrow-page">
      <PageIntro
        eyebrow="YOUR SITEFIT ACCOUNT"
        title="A place for your next decision."
      >
        <p>
          Account access is not open yet. You can explore the location checker
          without signing in.
        </p>
      </PageIntro>
      <section className="simple-panel" aria-label="Sign-in preview">
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            disabled
            placeholder="Email address"
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            disabled
            placeholder="Password"
            autoComplete="current-password"
          />
        </div>
        <button
          className="button button-primary"
          disabled
          aria-describedby="login-availability"
        >
          Sign in
        </button>
        <p id="login-availability" className="field-help">
          Sign-in is not available yet. This page does not collect credentials.
        </p>
        <Link href="/check-location" className="text-link">
          Explore the location checker ↗
        </Link>
      </section>
    </div>
  );
}

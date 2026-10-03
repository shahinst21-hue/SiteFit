import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { callbackCredentials, authDestination } from "@/lib/auth/flow";
import { confirmSignIn } from "../actions";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Confirm sign-in",
  robots: { index: false, follow: false },
};
export default async function Confirm({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value))
      value.forEach((item) => query.append(key, item));
  }
  const credentials = callbackCredentials(query);
  return (
    <div className="page-wrap narrow-page">
      <PageIntro
        eyebrow="YOUR SITEFIT ACCOUNT"
        title={
          credentials?.kind === "email"
            ? "Confirm your sign-in."
            : "Request a new sign-in link."
        }
      >
        <p>
          {credentials?.kind === "email"
            ? "Continue to sign in to SiteFit. If you did not request this link, close this page."
            : "This link is invalid or incomplete. Request a fresh email link to continue."}
        </p>
      </PageIntro>
      {credentials?.kind === "email" ? (
        <form action={confirmSignIn} className="simple-panel">
          <input type="hidden" name="token_hash" value={credentials.value} />
          <input
            type="hidden"
            name="next"
            value={authDestination(params.next)}
          />
          <button type="submit" className="button button-primary">
            Confirm sign-in
          </button>
          <p className="field-help">
            This step helps prevent email security scanners from using your
            one-time link.
          </p>
        </form>
      ) : (
        <Link href="/login" className="button button-primary">
          Request a new link
        </Link>
      )}
    </div>
  );
}

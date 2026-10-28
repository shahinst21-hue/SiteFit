import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { callbackCredentials, authDestination } from "@/lib/auth/flow";
import {emailReturn} from '@/lib/auth/email-continuation';
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
  const retry=params.retry==='1';
  const origin=new URL(process.env.SITE_URL??'http://localhost:3000').origin;
  const emailNext=emailReturn(params.next,origin,process.env.SUPABASE_SECRET_KEY??'');
  const valid=credentials?.kind==='email'&&(!query.has('next')||!!emailNext||params.next===authDestination(params.next));
  return (
    <div className="page-wrap narrow-page">
      <PageIntro
        eyebrow="YOUR SITEFIT ACCOUNT"
        title={
          retry?'You are signed in.':valid
            ? "Sign in and continue."
            : "Request a new sign-in link."
        }
      >
        <p>
          {retry?'Your sign-in succeeded, but we could not connect your saved Snapshot yet. Retry safely; no payment or new analysis is started.':valid
            ? "Continue to sign in to SiteFit. If you did not request this link, close this page."
            : "This link is invalid or incomplete. Request a fresh email link to continue."}
        </p>
      </PageIntro>
      {retry||valid ? (
        <form action={confirmSignIn} className="simple-panel">
          <input type="hidden" name="token_hash" value={credentials?.value??''} />
          {retry&&<input type="hidden" name="retry" value="1"/>}
          <input
            type="hidden"
            name="next"
            value={emailNext?String(params.next):authDestination(params.next)}
          />
          <button type="submit" className="button button-primary">
            {retry?'Connect my saved Snapshot':'Sign in and continue'}
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

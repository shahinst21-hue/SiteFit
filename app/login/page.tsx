
import { Icon } from "@/components/icon";
import Link from "next/link";
import { PageIntro, Wordmark } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
import { LoginForm } from "@/components/login-form";
import { readPublicSupabaseConfig } from "@/lib/supabase/config";
import { verifiedUser } from "@/lib/supabase/server";
import { authFailure, authMessages } from "@/lib/auth/flow";
import { signOut } from "@/app/auth/actions";
import { purchaseOrigin } from "@/lib/payments/config";
import { headers } from "next/headers";
import { dashboardEnabled } from "@/lib/report-dashboard/gate";
export const metadata = pageMetadata("/login");
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, unavailable } = await verifiedUser();
  const params = await searchParams;
  const failure = authFailure(params.error);
  const signedIn=!!user&&!user.is_anonymous;
  const dashboardAccess=dashboardEnabled(process.env,(await headers()).get('host')?.split(':')[0]??'');
  return (
    <div className="page-wrap narrow-page">
      <div className="auth-brand">
        <Wordmark />
        <span className="badge">Your account</span>
      </div>
      <PageIntro
        eyebrow="YOUR SITEFIT ACCOUNT"
        title={signedIn ? "You're signed in." : "Sign in to SiteFit."}
      >
        <p>
          {signedIn
            ? "Open your account or start a new location check."
            : "Use a one-time email link. Your Free Snapshot does not require an account."}
        </p>
      </PageIntro>
      {failure && (
        <p className="field-error" role="alert">
          {authMessages[failure]}
        </p>
      )}
      {params.signed_out === "1" && <p role="status">You're signed out.</p>}
      {signedIn ? (
        <section className="simple-panel">
          <p>Signed in as {user.email}</p>
          <Link className="text-link" href="/account">
            Open your account <Icon name="external"/>
          </Link>
          <form action={signOut}>
            <button className="button button-secondary" type="submit">
              Sign out
            </button>
          </form>
        </section>
      ) : (
        <LoginForm
          config={unavailable ? null : readPublicSupabaseConfig(process.env)}
          google={!!purchaseOrigin(process.env)||dashboardAccess}
        />
      )}
      <Link href="/check-location" className="text-link">
        Start a Free Snapshot <Icon name="external"/>
      </Link>
    </div>
  );
}

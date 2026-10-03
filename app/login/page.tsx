import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
import { LoginForm } from "@/components/login-form";
import { readPublicSupabaseConfig } from "@/lib/supabase/config";
import { verifiedUser } from "@/lib/supabase/server";
import { authFailure, authMessages } from "@/lib/auth/flow";
import { signOut } from "@/app/auth/actions";
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
  return (
    <div className="page-wrap narrow-page">
      <PageIntro
        eyebrow="YOUR SITEFIT ACCOUNT"
        title={user ? "You're signed in." : "A place for your next decision."}
      >
        <p>
          {user
            ? "Your account is ready. Location analysis and reports are not available yet."
            : "Sign in with an email link. You can also explore the location checker without an account."}
        </p>
      </PageIntro>
      {failure && (
        <p className="field-error" role="alert">
          {authMessages[failure]}
        </p>
      )}
      {params.signed_out === "1" && <p role="status">You're signed out.</p>}
      {user ? (
        <section className="simple-panel">
          <p>Signed in as {user.email}</p>
          <Link className="text-link" href="/account">
            Open your account ↗
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
        />
      )}
      <Link href="/check-location" className="text-link">
        Explore the location checker ↗
      </Link>
    </div>
  );
}

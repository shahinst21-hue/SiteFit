import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageIntro, Wordmark } from "@/components/ui";
import { Icon } from "@/components/icon";
import { verifiedUser } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default async function Account() {
  const { client, user } = await verifiedUser();
  if (!user || !client) redirect("/login");
  const { data: profile, error } = await client
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <div className="page-wrap narrow-page">
      <div className="auth-brand">
        <Wordmark />
        <span className="badge positive">Signed in</span>
      </div>
      <PageIntro
        eyebrow="YOUR SITEFIT ACCOUNT"
        title={
          profile?.display_name
            ? `Welcome, ${profile.display_name}.`
            : "Your account is ready."
        }
      >
        <p>Signed in as {user.email}</p>
      </PageIntro>
      <section className="simple-panel">
        <span className="icon-disc green">
          <Icon name="document" />
        </span>
        <h2>Your next location</h2>
        <p>
          No saved reports in this account. Start with a Free Snapshot to
          organise your next location decision. Location entries stay on the
          current page.
        </p>
        {error && (
          <p role="status">
            Your profile is temporarily unavailable. Your sign-in is still
            active.
          </p>
        )}
        <Link className="button button-primary" href="/check-location">
          Start a Free Snapshot ↗
        </Link>
        <form action={signOut}>
          <button className="button button-secondary" type="submit">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}

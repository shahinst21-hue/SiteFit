import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/ui";
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
        <h2>Your next location</h2>
        <p>
          Location analysis and saved reports are not available yet. You can
          explore the checker now; entries are not saved.
        </p>
        {error && (
          <p role="status">
            Your profile is temporarily unavailable. Your sign-in is still
            active.
          </p>
        )}
        <Link className="button button-primary" href="/check-location">
          Explore the location checker ↗
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

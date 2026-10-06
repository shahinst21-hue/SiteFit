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
  const { data: history, error: historyError } = await client.rpc("list_sitefit_free");
  const reports = Array.isArray(history) ? history.flatMap(value => {
    if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.id !== "string" || !/^[0-9a-f-]{36}$/i.test(value.id) || typeof value.address !== "string" || typeof value.generatedAt !== "string") return [];
    return [{ id: value.id, address: value.address, generatedAt: value.generatedAt }];
  }) : [];
  return (
    <div className="page-wrap narrow-page">
      <div className="auth-brand">
        <Wordmark />
        <span className="badge positive">{user.is_anonymous ? "Guest session" : "Signed in"}</span>
      </div>
      <PageIntro
        eyebrow="YOUR SITEFIT ACCOUNT"
        title={
          profile?.display_name
            ? `Welcome, ${profile.display_name}.`
            : "Your account is ready."
        }
      >
        <p>{user.is_anonymous ? "Your saved Snapshots belong to this browser session. Losing its cookies or signing out can remove access." : `Signed in as ${user.email}`}</p>
      </PageIntro>
      <section className="simple-panel">
        <span className="icon-disc green">
          <Icon name="document" />
        </span>
        <h2>Your saved Snapshots</h2>
        {reports.length ? <ul>{reports.map(report => <li key={report.id}><Link href={`/snapshots/${report.id}`}>{report.address}</Link> · {new Date(report.generatedAt).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}</li>)}</ul> : <p>No saved Snapshots yet. Start a location check to build your first view.</p>}
        {historyError && <p role="status">Saved Snapshots are temporarily unavailable. Your session is still active.</p>}
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

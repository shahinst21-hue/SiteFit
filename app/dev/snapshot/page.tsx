import { notFound } from "next/navigation";
import { FreeSnapshotView } from "@/components/free-snapshot";
import { demoAllowed } from "@/lib/snapshot/model";
import { snapshotDemo } from "@/lib/snapshot/demo";
export const dynamic = "force-dynamic";
export const metadata = { title: "Snapshot UI demo", robots: { index: false, follow: false } };
export default async function SnapshotDemo({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (!demoAllowed(process.env.NODE_ENV)) notFound();
  const fixture = (await import("@/fixtures/free_snapshot/kingston_coffee_shop.json")).default;
  const { state } = await searchParams;
  return <FreeSnapshotView snapshot={snapshotDemo(fixture, process.env.NODE_ENV, state)} />;
}

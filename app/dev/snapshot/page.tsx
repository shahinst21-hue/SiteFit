import { notFound } from "next/navigation";
import { FreeSnapshot,FreeSnapshotView } from "@/components/free-snapshot";
import { demoAllowed } from "@/lib/snapshot/model";
import { snapshotDemo } from "@/lib/snapshot/demo";
import { JourneyReview } from "@/components/journey-review";
import {savedSnapshotReview} from '@/lib/snapshot/review';
export const dynamic = "force-dynamic";
export const metadata = { title: "Snapshot UI demo", robots: { index: false, follow: false } };
export default async function SnapshotDemo({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  if(state==='stored'){
    const saved=savedSnapshotReview(process.env);if(!saved)notFound();
    return <><aside className="sf-review-origin" role="note">Saved Production Snapshot · presentation review. No new analysis or purchase is executed.</aside><FreeSnapshot {...saved} reportId="review"/></>;
  }
  if (state === 'journey' && (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview')) {
    const fixture = (await import("@/fixtures/free_snapshot/kingston_coffee_shop.json")).default;
    return <JourneyReview><FreeSnapshotView snapshot={snapshotDemo(fixture, 'development', undefined)} /></JourneyReview>;
  }
  if (!demoAllowed(process.env.NODE_ENV)) notFound();
  const fixture = (await import("@/fixtures/free_snapshot/kingston_coffee_shop.json")).default;
  return <FreeSnapshotView snapshot={snapshotDemo(fixture, process.env.NODE_ENV, state)} />;
}

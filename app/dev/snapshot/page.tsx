import {PurchaseTerms} from '@/components/purchase-terms';
import {residentialScore} from "@/lib/analysis/residential-catchment";
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
  if(state==='supply'&&(process.env.NODE_ENV==='development'||process.env.VERCEL_ENV==='preview'))return <section className="section container"><aside role="note">Synthetic consent UI verification only. No purchase or contract is created. This invalid report reference cannot reach provider execution.</aside><PurchaseTerms report="synthetic-consent-preview"/></section>;
  if(state==='stored'){
    const saved=savedSnapshotReview(process.env);if(!saved)notFound();
    return <><aside className="sf-review-origin" role="note">Saved Production Snapshot · presentation review. No new analysis or purchase is executed.</aside><FreeSnapshot {...saved} reportId="review"/></>;
  }
  if (state === 'journey' && (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview')) {
    const fixture = (await import("@/fixtures/free_snapshot/kingston_coffee_shop.json")).default;
    return <JourneyReview><FreeSnapshotView snapshot={snapshotDemo(fixture, 'development', undefined)} /></JourneyReview>;
  }
  if(state==='catchment'&&(process.env.NODE_ENV==='development'||process.env.VERCEL_ENV==='preview')){
    const fixture=(await import('@/fixtures/free_snapshot/kingston_coffee_shop.json')).default;
    const view=snapshotDemo(fixture,'development',undefined);
    view.property.address='Approved numerical example — synthetic UI verification';
    view.factors[0].residentialCatchment=residentialScore([3500,9000,25000],{evidenceIds:['synthetic-example'],snapshotIds:[],releaseIds:[],precision:'postcode_centroid',referencePeriod:'2021-03-21',retrievedAt:[],point:{longitude:-.05,latitude:51.53}});
    return <><aside className="sf-review-origin" role="note">Synthetic numerical example only · not a property assessment · no execution or purchasing</aside><FreeSnapshotView snapshot={view}/></>;
  }
  if (!demoAllowed(process.env.NODE_ENV)) notFound();
  const fixture = (await import("@/fixtures/free_snapshot/kingston_coffee_shop.json")).default;
  return <FreeSnapshotView snapshot={snapshotDemo(fixture, process.env.NODE_ENV, state)} />;
}

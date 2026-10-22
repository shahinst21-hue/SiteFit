import {competitionFixture} from '@/tests/fixtures/competition';
import {competitionUnavailable} from '@/lib/competition/model';
import {OpeningProgress} from '@/components/generation-progress';
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
  if(state==='recommendation'&&(process.env.NODE_ENV==='development'||process.env.VERCEL_ENV==='preview')){
    const {recommendationFixture}=await import('@/tests/fixtures/recommendation');
    const {decisionFixture}=await import('@/tests/fixtures/snapshot-decision');
    const {residential,competition,decision,advice}=recommendationFixture();
    const report={...decisionFixture(),residentialCatchment:residential,competition,recommendation:decision};
    report.earlyView.advisor=advice;
    return <><aside role="note">Synthetic decision regression fixture · no provider, AI or payment execution</aside><FreeSnapshot report={report}/></>;
  }
  if(state==='opening'&&(process.env.NODE_ENV==='development'||process.env.VERCEL_ENV==='preview'))return <OpeningProgress kind="saved Snapshot"/>;
  if(state==='supply'&&(process.env.NODE_ENV==='development'||process.env.VERCEL_ENV==='preview')){
    const fixture=(await import('@/fixtures/free_snapshot/kingston_coffee_shop.json')).default;
    return <><aside role="note">Synthetic consent UI verification only. Invalid report reference; no purchase or contract.</aside><FreeSnapshotView snapshot={snapshotDemo(fixture,'development',undefined)} openPurchase purchaseReport="synthetic-consent-preview" purchaseTerms={<PurchaseTerms report="synthetic-consent-preview"/>}/></>;
  }
  if(state==='stored'){
    const saved=savedSnapshotReview(process.env);if(!saved)notFound();
    return <><aside className="sf-review-origin" role="note">Saved Production Snapshot · presentation review. No new analysis or purchase is executed.</aside><FreeSnapshot {...saved} reportId="review"/></>;
  }
  if (state === 'journey' && (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview')) {
    const fixture = (await import("@/fixtures/free_snapshot/kingston_coffee_shop.json")).default;
    return <JourneyReview><FreeSnapshotView snapshot={snapshotDemo(fixture, 'development', undefined)} /></JourneyReview>;
  }
  if(['competition','competition-a','competition-unavailable'].includes(state??'')&&(process.env.NODE_ENV==='development'||process.env.VERCEL_ENV==='preview')){
    const fixture=(await import('@/fixtures/free_snapshot/kingston_coffee_shop.json')).default;
    const view=snapshotDemo(fixture,'development',undefined);view.property.address='Synthetic Competition UI fixture — not a property assessment';
    view.factors[1].competition=state==='competition-unavailable'?competitionUnavailable('beauty-salon','classification_ambiguous','The source taxonomy does not reliably distinguish beauty services.'):competitionFixture(state==='competition-a'?[1,4,9]:[5,13,24]);
    return <><aside role="note">Synthetic contract fixture · no provider, AI or purchase execution</aside><FreeSnapshotView snapshot={view}/></>;
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

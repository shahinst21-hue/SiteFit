import 'server-only';
import { headers } from 'next/headers';
import { verifiedUser } from '../supabase/server.ts';
import { intelligenceId } from '../report-intelligence/http.ts';
import {dashboardEnabled} from './gate.ts';
import { fullRepository } from '../report-intelligence/repository.ts';
import { fullStatus } from '../report-intelligence/generate.ts';
import { dashboardFromStored } from './model.ts';
import { validateFreeProjection } from '../analysis/projection.ts';
import { snapshotFromStored } from '../snapshot/model.ts';
import { packetDigest } from '../analysis/canonical.ts';
import {structuredRentalPreview} from './structured-preview.ts';

/** All browser/exports use this same verified-session + database-paid-ownership boundary. No write methods. */
export async function readDashboard(id:string) {
  const host=(await headers()).get('host')?.split(':')[0]??'';
  if(!dashboardEnabled(process.env,host)||!intelligenceId(id))return null;
  const {user,client}=await verifiedUser();
  if(!user||!client||user.is_anonymous||!user.email_confirmed_at)return null;
  const session=await client.rpc('sitefit_session_available');
  if(session.error||session.data!==true)return null;
  let edition; try {edition=await fullRepository(user.id).read(id);}catch{return null;}
  const status=fullStatus(edition);
  if(edition.status!=='ready'){
    const free=edition.preparation.presentation?.freeReportId;
    if(!free)return {status,dashboard:null};
    try{
      const material=await fullRepository(user.id).material(free);
      return {status,dashboard:structuredRentalPreview(edition,material,status.stage)};
    }catch{return {status,dashboard:null};}
  }
  let dashboard; try { dashboard=dashboardFromStored(edition.projection,{reportId:id,editionLabel:`Full Report V1 · revision ${edition.revision}`}); } catch { return null; }
  const spatial=edition.preparation.presentation?.spatial;
  // The parent Free projection is immutable, owned and digest-bound. Never substitute a fresh map.
  if(spatial?.state==='available'&&spatial.digest){
    const result=await client.rpc('read_sitefit_free',{p_report:spatial.reportId});
    if(!result.error&&result.data)try{
      const free=validateFreeProjection(result.data);
      if(free.schemaVersion===3&&free.spatial&&packetDigest(free.spatial)===spatial.digest){
        const view=snapshotFromStored(free); dashboard.map=view.map;dashboard.transport=view.transport.places;
        dashboard.spatialNotices=free.spatial.notices;
      }
    }catch{/* A failed map binding remains unavailable; the historical text is preserved. */}
  }
  return {status,dashboard};
}

export const snapshotEvents={snapshot_view:['page'],factor_open:['customer-base','market-position','customer-access','premises'],question_open:['demand','risks','lease'],full_click:['brief','primary','mobile']} as const;
export type SnapshotEvent=keyof typeof snapshotEvents;
export function snapshotEvent(value:unknown):{action:'event';report:string;event:SnapshotEvent;detail:string}{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_snapshot_event');
 const r=value as Record<string,unknown>;
 if(Object.keys(r).sort().join(',')!=='action,detail,event,report'||r.action!=='event'||typeof r.report!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(r.report)||typeof r.event!=='string'||!Object.hasOwn(snapshotEvents,r.event)||typeof r.detail!=='string'||!(snapshotEvents[r.event as SnapshotEvent] as readonly string[]).includes(r.detail))throw Error('invalid_snapshot_event');
 return {action:'event',report:r.report,event:r.event as SnapshotEvent,detail:r.detail};
}

export type SnapshotTick = {stage:"identity"|"sources"|"analysis"|"synthesis"|"saving";completed:number};
export type SnapshotObserver = (tick:SnapshotTick)=>void;
/** Observational only: a disconnected UI must never change generation or billing. */
export function snapshotMilestones(observer?:SnapshotObserver){
 const sections=new Set<string>();
 const send=(stage:SnapshotTick['stage'],completed:number)=>{try{observer?.({stage,completed});}catch{/* presentation is not execution authority */}};
 return {context(){send('sources',1);},sources(){send('analysis',2);},section(id:string){sections.add(id);send(sections.size===4?'synthesis':'analysis',2+sections.size);},synthesis(){send('saving',7);}};
}

import type {SnapshotMap} from './model.ts';
export function snapshotTilePath(report:string,url:string){
 const match=/^https:\/\/tile\.openstreetmap\.org\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(url);
 return match?`/snapshots/${encodeURIComponent(report)}/tiles/${match[1]}/${match[2]}/${match[3]}`:'';
}
/** Bounded display viewport, not an arbitrary tile proxy. */
export function admittedTile(map:SnapshotMap,z:number,x:number,y:number){
 if(!map.bounds||map.status!=='available'||![z,x,y].every(Number.isSafeInteger)||z<12||z>18||x<0||y<0||x>=2**z||y>=2**z)return false;
 const n=2**z,lon=(v:number)=>v/n*360-180,lat=(v:number)=>Math.atan(Math.sinh(Math.PI*(1-2*v/n)))*180/Math.PI;
 const [w,s,e,north]=map.bounds,dx=e-w,dy=north-s;
 return lon(x)<e+dx&&lon(x+1)>w-dx&&lat(y)>s-dy&&lat(y+1)<north+dy;
}

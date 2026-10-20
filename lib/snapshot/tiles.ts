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
 // Include one boundary tile: a responsive viewport can need an edge tile
 // whose centre lies beyond the saved extent. This remains a bounded halo.
 const haloX=360/n,haloY=Math.abs(lat(y)-lat(y+1));
 return lon(x)<e+dx+haloX&&lon(x+1)>w-dx-haloX&&lat(y)>s-dy-haloY&&lat(y+1)<north+dy+haloY;
}

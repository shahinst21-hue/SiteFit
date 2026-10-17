/** Web Mercator display only: the historical WGS84 operands are never changed. */
export function mapViewport(bounds:[number,number,number,number],width=800,height=440){
  // Pixel precision avoids cross-engine trig serialization differences during hydration.
  const pixel=(v:number)=>Math.round(v*1000)/1000;
  const world=([lon,lat]:[number,number])=>[(lon+180)/360,(1-Math.asinh(Math.tan(Math.max(-85.0511,Math.min(85.0511,lat))*Math.PI/180))/Math.PI)/2];
  const nw=world([bounds[0],bounds[3]]),se=world([bounds[2],bounds[1]]);
  const scale=Math.min(width/(se[0]-nw[0]),height/(se[1]-nw[1]))*.92;
  const center=[(nw[0]+se[0])/2,(nw[1]+se[1])/2];
  const project=(point:[number,number])=>{const p=world(point);return [pixel((p[0]-center[0])*scale+width/2),pixel((p[1]-center[1])*scale+height/2)];};
  const z=Math.max(0,Math.min(18,Math.floor(Math.log2(scale/256)))),n=2**z,tileSize=scale/n;
  const left=center[0]-width/2/scale,top=center[1]-height/2/scale;
  const tiles:{url:string;x:number;y:number;size:number}[]=[];
  for(let y=Math.floor(top*n);y<=Math.floor((top+height/scale)*n);y++)for(let x=Math.floor(left*n);x<=Math.floor((left+width/scale)*n);x++){
    if(x>=0&&y>=0&&x<n&&y<n)tiles.push({url:`https://tile.openstreetmap.org/${z}/${x}/${y}.png`,x:pixel((x/n-left)*scale),y:pixel((y/n-top)*scale),size:pixel(tileSize)});
  }
  return {project,tiles:tiles.slice(0,24)};
}

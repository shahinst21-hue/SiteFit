import type {SnapshotMap} from './model.ts';
export const mapCategories={
 'food-service':{label:'Cafés / restaurants',detail:'Restaurant / Cafe / Canteen',icon:'coffee',colour:'#ffe4c3'},
 takeaway:{label:'Takeaways',detail:'Takeaway / sandwich shop',icon:'shop',colour:'#caf3aa'},
 retail:{label:'Food retail',detail:'Registered food retailers',icon:'shop',colour:'#ffffff'},
 'other-food':{label:'Other food records',detail:'Other FSA types',icon:'evidence',colour:'#e0e1e6'},
 transport:{label:'Transport stops',detail:'TfL registered stops',icon:'access',colour:'#cbedff'},
} as const;
export type MapCategory=keyof typeof mapCategories;
export function recordCategory(type:string,food:boolean):MapCategory{
 if(!food)return 'transport';
 if(type==='Restaurant/Cafe/Canteen')return 'food-service';
 if(type==='Takeaway/sandwich shop')return 'takeaway';
 if(type==='Retailers - other'||type==='Retailers - supermarkets/hypermarkets')return 'retail';
 return 'other-food';
}
/** Nominal straight-line distance between source coordinates, never a walking time. */
export function straightLine(a:[number,number],b:[number,number]){
 const rad=Math.PI/180,dlat=(b[1]-a[1])*rad,dlon=(b[0]-a[0])*rad;
 const h=Math.sin(dlat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dlon/2)**2;
 return 6371008.8*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function distanceLabel(metres:number){return metres<25?'Within ≈25 m':`≈${Math.round(metres/25)*25} m`;}
/** Measurement guide only; not an admitted catchment, route or premises boundary. */
export function distanceRing(origin:[number,number],metres:number):[number,number][]{
 const rad=Math.PI/180,lat=origin[1]*rad,lon=origin[0]*rad,angular=metres/6371008.8;
 return Array.from({length:73},(_,i)=>{const bearing=i/72*2*Math.PI,l=Math.asin(Math.sin(lat)*Math.cos(angular)+Math.cos(lat)*Math.sin(angular)*Math.cos(bearing));return [(lon+Math.atan2(Math.sin(bearing)*Math.sin(angular)*Math.cos(lat),Math.cos(angular)-Math.sin(lat)*Math.sin(l)))/rad,l/rad];});
}
export function populationUnits(value:number){
 if(!Number.isFinite(value)||value<0)return null;
 const unit=value<=600?25:value<=2400?100:10**Math.floor(Math.log10(Math.max(value,1))-1);
 return {unit,cells:Array.from({length:Math.ceil(value/unit)},(_,i)=>Math.min(1,(value-i*unit)/unit))};
}
export function competitionBars(groups:{label:string;count:number}[]){
 const top=groups.slice(0,3),other=groups.slice(3).reduce((sum,g)=>sum+g.count,0);
 return [...top,...(other?[{label:'Other registered types',count:other}]:[])];
}
export interface MapRecord {id:string;label:string;position:[number,number];category:MapCategory}
export function mapRecords(map:SnapshotMap):MapRecord[]{return map.layers.filter(l=>l.status==='available'&&l.kind!=='property').flatMap(l=>{const features=l.features??l.points.map((position,i)=>({id:l.id+':'+i,label:l.label,position,category:undefined}));return features.map(f=>({...f,category:f.category??(l.kind==='transport'?'transport':'other-food')}));});}
export function clusterRecords(records:ReturnType<typeof mapRecords>,project:(p:[number,number])=>number[],size=40,width=800,height=360){
 const groups=new Map<string,{x:number;y:number;category:MapCategory;records:ReturnType<typeof mapRecords>}>();
 for(const record of records){const [x,y]=project(record.position);if(x<0||x>width||y<0||y>height)continue;
  const key=`${record.category}:${Math.floor(x/size)}:${Math.floor(y/size)}`,group=groups.get(key);
  if(group)group.records.push(record);else groups.set(key,{x,y,category:record.category,records:[record]});
 }
 // Cluster anchors use a retained record coordinate, never an invented business point.
 return [...groups.values()];
}

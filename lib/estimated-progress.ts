/** Presentation estimate, never evidence of completed work or authority to show Ready. */
export function estimatedProgress(elapsedMs:number,ready:boolean){
 if(ready)return 100;
 const seconds=Math.max(0,elapsedMs)/1000;
 return Math.min(95,seconds<=60?seconds*1.5:90+5*(1-Math.exp(-(seconds-60)/60)));
}

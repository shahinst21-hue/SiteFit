'use client';
import {useEffect,useState} from 'react';
import {estimatedProgress} from '../lib/estimated-progress';
export function useEstimatedProgress(active:boolean,ready:boolean){
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{
  if(!active)return;
  const start=performance.now();
  const timer=setInterval(()=>setElapsed(performance.now()-start),250);
  return ()=>clearInterval(timer);
 },[active]);
 return {percent:estimatedProgress(elapsed,ready),slow:elapsed>=90000};
}

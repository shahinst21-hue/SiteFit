"use client";
import {useEffect} from 'react';
import {trackJourney,trackEcommerce,measurementEligible,bindAcquisition} from '@/lib/measurement/client';
import type {JourneyEvent} from '@/lib/measurement/events';
export function MeasurementMilestone({event,id,business,at}:{event:JourneyEvent;id:string;business?:string;at?:string}){
 useEffect(()=>{const emit=()=>{if(!measurementEligible(at))return;trackJourney(event,id,business);if(event==='free_report_viewed'){trackJourney('free_analysis_completed',id,business);void bindAcquisition(id);}};emit();window.addEventListener('sitefit-google-ready',emit);return()=>window.removeEventListener('sitefit-google-ready',emit);},[event,id,business,at]);return null;
}
export function PurchaseMeasurement({id}:{id:string}){
 useEffect(()=>{let active=true,started=false;const emit=()=>{if(!active||started)return;started=true;void trackEcommerce(id,'purchase');};
 // The transport itself checks consent; consent granted later can initiate the one authoritative claim.
 const ready=()=>{started=false;emit();};emit();window.addEventListener('sitefit-google-ready',ready);return()=>{active=false;window.removeEventListener('sitefit-google-ready',ready);};},[id]);return null;
}

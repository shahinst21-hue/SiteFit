"use client";
import {useRef,type ReactNode} from 'react';
import {Icon} from './icon';
import type {FactorId} from '@/lib/snapshot/model';

/** Shared free evidence presentation; no purchase or execution authority. */
export function SnapshotEvidenceDialog({id,title,label='Explore the evidence',detail,className='',children}:{id:string;title:string;label?:string;detail?:FactorId;className?:string;children:ReactNode}){
 const modal=useRef<HTMLDialogElement>(null);
 return <div className={`sf-evidence-details ${className}`}><button type="button" className="sf-evidence-trigger" id={id} data-snapshot-event={detail?'factor_open':undefined} data-snapshot-detail={detail} aria-haspopup="dialog" onClick={()=>modal.current?.showModal()}>{label}<Icon name="add"/></button>
 <dialog ref={modal} className="sf-evidence-dialog" aria-labelledby={`${id}-title`} onClick={event=>{if(event.target!==event.currentTarget)return;const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.currentTarget.close();}}>
 <header><div><span className="eyebrow">SUPPORTING EVIDENCE</span><h2 id={`${id}-title`}>{title}</h2></div><button type="button" aria-label={`Close ${title} evidence`} onClick={()=>modal.current?.close()}><Icon name="close"/></button></header>
 <div className="sf-evidence-scroll"><div className="sf-disclosure-body">{children}</div></div></dialog></div>;
}

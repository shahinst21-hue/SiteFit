'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export function TestingCreditButton({reportId,recover=false}:{reportId:string;recover?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter();
 async function start(){
  if(busy)return;setBusy(true);setError('');
  try{const response=await fetch('/api/reports/testing-credit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reportId,action:recover?'recover':'start'})});
   if(!response.ok){const data=await response.json();if(['testing_checkout_pending','testing_checkout_review'].includes(data.code)&&typeof data.error==='string'){setError(data.error);return;}throw Error();}router.push('/account');router.refresh();
  }catch{setError('Could not update this report. Check your balance and saved status before trying again.');}
  finally{setBusy(false);}
 }
 return <div><button type="button" className="button button-secondary" disabled={busy} onClick={start}>{busy?'Please wait…':recover?'Recover saved Full Report':'Use 1 Full Report testing credit'}</button><p role="status">{error}</p></div>;
}

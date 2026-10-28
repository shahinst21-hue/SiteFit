import type {ReactNode} from 'react';
import {redirect} from 'next/navigation';
import {verifiedUser} from '@/lib/supabase/server';
/** Authorize before the child loading boundary can stream any account response. */
export default async function AccountLayout({children}:{children:ReactNode}){
 const {client,user}=await verifiedUser();
 if(!client||!user)redirect('/login');
 return children;
}

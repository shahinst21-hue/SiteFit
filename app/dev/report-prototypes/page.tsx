import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {dashboardEnabled} from '@/lib/report-dashboard/gate';
import {OverviewPrototypes} from './prototypes';
import coffee from '@/tests/fixtures/dashboard/coffee-shop.json';
import '../../report-dashboard.css';
export const dynamic='force-dynamic';
export const metadata={title:'Overview prototypes',robots:{index:false,follow:false}};
export default async function Prototypes(){const host=(await headers()).get('host')?.split(':')[0]??'';if(process.env.NODE_ENV!=='development'&&!dashboardEnabled(process.env,host))notFound();return <OverviewPrototypes verdict={coffee.summary!.verdict} priority={coffee.summary!.priority}/>;}

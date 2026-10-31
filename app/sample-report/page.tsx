import {pageMetadata} from '@/lib/seo';
import {createSampleReport} from '@/lib/content/public-sample-report';
import {sampleSection} from '@/lib/report-dashboard/sample-display';
import {PublicSampleReport} from '@/components/public-sample-report';
import '../report-dashboard.css';
import './sample.css';

export const metadata = pageMetadata('/sample-report');
export default async function SampleReport({searchParams}:{searchParams?:Promise<{section?:string|string[]}>}={}) {
  const params=await searchParams;
  return <PublicSampleReport report={createSampleReport()} initial={sampleSection(params?.section)}/>;
}

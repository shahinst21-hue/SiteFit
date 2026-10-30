import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createSampleReport} from '../lib/content/public-sample-report.ts';
import {samplePdfPath} from '../lib/report-dashboard/sample-display.ts';
import {reportPages} from '../lib/report-dashboard/display.ts';
import {renderReportPDF} from '../lib/report-dashboard/pdf.ts';

// Build-only, authored public data. No environment loading, credentials, database or network.
const report=createSampleReport();
for(const section of [undefined,...reportPages.map(p=>p.key)]) {
  const target=path.join(process.cwd(),'public',samplePdfPath(section));
  await mkdir(path.dirname(target),{recursive:true});
  await writeFile(target,await renderReportPDF(report,section));
}
process.stdout.write('Generated 9 fictional sample PDFs from public-sample-v1.\n');

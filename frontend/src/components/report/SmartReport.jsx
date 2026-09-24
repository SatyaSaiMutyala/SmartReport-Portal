import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { Cover, KeyFindings, SystemsOverview } from './ReportOverview';
import { Disclaimer, IntegratedRead, OtherResults, RetestPlan, SystemSection } from './ReportSections';

export default function SmartReport({ report }) {
  const first = 3; // cover + key findings + systems overview come before the system sections
  const integratedNo = first + report.clusters.length;

  if (!report.counts.reported) {
    return (
      <Stack spacing={3}>
        <Cover report={report} />
        <Alert severity="warning">
          None of this visit&apos;s approved results are in the Smart Report interpretation database yet, so there is nothing to interpret.
        </Alert>
        <OtherResults unmapped={report.unmapped} pending={report.pending} />
      </Stack>
    );
  }

  return (
    <Stack spacing={5}>
      <Cover report={report} />
      {report.history.warning && (
        <Alert severity="warning" className="no-print">
          Trend graphs are unavailable for this report: {report.history.warning}
        </Alert>
      )}
      <KeyFindings report={report} />
      <SystemsOverview report={report} />
      {report.clusters.map((c, i) => (
        <SystemSection key={c.id} system={c} sectionNo={first + i} />
      ))}
      <IntegratedRead integrated={report.integrated} sectionNo={integratedNo} />
      <RetestPlan retest={report.retest} sectionNo={integratedNo + 1} />
      <OtherResults unmapped={report.unmapped} pending={report.pending} />
      <Disclaimer catalog={report.catalog} />
    </Stack>
  );
}

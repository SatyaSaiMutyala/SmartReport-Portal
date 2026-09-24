// Local stand-in for the TrustLab LIMS, for development and tests without touching live data.
// Mimics the real behaviour: GetReports.aspx redirects the first request of a new session to the
// login page, and GetPatientHistory.aspx demands the X-SmartReport-Key header.
//
//   node scripts/mock-lims.js            → http://localhost:5099/Trustlab
//   LIMS_BASE_URL=http://localhost:5099/Trustlab npm run dev
//
// Serves test/fixtures/lims-visit.json for any visitId; history = 3 earlier visits derived from it.
import http from 'node:http';
import fs from 'node:fs';
import 'dotenv/config';

const PORT = +(process.env.MOCK_LIMS_PORT || 5099);
const KEY = process.env.LIMS_HISTORY_KEY || 'mock-key-mock-key-mock-key';
const visit = JSON.parse(fs.readFileSync(new URL('../test/fixtures/lims-visit.json', import.meta.url), 'utf8'));

// Earlier visits: numeric values scaled so trends are visible; text results unchanged
const EARLIER = [
  { visit_no: 'DEMO-0000C', date: '2025-08-28 09:10', scale: 0.86 },
  { visit_no: 'DEMO-0000B', date: '2026-02-20 08:45', scale: 0.93 },
  { visit_no: 'DEMO-0000A', date: '2026-05-30 08:15', scale: 0.97 },
];
function history() {
  const out = [];
  EARLIER.slice()
    .reverse()
    .forEach((e) =>
      visit.response.tests
        .filter((t) => t.approved)
        .forEach((t) =>
          t.results
            .filter((r) => !r.is_comment)
            .forEach((r) => {
              const n = Number(r.result_value);
              const v = Number.isFinite(n) ? +(n * e.scale).toFixed(n >= 100 ? 0 : 2) : r.result_value;
              out.push({
                visit_no: e.visit_no,
                test_id: t.test_id,
                test_name: t.name,
                result_date: e.date,
                observation_id: r.observation_id,
                parameter_name: r.parameter_name,
                result_value: String(v),
                range_min: r.range_min,
                range_max: r.range_max,
                unit: r.unit,
                flag: '',
              });
            }),
        ),
    );
  return out;
}

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const visitId = url.searchParams.get('visitId');

    if (url.pathname === '/Trustlab/Design/Lab/GetReports.aspx') {
      if (!/ASP\.NET_SessionId=/.test(req.headers.cookie || '')) {
        res.writeHead(302, { Location: '/Trustlab/Design/Default.aspx', 'Set-Cookie': 'ASP.NET_SessionId=mock123; path=/; HttpOnly' });
        return res.end();
      }
      if (!visitId) return json(res, 200, { status: false, response: 'visitId or testId is required' });
      if (visitId === 'NOTFOUND') return json(res, 200, { status: false, response: 'No reports found' });
      return json(res, 200, { status: true, response: { ...visit.response, visit: { ...visit.response.visit, visit_id: visitId } } });
    }

    if (url.pathname === '/Trustlab/Design/Lab/GetPatientHistory.aspx') {
      if (req.headers['x-smartreport-key'] !== KEY) return json(res, 401, { status: false, response: 'Unauthorized' });
      const results = history();
      return json(res, 200, { status: true, response: { uhid: visit.response.visit.uhid, before_visit: visitId, months: 60, count: results.length, truncated: false, results } });
    }

    res.writeHead(404);
    res.end();
  })
  .listen(PORT, () => console.log(`Mock LIMS on http://localhost:${PORT}/Trustlab`));

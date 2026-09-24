// Read-only client for the TrustLab LIMS (ITDOSE on IIS).
//
//   GetReports.aspx?visitId=…         current visit: patient, tests, parameter results (JSON mode)
//   GetPatientHistory.aspx?visitId=…  earlier approved results of the same UHID (X-SmartReport-Key)
//
// Nothing fetched here is persisted; callers use it for one response and drop it.

const TIMEOUT_MS = 30000;

const base = () => (process.env.LIMS_BASE_URL || 'https://mytrustlab.in/Trustlab').replace(/\/$/, '');

class LimsError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

async function request(url, headers = {}) {
  // GetReports.aspx runs inside an ASP.NET session, and Global.asax redirects the FIRST request of
  // a new session to the login page. Keep the session cookie and ask again, as the mobile app does.
  let cookie = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        headers: { Accept: 'application/json', ...headers, ...(cookie ? { Cookie: cookie } : {}) },
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new LimsError(`LIMS unreachable (${err.name === 'TimeoutError' ? 'timed out' : err.message})`, 504);
    }
    if (res.status >= 300 && res.status < 400) {
      const set = res.headers.getSetCookie().map((c) => c.split(';')[0]);
      if (!set.length) throw new LimsError('LIMS redirected to its login page without a session');
      cookie = set.join('; ');
      continue;
    }
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new LimsError(`LIMS returned a non-JSON response (HTTP ${res.status})`);
    }
    return { httpStatus: res.status, body };
  }
  throw new LimsError('LIMS kept redirecting to its login page');
}

/** Current visit from GetReports.aspx JSON mode → {visit, tests} or throws 404 */
export async function fetchVisit(visitId) {
  const { body } = await request(`${base()}/Design/Lab/GetReports.aspx?visitId=${encodeURIComponent(visitId)}`);
  if (!body || body.status !== true) {
    const msg = (body && body.response) || 'No reports found';
    throw new LimsError(typeof msg === 'string' ? msg : 'No reports found', /no reports|not found/i.test(msg) ? 404 : 502);
  }
  return body.response;
}

/**
 * Earlier approved results for the visit's patient from GetPatientHistory.aspx.
 * History is an enhancement: when the key is missing or the call fails, the report still renders
 * without trends and the reason is returned for display.
 */
export async function fetchHistory(visitId) {
  const key = process.env.LIMS_HISTORY_KEY;
  if (!key) return { results: [], warning: 'History key not configured (LIMS_HISTORY_KEY)' };
  try {
    const { httpStatus, body } = await request(
      `${base()}/Design/Lab/GetPatientHistory.aspx?visitId=${encodeURIComponent(visitId)}`,
      { 'X-SmartReport-Key': key },
    );
    if (!body || body.status !== true) return { results: [], warning: `History unavailable (${(body && body.response) || 'HTTP ' + httpStatus})` };
    return { results: body.response.results || [], truncated: !!body.response.truncated };
  } catch (err) {
    return { results: [], warning: `History unavailable (${err.message})` };
  }
}

export { LimsError };

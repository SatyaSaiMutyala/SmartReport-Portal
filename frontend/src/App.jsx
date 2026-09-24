import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import SmartReport from './components/report/SmartReport';
import { errorMessage, getSmartReport } from './services/api';
import { tl } from './theme/theme';

// The visit number lives only in the address bar (?visit=…) so a report can be reopened or shared
// inside the lab; nothing about the patient is kept in the browser or on the server.
const visitFromUrl = () => new URLSearchParams(window.location.search).get('visit') || '';

export default function App() {
  const [input, setInput] = useState(visitFromUrl);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (visitNo) => {
    const v = visitNo.trim();
    if (!v) return;
    setLoading(true);
    setError('');
    setReport(null);
    const url = new URL(window.location.href);
    url.searchParams.set('visit', v);
    window.history.replaceState(null, '', url);
    try {
      const data = await getSmartReport(v);
      setReport(data);
      document.title = `Smart Report · ${data.patient.name || v}`;
    } catch (err) {
      setError(errorMessage(err));
      document.title = 'TrustLab Smart Report';
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const v = visitFromUrl();
    if (v) load(v);
  }, [load]);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Box className="no-print" sx={{ bgcolor: tl.forest, color: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.25, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mr: 'auto' }}>
            <Typography sx={{ fontFamily: tl.display, fontSize: 28, lineHeight: 1 }}>
              Smart<span style={{ color: tl.teal }}>Report</span>
            </Typography>
            <Typography sx={{ fontFamily: tl.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9DB8A8' }}>
              TrustLab Diagnostics
            </Typography>
          </Box>
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              load(input);
            }}
            sx={{ display: 'flex', gap: 1, flex: { xs: '1 1 100%', sm: '0 1 420px' } }}
          >
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Visit number (e.g. LTN…)"
              size="small"
              fullWidth
              autoFocus={!input}
              slotProps={{
                htmlInput: { 'aria-label': 'Visit number', spellCheck: false, autoComplete: 'off' },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: tl.ink3 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ bgcolor: '#fff', borderRadius: 1 }}
            />
            <Button type="submit" variant="contained" disabled={loading || !input.trim()} sx={{ px: 2.5 }}>
              Generate
            </Button>
          </Box>
          {report && (
            <Button startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.35)' }} variant="outlined">
              Print / PDF
            </Button>
          )}
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center', py: 10, color: tl.ink2 }}>
            <CircularProgress size={28} />
            <Typography>Fetching results and history from the LIMS…</Typography>
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !report && !error && (
          <Paper variant="outlined" sx={{ p: { xs: 4, md: 8 }, textAlign: 'center' }}>
            <Box component="img" src="/trustlab-logo.png" alt="TrustLab Diagnostics" sx={{ height: 56, mb: 3 }} />
            <Typography variant="h2" sx={{ fontSize: 44, mb: 1 }}>
              Smart Report
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
              Enter a visit number to read that patient&apos;s approved results by body system, with plain-language explanations, cross-system patterns and
              trend graphs from their earlier visits. Results are fetched live from the LIMS and are not stored.
            </Typography>
          </Paper>
        )}

        {report && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1.5px solid ${tl.forest}`, pb: 1, mb: 4 }}>
              <Box component="img" src="/trustlab-logo.png" alt="TrustLab Diagnostics" sx={{ height: 44 }} />
              <Typography sx={{ fontFamily: tl.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: tl.tealDark, textAlign: 'right' }}>
                {report.title} · {report.patient.name} · {report.patient.age}
              </Typography>
            </Box>
            <SmartReport report={report} />
          </Box>
        )}
      </Container>
    </Box>
  );
}

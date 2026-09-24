import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { tl } from '../../theme/theme';
import BandGauge from './BandGauge';
import TrendChart from './TrendChart';
import { StatusPill } from './common';

/** One result: value + band, gauge, ranges, what it means for this patient, and its trend */
export default function ParameterCard({ row, flagged }) {
  const tag = row.addon ? 'Add-on module' : row.calc ? 'Calculated' : '';
  const nrLabel = row.sexSpecific ? 'Normal (sex-adjusted)' : 'Normal';

  return (
    <Paper
      variant="outlined"
      className="avoid-break"
      sx={{ p: { xs: 2, md: 2.5 }, mb: 1.5, bgcolor: flagged ? tl.cream : '#fff', borderColor: flagged ? '#E9DFC4' : tl.line }}
    >
      <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: '1fr', md: '190px minmax(0,1fr) minmax(0,1.1fr)' } }}>
        {/* value */}
        <Box>
          <Typography variant="h5" sx={{ fontSize: 21, lineHeight: 1.05 }}>
            {row.name}
          </Typography>
          {tag && <Typography sx={{ fontFamily: tl.mono, fontSize: 10, color: tl.ink3, textTransform: 'uppercase', letterSpacing: '0.1em', mt: 0.25 }}>{tag}</Typography>}
          <Box sx={{ my: 1 }}>
            {row.numeric ? (
              <Typography sx={{ fontFamily: tl.display, fontSize: 42, lineHeight: 1, color: tl.forest }}>
                {row.display.replace(row.unit ? ` ${row.unit}` : '', '')}
                {row.unit && <Box component="small" sx={{ fontFamily: tl.mono, fontSize: 13, color: tl.ink2, ml: 0.75 }}>{row.unit}</Box>}
              </Typography>
            ) : (
              <Typography sx={{ fontFamily: tl.display, fontSize: 24, lineHeight: 1.1, color: tl.forest, textTransform: 'uppercase' }}>{row.display}</Typography>
            )}
          </Box>
          <StatusPill flag={row.flag} label={row.flag === 'na' ? 'Reported' : row.label} />
        </Box>

        {/* gauge + ranges */}
        <Box sx={{ minWidth: 0 }}>
          <BandGauge row={row} />
          <Box sx={{ mt: 1.25, borderLeft: `2px solid ${tl.teal}`, bgcolor: '#F3F6F4', px: 1.25, py: 0.75, fontFamily: tl.mono, fontSize: 11.5, color: tl.ink2, lineHeight: 1.6 }}>
            {nrLabel}: <b style={{ color: tl.ink }}>{row.normalRange || '—'}</b>
            {row.src && <> · {row.src}</>}
            {row.lab?.range && (
              <Tooltip title={`As printed by the lab for “${row.lab.name}” in ${row.lab.test}`}>
                <div>
                  Lab range: {row.lab.range}
                  {row.lab.unit && ` ${row.lab.unit}`}
                  {row.lab.flag && <b style={{ color: tl.ink }}> · Lab flag {row.lab.flag}</b>}
                </div>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* meaning */}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: tl.mono, fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', borderBottom: `1px solid ${tl.ink}`, pb: 0.5, mb: 1 }}>
            Significance
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {row.sig}
          </Typography>
          {row.fy && (
            <Typography variant="body2">
              <b>Your result:</b> {row.fy}
            </Typography>
          )}
        </Box>
      </Box>

      {row.numeric && (
        <Box sx={{ mt: 2 }}>
          <TrendChart row={row} />
        </Box>
      )}
    </Paper>
  );
}

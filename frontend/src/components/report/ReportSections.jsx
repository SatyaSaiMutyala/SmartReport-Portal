import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { status, tl } from '../../theme/theme';
import ParameterCard from './ParameterCard';
import { Kicker, SectionHeading, StatusPill } from './common';

const SubHead = ({ children, attention }) => (
  <Typography
    sx={{
      fontFamily: tl.mono,
      fontSize: 11,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: attention ? status.attention.fg : tl.tealDark,
      borderBottom: `1px solid ${tl.line}`,
      pb: 0.5,
      mt: 2.5,
      mb: 1.5,
    }}
  >
    {children}
  </Typography>
);

/** One body system: its story, then flagged values first, then the values that confirm it */
export function SystemSection({ system, sectionNo }) {
  const total = system.flagged.length + system.normal.length + system.unclassified.length;
  return (
    <Box id={`sys-${system.id}`} sx={{ scrollMarginTop: 80 }}>
      <SectionHeading
        kicker={`Section ${String(sectionNo).padStart(2, '0')} · ${total} parameter${total === 1 ? '' : 's'}`}
        title={system.name}
        description={system.caption}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <StatusPill flag={system.status} label={system.statusWord} />
        <Typography sx={{ fontFamily: tl.mono, fontSize: 11.5, color: tl.ink3 }}>
          {system.flagged.length} flagged · {system.normal.length} normal
        </Typography>
      </Box>
      <Box className="avoid-break" sx={{ borderLeft: `3px solid ${status[system.status].fg}`, bgcolor: tl.cream, px: 2, py: 1.5, borderRadius: '0 6px 6px 0' }}>
        <Typography>
          <b style={{ color: tl.forest }}>What this system is telling you.</b> {system.story}
        </Typography>
      </Box>
      {system.flagged.length > 0 && <SubHead attention>Values that need a closer look</SubHead>}
      {system.flagged.map((r) => (
        <ParameterCard key={r.id} row={r} flagged />
      ))}
      {system.normal.length > 0 && <SubHead>Values within range — and what they confirm</SubHead>}
      {system.normal.map((r) => (
        <ParameterCard key={r.id} row={r} />
      ))}
      {system.unclassified.length > 0 && <SubHead>Reported values</SubHead>}
      {system.unclassified.map((r) => (
        <ParameterCard key={r.id} row={r} />
      ))}
    </Box>
  );
}

/** "Putting it together" — cross-system patterns in priority order */
export function IntegratedRead({ integrated, sectionNo }) {
  const { intro, patterns, total } = integrated;
  return (
    <Box>
      <SectionHeading
        kicker={`Section ${String(sectionNo).padStart(2, '0')}`}
        title="Putting it together"
        description={`${total} recognised pattern${total === 1 ? ' was' : 's were'} found across your results.${
          patterns.length < total ? ` The ${patterns.length} that matter most are read together here, in order of priority.` : ''
        }`}
      />
      <Box sx={{ bgcolor: tl.forest, color: '#E9F0EC', borderRadius: 1.5, p: { xs: 2, md: 3 } }}>
        <Kicker color={tl.teal}>Integrated read</Kicker>
        <Typography variant="h4" sx={{ color: '#fff', fontSize: 32, mb: 1 }}>
          What your results say together
        </Typography>
        <Typography sx={{ color: '#DCE8E0', mb: 2.5 }}>{intro}</Typography>
        {!patterns.length && <Typography sx={{ color: '#DCE8E0' }}>No cross-system pattern was identified in this report.</Typography>}
        {patterns.map((p, i) => (
          <Box key={p.id} className="avoid-break" sx={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 1.25, mb: 2 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: tl.saffron,
                color: tl.forest,
                fontFamily: tl.display,
                fontSize: 17,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mt: '2px',
              }}
            >
              {i + 1}
            </Box>
            <Box>
              <Typography sx={{ color: '#DCE8E0' }}>
                <b style={{ color: '#fff' }}>{p.lead}</b> {p.text}
              </Typography>
              {p.evidence.length > 0 && (
                <Typography sx={{ fontFamily: tl.mono, fontSize: 12, color: '#9DB8A8', mt: 0.5 }}>{p.evidence.join(' · ')}</Typography>
              )}
              {p.next && <Typography sx={{ fontSize: 14, color: '#8FE8D6', mt: 0.5 }}>→ {p.next}</Typography>}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function RetestPlan({ retest, sectionNo }) {
  return (
    <Box>
      <SectionHeading kicker={`Section ${String(sectionNo).padStart(2, '0')}`} title="When to re-test" description="Based on what this report found. Your doctor may bring any of them forward." />
      <Paper variant="outlined" className="avoid-break" sx={{ p: 2, bgcolor: '#FDF6E3', borderColor: '#E8C98A' }}>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: `repeat(${retest.length}, 1fr)` } }}>
          {retest.map((r) => (
            <Box key={r.when} sx={{ bgcolor: '#fff', border: '1px solid #E8C98A', borderRadius: 1, p: 1.5, textAlign: 'center' }}>
              <Typography sx={{ fontFamily: tl.display, fontSize: 32, color: tl.forest, lineHeight: 1 }}>{r.when}</Typography>
              <Typography sx={{ fontFamily: tl.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: tl.ink2, mt: 1 }}>{r.items}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

/** Results the Smart Report does not interpret (not in the catalogue), plus tests still in progress */
export function OtherResults({ unmapped, pending }) {
  if (!unmapped.length && !pending.length) return null;
  return (
    <Box>
      <SectionHeading title="Other results" description="Reported by the lab but not part of the Smart Report interpretation database, and tests not yet approved." />
      {unmapped.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Test', 'Parameter', 'Result', 'Lab range', 'Flag'].map((h) => (
                  <TableCell key={h} sx={{ fontFamily: tl.mono, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: tl.ink3 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {unmapped.map((u, i) => (
                <TableRow key={i}>
                  <TableCell>{u.test}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                  <TableCell sx={{ fontFamily: tl.mono }}>
                    {u.value} {u.unit}
                  </TableCell>
                  <TableCell sx={{ fontFamily: tl.mono }}>{u.range || '—'}</TableCell>
                  <TableCell>{u.flag || ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      {pending.length > 0 && (
        <Alert severity="info" variant="outlined">
          Not yet approved, so not included: {pending.map((p) => p.name).join(', ')}.
        </Alert>
      )}
    </Box>
  );
}

export function Disclaimer({ catalog }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ borderTop: `1px solid ${tl.line}`, pt: 2 }}>
      <b>Important:</b> This Smart Report explains laboratory results in plain language; it is not a diagnosis. It must be interpreted by a qualified medical
      professional together with your clinical history and examination. The official laboratory report remains the authoritative record of your results.
      Explanations and pattern insights come from TrustLab&apos;s clinically reviewed interpretation database{catalog?.built ? ` (${catalog.built})` : ''}.
    </Typography>
  );
}

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { status, tl } from '../../theme/theme';
import { Field, Kicker, SectionHeading, StatusPill } from './common';
import { fmtDate } from './format';

function Stat({ value, label, color = tl.tealDark }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #BFE9DD', borderRadius: 1, px: 1.5, py: 1 }}>
      <Typography sx={{ fontFamily: tl.display, fontSize: 34, lineHeight: 1, color }}>{value}</Typography>
      <Typography sx={{ fontFamily: tl.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: tl.ink3, mt: 0.5 }}>{label}</Typography>
    </Box>
  );
}

/** Cover: patient/visit details, what the report covers, headline numbers */
export function Cover({ report }) {
  const { patient, visit, counts, title } = report;
  return (
    <Box className="avoid-break">
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1.2fr) minmax(0,1fr)' }, mb: 3 }}>
        <Box>
          <Kicker color={tl.ink3}>Patient wellness report · Smart Report</Kicker>
          <Typography variant="h1" sx={{ fontSize: { xs: 44, md: 60 }, lineHeight: 0.92, my: 1 }}>
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
            {counts.reported} parameters across {counts.systems} body systems, read <b>together</b> — each result explained, each system given its own
            story, and one integrated view of what your body is telling you today.
          </Typography>
        </Box>
        <Paper variant="outlined" sx={{ p: 2, borderLeft: `3px solid ${tl.teal}` }}>
          <Field label="Patient">{patient.name}</Field>
          <Field label="Age / Sex">
            {patient.age} · {patient.sex === 'female' ? 'Female' : 'Male'}
          </Field>
          <Field label="UHID">{patient.uhid}</Field>
          <Field label="Visit no.">{visit.visitNo}</Field>
          <Field label="Registered">{fmtDate(visit.entryDate)}</Field>
          <Field label="Reported">{fmtDate(visit.reportDate)}</Field>
          <Field label="Referred by">{patient.doctor}</Field>
          <Field label="Centre">{visit.centre}</Field>
        </Paper>
      </Box>
      <Box sx={{ bgcolor: '#E9F6F2', borderRadius: 1.5, p: 2 }}>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          <Stat value={counts.reported} label="Parameters read" />
          <Stat value={counts.systems} label="Body systems" />
          <Stat value={counts.attention + counts.borderline} label="Values flagged" color={counts.attention ? status.attention.fg : tl.tealDark} />
          <Stat value={counts.patterns} label="Patterns identified" />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5, fontSize: 13, color: tl.ink2 }}>
          {['normal', 'borderline', 'attention'].map((f) => (
            <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 22, height: 8, borderRadius: 0.5, bgcolor: status[f].fg }} />
              {f === 'normal' ? 'Optimal / normal' : f === 'borderline' ? 'Borderline — watch' : 'Needs attention'}
            </Box>
          ))}
          <Box>Gauge marker ▮ = your result</Box>
        </Box>
      </Box>
    </Box>
  );
}

function CountRow({ n, label, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, borderBottom: `1px solid ${tl.line}` }}>
      <Typography sx={{ fontFamily: tl.display, fontSize: 28, lineHeight: 1, minWidth: 44, color: color || tl.forest }}>{n}</Typography>
      <Typography sx={{ fontFamily: tl.mono, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: tl.ink3 }}>{label}</Typography>
    </Box>
  );
}

/** Key findings + counts */
export function KeyFindings({ report }) {
  const { clusters, counts } = report;
  const att = clusters.filter((c) => c.status === 'attention');
  const bord = clusters.filter((c) => c.status === 'borderline');
  const list = (a) => a.map((c) => c.name).join(', ').replace(/, ([^,]*)$/, ' and $1');
  let text;
  if (!att.length && !bord.length) text = `No body system in this report needs attention across the ${counts.systems} systems read.`;
  else
    text = `This report found ${att.length ? `values outside the reference range in ${list(att)}` : ''}${att.length && bord.length ? '; and ' : ''}${
      bord.length ? `values just outside it in ${list(bord)}` : ''
    }.${counts.systemsOptimal ? ' The remaining systems were within range.' : ''}`;

  return (
    <Box>
      <SectionHeading kicker="Section 01" title="Key findings" description="What this report found, and how many values sit inside or outside their reference ranges." />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) 300px' } }}>
        <Box className="avoid-break" sx={{ bgcolor: tl.forest, color: '#E9F0EC', borderRadius: 1.5, p: { xs: 2, md: 3 } }}>
          <Kicker color={tl.teal}>Key findings</Kicker>
          <Typography variant="h4" sx={{ color: '#fff', fontSize: 32, mb: 1 }}>
            What this report found
          </Typography>
          <Typography sx={{ color: '#DCE8E0', mb: 2 }}>{text}</Typography>
          {[...att, ...bord].map((c) => (
            <Box key={c.id} sx={{ bgcolor: 'rgba(255,255,255,.06)', borderLeft: `3px solid ${c.status === 'attention' ? '#E86A5E' : tl.saffron}`, px: 1.5, py: 1, mb: 1, borderRadius: '0 4px 4px 0' }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={{ color: '#fff', fontWeight: 700 }}>{c.name}</Typography>
                <Typography sx={{ fontFamily: tl.mono, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.status === 'attention' ? '#FF9D93' : '#FFD56B' }}>
                  {c.statusWord}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#C6D6CC' }}>
                {c.flagged.map((r) => r.name).join(', ')}
              </Typography>
            </Box>
          ))}
        </Box>
        <Paper variant="outlined" className="avoid-break" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ borderBottom: `1px solid ${tl.line}`, pb: 0.5 }}>
            Counted up
          </Typography>
          <CountRow n={counts.systemsAttention} label="Systems needing attention" color={status.attention.fg} />
          <CountRow n={counts.systemsBorderline} label="Borderline systems" color={status.borderline.fg} />
          <CountRow n={counts.systemsOptimal} label="Optimal systems" color={status.normal.fg} />
          <CountRow n={counts.attention} label="Values outside range" />
          <CountRow n={counts.borderline} label="Values borderline" />
          <CountRow n={counts.normal} label="Values within range" />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            A system <b>needs attention</b> when any of its values is clearly outside the reference range, and is <b>borderline</b> when two or more sit just
            outside it.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

/** Two-column grid of body-system cards linking to their sections */
export function SystemsOverview({ report }) {
  return (
    <Box>
      <SectionHeading kicker="Section 02" title="The systems, one by one" description="What each system covers, how yours is doing, and which values were flagged." />
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {report.clusters.map((c) => (
          <Paper
            key={c.id}
            variant="outlined"
            component="a"
            href={`#sys-${c.id}`}
            className="avoid-break"
            sx={{ p: 2, borderTop: `3px solid ${status[c.status].fg}`, textDecoration: 'none', color: 'inherit', '&:hover': { borderColor: tl.teal } }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Typography sx={{ fontFamily: tl.display, fontSize: 30, color: tl.teal, lineHeight: 1 }}>{String(c.no).padStart(2, '0')}</Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontSize: 20, lineHeight: 1 }}>
                  {c.name}
                </Typography>
                <Typography sx={{ fontFamily: tl.mono, fontSize: 10.5, color: tl.ink3, mt: 0.5 }}>
                  {c.flagged.length + c.normal.length + c.unclassified.length} markers · {c.flagged.length} flagged
                </Typography>
              </Box>
              <StatusPill flag={c.status} label={c.statusWord} size="sm" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {c.caption}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <Box component="span" sx={{ fontFamily: tl.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: tl.ink3, mr: 1 }}>
                {c.flagged.length ? 'Flagged' : 'Status'}
              </Box>
              {c.flagged.length ? c.flagged.map((r) => r.name).join(', ') : 'No values outside range'}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}

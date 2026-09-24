import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { status, tl } from '../../theme/theme';

/** Coloured status pill: normal · borderline · attention · na */
export function StatusPill({ flag = 'na', label, size = 'md' }) {
  const s = status[flag] || status.na;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: size === 'sm' ? 1 : 1.25,
        py: size === 'sm' ? 0.25 : 0.5,
        borderRadius: 99,
        bgcolor: s.bg,
        color: s.fg,
        fontFamily: tl.mono,
        fontSize: size === 'sm' ? 10 : 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
        '&::before': { content: '""', width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor', flex: 'none' },
      }}
    >
      {label || s.word}
    </Box>
  );
}

/** Mono overline label */
export function Kicker({ children, color = tl.tealDark, sx }) {
  return (
    <Typography variant="overline" component="div" sx={{ color, fontSize: 11, ...sx }}>
      {children}
    </Typography>
  );
}

/** Numbered section heading used throughout the report */
export function SectionHeading({ kicker, title, description, right }) {
  return (
    <Box
      className="avoid-break"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 2,
        borderBottom: `2px solid ${tl.forest}`,
        pb: 1,
        mb: 2,
      }}
    >
      <Box>
        {kicker && <Kicker>{kicker}</Kicker>}
        <Typography variant="h3" sx={{ fontSize: { xs: 30, md: 36 }, lineHeight: 1 }}>
          {title}
        </Typography>
      </Box>
      {(description || right) && (
        <Box sx={{ maxWidth: 520, textAlign: { md: 'right' } }}>
          {right}
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

/** Label/value line for detail panels */
export function Field({ label, children }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '112px 1fr', gap: 1.5, py: 0.5, borderBottom: `1px dotted ${tl.line}` }}>
      <Typography sx={{ fontFamily: tl.mono, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: tl.ink3, pt: '2px' }}>
        {label}
      </Typography>
      <Typography variant="body2">{children || '—'}</Typography>
    </Box>
  );
}

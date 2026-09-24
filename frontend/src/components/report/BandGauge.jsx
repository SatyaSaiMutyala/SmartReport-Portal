import Box from '@mui/material/Box';
import { bandColor, status, tl } from '../../theme/theme';

/**
 * Numeric results: one coloured segment per band (Low … High) with a marker at the patient's
 * value inside its band. Qualitative results: the possible outcomes, the patient's one highlighted.
 */
export default function BandGauge({ row }) {
  const { bands, band, frac, numeric, flag } = row;
  if (!bands.length) return null;

  if (!numeric) {
    return (
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {bands.map((b) => {
          const on = b.b === band;
          const s = status[on ? flag : 'na'];
          return (
            <Box
              key={b.b}
              sx={{
                flex: '1 1 0',
                minWidth: 72,
                px: 1,
                py: 0.75,
                textAlign: 'center',
                borderRadius: 1,
                border: `1px solid ${on ? s.fg : tl.line2}`,
                bgcolor: on ? s.bg : 'transparent',
                color: on ? s.fg : tl.ink3,
                fontFamily: tl.mono,
                fontSize: 10.5,
                fontWeight: on ? 700 : 400,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                lineHeight: 1.3,
              }}
            >
              {b.text || b.name}
            </Box>
          );
        })}
      </Box>
    );
  }

  const idx = bands.findIndex((b) => b.b === band);
  const left = idx >= 0 ? ((idx + frac) / bands.length) * 100 : 50;
  const cell = { flex: '1 1 0', textAlign: 'center', fontFamily: tl.mono, lineHeight: 1.15, px: '2px' };

  return (
    <Box role="img" aria-label={`Result in the ${bands[idx]?.name || 'unknown'} band`}>
      <Box sx={{ display: 'flex', mb: 0.5 }}>
        {bands.map((b) => (
          <Box key={b.b} sx={{ ...cell, fontSize: 10, color: b.b === band ? tl.ink : tl.ink3, fontWeight: b.b === band ? 700 : 400 }}>
            {b.name}
          </Box>
        ))}
      </Box>
      <Box sx={{ position: 'relative', display: 'flex', height: 10, borderRadius: 0.5, overflow: 'visible' }}>
        {bands.map((b, i) => (
          <Box
            key={b.b}
            sx={{
              flex: '1 1 0',
              bgcolor: bandColor[b.b],
              opacity: b.b === band ? 1 : 0.55,
              borderTopLeftRadius: i === 0 ? 3 : 0,
              borderBottomLeftRadius: i === 0 ? 3 : 0,
              borderTopRightRadius: i === bands.length - 1 ? 3 : 0,
              borderBottomRightRadius: i === bands.length - 1 ? 3 : 0,
            }}
          />
        ))}
        <Box
          sx={{
            position: 'absolute',
            top: -4,
            bottom: -4,
            width: 4,
            left: `${left}%`,
            transform: 'translateX(-50%)',
            bgcolor: tl.ink,
            borderRadius: 1,
            boxShadow: '0 0 0 2px #fff',
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', mt: 0.5 }}>
        {bands.map((b) => (
          <Box key={b.b} sx={{ ...cell, fontSize: 10, color: tl.ink3 }}>
            {b.text}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

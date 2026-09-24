import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { status, tl } from '../../theme/theme';
import { fmtDate, shortDate } from './format';

/** Diamond per reading: red when outside the normal range; the latest reading is solid and larger */
function ReadingDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  const r = payload.last ? 6 : 4.5;
  const fill = payload.last ? (payload.ok ? status.normal.fg : status.attention.fg) : payload.ok ? '#fff' : status.attention.fg;
  const stroke = payload.ok ? tl.forest : status.attention.fg;
  return <path d={`M${cx},${cy - r}L${cx + r},${cy}L${cx},${cy + r}L${cx - r},${cy}Z`} fill={fill} stroke={stroke} strokeWidth={1.4} />;
}

function niceNumber(v) {
  const a = Math.abs(v);
  if (a >= 1000) return Math.round(v).toLocaleString('en-IN');
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return String(+v.toFixed(1));
  return String(+v.toFixed(2));
}

/** Change summary line: "▲ Higher by 12% since 30-May-2026 (was 5.92 %)" */
function ChangeLine({ trend, unit }) {
  const { dir, pct, prev, curOk } = trend;
  const arrow = dir === 'up' ? '▲ Higher' : dir === 'dn' ? '▼ Lower' : '= Unchanged';
  const color = dir === 'eq' ? tl.ink2 : curOk ? tl.tealDark : status.attention.fg;
  return (
    <Typography variant="body2" sx={{ color: tl.ink2 }}>
      <Box component="b" sx={{ fontFamily: tl.mono, fontSize: 12.5, color }}>
        {arrow}
      </Box>
      {dir !== 'eq' && ` by ${Math.abs(pct).toFixed(0)}%`} since {fmtDate(prev.d)} (was {niceNumber(prev.v)}
      {unit ? ` ${unit}` : ''})
    </Typography>
  );
}

export default function TrendChart({ row }) {
  const { trend, unit } = row;
  if (!trend) {
    return (
      <Box sx={{ border: '1px dashed #E8C98A', bgcolor: '#FDF8EA', borderRadius: 1, px: 1.5, py: 1 }}>
        <Typography sx={{ fontFamily: tl.mono, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: tl.ink2 }}>
          Health trend
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No earlier result to compare — this value becomes the baseline your next report is read against.
        </Typography>
      </Box>
    );
  }

  const { series, normal } = trend;
  const inRange = (v) => (normal.min == null || v >= normal.min) && (normal.max == null || v <= normal.max);
  const data = series.map((p, i) => ({ ...p, ok: inRange(p.v), last: i === series.length - 1 }));
  const vals = series.map((p) => p.v);
  let lo = Math.min(...vals, normal.min ?? Infinity);
  let hi = Math.max(...vals, normal.max ?? -Infinity);
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const pad = (hi - lo) * 0.15;
  const domain = [+(lo - pad).toPrecision(4), +(hi + pad).toPrecision(4)];

  return (
    <Box sx={{ border: '1px solid #E8C98A', bgcolor: '#FDF8EA', borderRadius: 1, px: 1.5, pt: 1, pb: 1.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
        <Typography sx={{ fontFamily: tl.mono, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: tl.ink2 }}>
          Health trend · last {series.length} results
        </Typography>
        <ChangeLine trend={trend} unit={unit} />
      </Box>
      <Box sx={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#EFE3C4" vertical={false} />
            {(normal.min != null || normal.max != null) && (
              <ReferenceArea
                y1={normal.min ?? domain[0]}
                y2={normal.max ?? domain[1]}
                fill="#DDF3EA"
                fillOpacity={0.9}
                stroke="#9ED8C6"
                strokeDasharray="3 3"
                ifOverflow="hidden"
                label={{ value: 'Normal range', position: 'insideTopLeft', fontSize: 10, fill: tl.ink3, fontFamily: 'Space Mono' }}
              />
            )}
            <XAxis dataKey="d" tickFormatter={shortDate} tick={{ fontSize: 10.5, fill: tl.ink3, fontFamily: 'Space Mono' }} tickLine={false} axisLine={{ stroke: tl.line2 }} />
            <YAxis domain={domain} tickFormatter={niceNumber} width={52} tick={{ fontSize: 10.5, fill: tl.ink3, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v) => [`${niceNumber(v)}${unit ? ' ' + unit : ''}`, row.name]}
              labelFormatter={(d) => fmtDate(d)}
              contentStyle={{ borderRadius: 8, borderColor: tl.line2, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="v" stroke={tl.forest} strokeWidth={2} dot={<ReadingDot />} activeDot={{ r: 6 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <Typography variant="body2" sx={{ mt: 0.5, color: tl.ink2 }}>
        {trend.text}
      </Typography>
    </Box>
  );
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-02 10:20" → "02-Sep-2026 · 10:20" */
export function fmtDate(d) {
  const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/);
  if (!m) return d || '';
  return `${m[3]}-${MON[+m[2] - 1]}-${m[1]}${m[4] ? ` · ${m[4]}` : ''}`;
}

/** "2026-09-02" → "Sep 26" (chart axis) */
export function shortDate(d) {
  const m = String(d || '').match(/^(\d{4})-(\d{2})/);
  return m ? `${MON[+m[2] - 1]} ${m[1].slice(2)}` : d;
}

// Smart Report interpretation engine — ported from TrustLab Smart Report Studio v1.0 (ENGINE section)
// so a result is classified, clustered and pattern-matched exactly as the Studio does it.
// Pure functions over an in-memory catalogue ({params, clusters, packages, rules}); no I/O.

export const BAND_ORDER = ['lo', 'blo', 'n', 'bhi', 'hi'];
export const BAND_NAME = { lo: 'Low', blo: 'Borderline low', n: 'Normal', bhi: 'Borderline high', hi: 'High' };
const BAND_FLAG = { lo: 'attention', blo: 'borderline', n: 'normal', bhi: 'borderline', hi: 'attention' };
export const STATUS_WORD = { normal: 'Optimal', borderline: 'Borderline', attention: 'Needs attention' };
const STORY_KEY = { normal: 'optimal', borderline: 'borderline', attention: 'attention' };

export function norm(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[\s_\-–—/().:+,]+/g, ' ')
    .trim();
}

export function toNum(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const m = String(v).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function indian(n) {
  const neg = n < 0;
  let s = String(Math.abs(Math.round(n)));
  if (s.length > 3) s = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3);
  return (neg ? '-' : '') + s;
}

export function fmtNum(v) {
  if (v == null) return '';
  const a = Math.abs(v);
  if (Number.isInteger(v)) return a >= 1000 ? indian(v) : String(v);
  if (a >= 100) return v.toFixed(1);
  if (a >= 10) return v.toFixed(1).replace(/\.0$/, '');
  return String(+v.toFixed(2));
}

export function bandsFor(param, sex) {
  const b = param.bands || {};
  if (param.sex && sex && b[sex]) return b[sex];
  return b.any || b.male || b.female || [];
}

export function bandsOrdered(param, sex) {
  return bandsFor(param, sex)
    .slice()
    .sort((a, b) => BAND_ORDER.indexOf(a.b) - BAND_ORDER.indexOf(b.b));
}

const looksNumericValue = (raw) => typeof raw === 'number' || /^\s*[<>≤≥]?\s*-?\d/.test(String(raw));

/** Classify a result against a parameter's bands → {b, flag, label, text, num, band, frac} */
export function classify(param, sex, res) {
  const out = { b: null, flag: 'na', label: 'Not classified', text: '', num: null, band: null, frac: 0.5 };
  if (!param || res == null) return out;
  const raw = typeof res === 'object' ? res.v : res;
  if (raw == null || raw === '') return out;
  const bands = bandsOrdered(param, sex);
  if (!bands.length) return out;

  // explicit band override from the LIS
  if (typeof res === 'object' && res.band && BAND_FLAG[res.band]) {
    const bb = bands.find((x) => x.b === res.band) || { b: res.band, label: BAND_NAME[res.band], text: '' };
    return Object.assign(out, { b: bb.b, flag: BAND_FLAG[bb.b], label: bb.label || BAND_NAME[bb.b], text: bb.text || '', num: toNum(raw), band: bb });
  }

  const numeric = bands.some((b) => b.min != null || b.max != null);
  const n = toNum(raw);
  if (numeric && n != null && looksNumericValue(raw)) {
    let hit = bands.find((b) => (b.min == null || n >= b.min) && (b.max == null || n <= b.max));
    if (!hit) {
      // gap between bands (e.g. 12.95) → nearest boundary
      let best = null;
      let bd = Infinity;
      bands.forEach((b) => {
        [b.min, b.max].forEach((x) => {
          if (x != null && Math.abs(x - n) < bd) {
            bd = Math.abs(x - n);
            best = b;
          }
        });
      });
      hit = best || bands.find((b) => b.b === 'n') || bands[0];
    }
    let frac = 0.5;
    if (hit.min != null && hit.max != null && hit.max > hit.min) frac = (n - hit.min) / (hit.max - hit.min);
    else if (hit.min != null && hit.max == null) {
      const span = Math.max(hit.min * 0.5, 1);
      frac = Math.min(0.95, 0.1 + ((n - hit.min) / span) * 0.5);
    } else if (hit.max != null && hit.min == null) {
      const span = Math.max(hit.max * 0.5, 1);
      frac = Math.max(0.05, 0.9 - ((hit.max - n) / span) * 0.5);
    }
    frac = Math.max(0.04, Math.min(0.96, frac));
    return Object.assign(out, { b: hit.b, flag: BAND_FLAG[hit.b], label: hit.label || BAND_NAME[hit.b], text: hit.text || '', num: n, band: hit, frac });
  }

  // qualitative / descriptive matching
  const v = norm(raw);
  const bk = BAND_ORDER.find((k) => k === v || BAND_NAME[k].toLowerCase() === v);
  if (bk) {
    const bb = bands.find((x) => x.b === bk);
    if (bb) return Object.assign(out, { b: bb.b, flag: BAND_FLAG[bb.b], label: bb.label, text: bb.text, band: bb });
  }
  const opts = (s) =>
    String(s || '')
      .split(/\s*(?:\/|\bor\b|,)\s*/)
      .map(norm)
      .filter(Boolean);
  const cands = bands.map((b) => ({
    b,
    strs: [norm(b.text), norm(b.label), ...opts(b.text), ...opts(b.label), ...opts(String(b.text || '').replace(/\(.*?\)/g, ''))].filter(Boolean),
  }));
  let hit = cands.find((c) => c.strs.some((s) => s === v));
  if (!hit) hit = cands.find((c) => c.strs.some((s) => s.startsWith(v) || v.startsWith(s)));
  if (!hit) {
    const vt = v.split(' ').filter((t) => t.length > 2);
    const best = cands
      .map((c) => ({ c, score: Math.max(...c.strs.map((s) => vt.filter((t) => s.split(' ').includes(t)).length)) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)[0];
    hit = best && best.c;
  }
  if (!hit) {
    // synonyms
    const NEG = ['negative', 'not detected', 'non reactive', 'nonreactive', 'absent', 'nil', 'no growth', 'normal', 'not significant', 'no deletion', 'wild type', 'intact', 'clear', 'pale yellow', 'unremarkable', 'immune', 'no parasites'];
    const POS = ['positive', 'detected', 'reactive', 'present', 'abnormal', 'significant', 'deletion', 'homozygous', 'monoclonal', 'turbid', 'growth', 'parasites seen'];
    if (NEG.some((s) => v.includes(s))) hit = cands.find((c) => c.b.b === 'n');
    else if (POS.some((s) => v.includes(s))) hit = cands.find((c) => c.b.b === 'hi') || cands.find((c) => c.b.b === 'bhi');
    else if (/equivocal|indeterminate|borderline|trace|weak|heterozygous|low titre|1\+|\+/.test(v))
      hit = cands.find((c) => c.b.b === 'bhi') || cands.find((c) => c.b.b === 'blo');
  }
  if (!hit) return out;
  const bb = hit.b;
  return Object.assign(out, { b: bb.b, flag: BAND_FLAG[bb.b], label: bb.label || BAND_NAME[bb.b], text: bb.text || '', band: bb });
}

/** Worst member flag, except a single borderline member keeps the system Optimal */
export function clusterStatus(flags) {
  const f = flags.filter((x) => x !== 'na');
  if (f.includes('attention')) return 'attention';
  return f.filter((x) => x === 'borderline').length >= 2 ? 'borderline' : 'normal';
}

function fyText(param, b) {
  if (!b) return '';
  const fy = param.fy || {};
  if (fy[b]) return fy[b];
  const fb = { blo: ['lo', 'n'], bhi: ['hi', 'n'], lo: ['blo', 'n'], hi: ['bhi', 'n'], n: ['n'] }[b] || [];
  for (const k of fb) if (fy[k]) return fy[k];
  return '';
}

function normalRangeText(param, sex) {
  const b = bandsFor(param, sex).find((x) => x.b === 'n');
  if (b && b.text) return b.text;
  const r = param.rng && param.rng.n;
  if (!r) return '';
  if (param.sex && sex) {
    const m = r.match(/M:\s*([^|]+)\|\s*F:\s*(.+)/);
    if (m) return (sex === 'male' ? m[1] : m[2]).trim();
  }
  return r;
}

/** History + current value → trend summary for the chart and sentence */
export function trendFor(p, sex, res) {
  const hist = (res.hist || [])
    .map((h) => ({ d: h.d, v: toNum(h.v) }))
    .filter((h) => h.v != null && h.d)
    .sort((a, b) => a.d.localeCompare(b.d));
  const cur = toNum(res.v);
  if (!hist.length || cur == null) return null;
  const prev = hist[hist.length - 1];
  const pct = prev.v ? ((cur - prev.v) / Math.abs(prev.v)) * 100 : 0;
  const dir = Math.abs(pct) < 2 ? 'eq' : pct > 0 ? 'up' : 'dn';
  const nb = bandsFor(p, sex).find((b) => b.b === 'n') || {};
  const inRange = (v) => (nb.min == null || v >= nb.min) && (nb.max == null || v <= nb.max);
  const all = hist.concat([{ d: res.date || '', v: cur }]);
  const outs = all.map((x) => !inRange(x.v));
  let tail = 0;
  for (let i = outs.length - 1; i >= 0 && outs[i]; i--) tail++;
  const first = all[0].v;
  const driftPct = first ? ((cur - first) / Math.abs(first)) * 100 : 0;
  const drift = Math.abs(driftPct) < 5 ? 'has held broadly steady' : driftPct > 0 ? 'has drifted upward' : 'has drifted downward';
  let range;
  if (tail === 0 && outs.every((x) => !x)) range = 'every reading has stayed inside the range';
  else if (tail === all.length) range = 'has been outside the range throughout';
  else if (tail > 0) range = `has been outside the range for the last ${tail} reading${tail > 1 ? 's' : ''}`;
  else range = 'the latest reading is back inside the range';
  return {
    prev,
    pct,
    dir,
    n: all.length,
    text: `Across your last ${all.length} tests this ${drift} and ${range}.`,
    series: all,
    normal: { min: nb.min ?? null, max: nb.max ?? null },
    curOk: inRange(cur),
  };
}

const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);
function shortName(p) {
  const a = (p.alias || '').split(',')[0].trim();
  return (a && a.length <= 8 ? a : p.name).replace(/\s*\(.*?\)\s*/g, ' ').trim();
}
export function titleCase(n) {
  return n.replace(/\b[A-Z][A-Z]+\b/g, (w) => (w.length > 3 ? w[0] + w.slice(1).toLowerCase() : w));
}
export function shortPkg(n) {
  return titleCase(n.replace(/^TRUST\s+/i, '').replace(/\bTOTAL HEALTH\b/i, '').replace(/\s+/g, ' ').trim());
}

function autoRetest(reported, pkgLabel) {
  const buckets = {};
  reported
    .filter((r) => r.cls.flag !== 'normal' && r.cls.flag !== 'na')
    .forEach((r) => {
      const m = (r.p.retest || '').match(/(\d+)\s*(?:[–-]\s*\d+\s*)?(week|wk|month|mo|year|yr)/i);
      let key = '3 mo';
      if (m) {
        const n = +m[1];
        const u = m[2].toLowerCase();
        key = u.startsWith('w') ? `${n} wk` : u.startsWith('y') ? `${n * 12} mo` : `${n} mo`;
      }
      (buckets[key] = buckets[key] || []).push(shortName(r.p));
    });
  const order = (k) => {
    const [n, u] = k.split(' ');
    return +n * (u === 'wk' ? 1 : 4.33);
  };
  const out = Object.keys(buckets)
    .sort((a, b) => buckets[b].length - buckets[a].length || order(a) - order(b))
    .slice(0, 2)
    .sort((a, b) => order(a) - order(b))
    .map((k) => ({ when: k, items: uniq(buckets[k]).slice(0, 10).join(' · ') }));
  out.push({ when: '12 mo', items: 'Full ' + pkgLabel });
  return out;
}

function autoIntro(M, title, clusterById) {
  const clNames = M.fired
    .slice(0, 7)
    .flatMap((f) => f.rule.clusters)
    .filter((x, i, a) => a.indexOf(x) === i)
    .map((id) => (clusterById[id] ? clusterById[id].name : id));
  const flagged = M.nAtt + M.nBord;
  if (!M.fired.length || (M.fired.length === 1 && M.fired[0].rule.logic === 'special')) {
    return `${title} reads body systems, not numbers. ${
      flagged === 0
        ? 'No value in this report sits outside its reference range, and no cross-system pattern was identified.'
        : 'The flagged values in this report do not combine into a recognised cross-system pattern; each is explained in its own section.'
    }`;
  }
  const across = clNames.length ? ' across ' + clNames.slice(0, 4).join(', ').replace(/, ([^,]*)$/, ' and $1') : '';
  return `${title} reads body systems, not numbers. ${flagged} of your ${M.reported.length} values sit outside or at the edge of their reference ranges, and ${M.fired.length} recognised pattern${M.fired.length === 1 ? '' : 's'} link${M.fired.length === 1 ? 's' : ''} them${across}. The patterns below are listed in order of priority, each with the values behind it and a sensible next step. None of this is a diagnosis: your doctor reads these together with your history and examination.`;
}

function displayValue(r) {
  const raw = r.res.v;
  if (r.cls.num != null && looksNumericValue(raw)) return fmtNum(r.cls.num) + (r.p.unit ? ' ' + r.p.unit : '');
  return String(raw);
}

const FEMALE_ONLY = /pregnan|conception|IVF|ovar|menstru|PCOS|menopaus|fertility|implantation/i;
const MALE_ONLY = /prostate|PSA|andropause|erectile/i;

/**
 * Evaluate one patient's results.
 *
 * @param catalog  {params, clusterById, clusters, rules}
 * @param input    {sex: 'male'|'female', pkg: package doc or null, results: {TLP id: {v, hist, date, band?, lab?}}}
 * @param options  {topPatterns}
 *
 * pkg = null → "reported parameters" mode: every recognised parameter is reported under its home
 * cluster, and every pattern rule may fire (still gated by clusters present and sex).
 */
export function evaluate(catalog, { sex, pkg, results }, { topPatterns = 7 } = {}) {
  const { params: P, clusterById: CL, clusters: allClusters, rules } = catalog;

  const entries = pkg
    ? pkg.params.filter((pr) => P[pr.id])
    : Object.keys(results)
        .filter((id) => P[id])
        .map((id) => ({ id, cl: P[id].cl, addon: false }));

  const rows = [];
  const byId = {};
  entries.forEach((pr) => {
    if (byId[pr.id]) return;
    const p = P[pr.id];
    const res = results[pr.id];
    const has = !!res && res.v != null && res.v !== '';
    const cls = has ? classify(p, sex, res) : { b: null, flag: 'na', label: '', text: '', num: null, frac: 0.5 };
    const row = { id: pr.id, p, pr, res, has, cls, cl: pr.cl };
    rows.push(row);
    byId[pr.id] = row;
  });
  const reported = rows.filter((r) => r.has);

  const clusterOrder = pkg
    ? pkg.clusters.slice().sort((a, b) => a.order - b.order).map((c) => c.cl)
    : allClusters.slice().sort((a, b) => a.order - b.order).map((c) => c.id);
  const clusters = clusterOrder
    .map((id) => {
      const rep = reported.filter((r) => r.cl === id);
      return {
        id,
        def: CL[id],
        reported: rep,
        flagged: rep.filter((r) => r.cls.flag === 'borderline' || r.cls.flag === 'attention'),
        normal: rep.filter((r) => r.cls.flag === 'normal'),
        unclassified: rep.filter((r) => r.cls.flag === 'na'),
        status: clusterStatus(rep.map((r) => r.cls.flag)),
      };
    })
    .filter((c) => c.def && c.reported.length > 0);

  const bandOf = Object.fromEntries(reported.map((r) => [r.id, r.cls.b]));
  const nAtt = reported.filter((r) => r.cls.flag === 'attention').length;
  const nBord = reported.filter((r) => r.cls.flag === 'borderline').length;
  const nNorm = reported.filter((r) => r.cls.flag === 'normal').length;

  const presentCl = new Set(clusters.map((c) => c.id));
  const fired = [];
  rules.forEach((rule) => {
    if (pkg && rule.packages.length && !rule.packages.includes(pkg.name)) return;
    if (rule.clusters.length && !rule.clusters.every((id) => presentCl.has(id))) return;
    const txt = (rule.pattern || '') + ' ' + (rule.lead || '');
    if (sex === 'male' && FEMALE_ONLY.test(txt)) return;
    if (sex === 'female' && MALE_ONLY.test(txt)) return;
    let ok = false;
    if (rule.logic === 'special') {
      if (rule.special === 'all_normal') ok = reported.length > 0 && nAtt === 0 && nBord === 0;
      else if (rule.special === 'single_borderline') ok = nAtt === 0 && nBord === 1;
    } else {
      const hits = rule.conds.filter((cd) => bandOf[cd.p] && cd.bands.includes(bandOf[cd.p]));
      if (rule.logic === 'all') ok = rule.conds.every((cd) => bandOf[cd.p] != null) && hits.length === rule.conds.length;
      else ok = hits.length >= (rule.n || 1);
    }
    if (ok) {
      const evidence = rule.conds
        .map((cd) => byId[cd.p])
        .filter((r) => r && r.has && rule.conds.some((cd) => cd.p === r.id && cd.bands.includes(r.cls.b)))
        .map((r) => `${r.p.name} ${displayValue(r)}`);
      fired.push({ rule, evidence });
    }
  });
  fired.sort((a, b) => a.rule.pri - b.rule.pri || a.rule.id.localeCompare(b.rule.id));

  const title = pkg ? shortPkg(pkg.name) : 'Your Smart Report';
  const M = { reported, nAtt, nBord, fired };

  // ── Serialise for the client: plain JSON, no catalogue internals it does not need ──
  const rowOut = (r) => {
    const p = r.p;
    const trend = trendFor(p, sex, r.res);
    return {
      id: r.id,
      name: p.name,
      dn: p.dn,
      unit: p.unit,
      type: p.type,
      calc: !!p.calc,
      addon: !!r.pr.addon,
      value: r.res.v,
      display: displayValue(r),
      numeric: r.cls.num != null && looksNumericValue(r.res.v),
      num: r.cls.num,
      band: r.cls.b,
      flag: r.cls.flag,
      label: r.cls.label,
      frac: r.cls.frac,
      bands: bandsOrdered(p, sex).map((b) => ({ b: b.b, name: BAND_NAME[b.b], label: b.label, text: b.text, min: b.min, max: b.max })),
      normalRange: normalRangeText(p, sex),
      sexSpecific: !!p.sex,
      src: p.src ? p.src.split(';')[0].trim() : '',
      meas: p.meas,
      sig: p.sig,
      fy: fyText(p, r.cls.b),
      review: !!p.review,
      lab: r.res.lab || null, // what the LIMS printed: name, range, flag, test
      trend,
    };
  };

  return {
    title,
    package: pkg ? { name: pkg.name, title, q: pkg.q } : null,
    counts: {
      reported: reported.length,
      attention: nAtt,
      borderline: nBord,
      normal: nNorm,
      systems: clusters.length,
      systemsAttention: clusters.filter((c) => c.status === 'attention').length,
      systemsBorderline: clusters.filter((c) => c.status === 'borderline').length,
      systemsOptimal: clusters.filter((c) => c.status === 'normal').length,
      patterns: fired.length,
    },
    clusters: clusters.map((c, i) => ({
      id: c.id,
      no: i + 1,
      name: c.def.name,
      caption: c.def.caption,
      status: c.status,
      statusWord: STATUS_WORD[c.status],
      story: (c.def.story || {})[STORY_KEY[c.status]] || '',
      flagged: c.flagged.map(rowOut),
      normal: c.normal.map(rowOut),
      unclassified: c.unclassified.map(rowOut),
    })),
    integrated: {
      intro: autoIntro(M, title, CL),
      total: fired.length,
      patterns: fired.slice(0, topPatterns).map((f) => ({
        id: f.rule.id,
        pattern: f.rule.pattern,
        lead: f.rule.lead || f.rule.pattern,
        text: f.rule.text,
        next: f.rule.next,
        priority: f.rule.pri,
        evidence: f.evidence,
      })),
    },
    retest: autoRetest(reported, pkg ? shortPkg(pkg.name) : 'panel'),
  };
}

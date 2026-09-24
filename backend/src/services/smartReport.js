import { evaluate } from '../engine/interpret.js';
import { getCatalog, resolveParameter, resolvePackage } from './catalog.js';
import { fetchVisit, fetchHistory } from './lims.js';

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** LIMS dates: "02-Sep-2026 10:20 AM" (GetReports) or "2026-09-02 10:20" (history) → "YYYY-MM-DD HH:mm" */
export function limsDate(s) {
  if (!s) return '';
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 16);
  const m = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i);
  if (!m || !MON[m[2].toLowerCase()]) return '';
  let h = m[4] ? +m[4] : 0;
  if (m[6]) h = (h % 12) + (m[6].toUpperCase() === 'PM' ? 12 : 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${m[3]}-${pad(MON[m[2].toLowerCase()])}-${pad(m[1])}` + (m[4] ? ` ${pad(h)}:${m[5]}` : '');
}

const isTruthy = (v) => v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
const clean = (v) => (v == null ? '' : String(v).trim());

function parseAge(age) {
  const m = String(age || '').match(/(\d+(?:\.\d+)?)\s*(y|m|d)?/i);
  if (!m) return { years: null, text: clean(age) };
  const n = +m[1];
  const u = (m[2] || 'y').toLowerCase();
  return { years: u === 'y' ? n : u === 'm' ? +(n / 12).toFixed(1) : +(n / 365).toFixed(2), text: clean(age) };
}

function maskMobile(m) {
  const d = String(m || '').replace(/\D/g, '');
  return d.length >= 6 ? `${d.slice(0, 2)}••••••${d.slice(-2)}` : '';
}

const labRange = (min, max) => {
  const a = clean(min);
  const b = clean(max);
  if (a && b) return `${a} – ${b}`;
  if (a) return `≥ ${a}`;
  if (b) return `≤ ${b}`;
  return '';
};

/**
 * Build a Smart Report for one LIMS visit. Everything is computed in memory for this response.
 * options.package: catalogue package name to read the results through (else auto-detected).
 */
export async function buildSmartReport(visitId, options = {}) {
  const [catalog, lims, history] = await Promise.all([getCatalog(), fetchVisit(visitId), fetchHistory(visitId)]);
  const visit = lims.visit || {};
  const tests = lims.tests || [];
  const sex = /^f/i.test(clean(visit.gender)) ? 'female' : 'male';

  // ── 1. Current results → TLP ids ──
  const results = {};
  const obsToTlp = new Map(); // LIMS observation id → TLP id, reused to line up history exactly
  const unmapped = [];
  const pending = [];
  let latestApproved = '';

  tests.forEach((t) => {
    if (!t.approved) {
      pending.push({ name: t.name, department: t.department, status: t.status });
      return;
    }
    const date = limsDate(t.approved_date) || limsDate(visit.entry_date);
    if (date > latestApproved) latestApproved = date;
    (t.results || []).forEach((r) => {
      const value = clean(r.result_value);
      if (!value || isTruthy(r.is_comment)) return;
      const { id } = resolveParameter(catalog, r.parameter_name, `${t.name} ${t.department}`);
      const lab = { name: clean(r.parameter_name), test: clean(t.name), range: labRange(r.range_min, r.range_max), unit: clean(r.unit), flag: clean(r.flag), method: clean(r.method) };
      if (!id) {
        unmapped.push({ ...lab, value });
        return;
      }
      if (r.observation_id != null) obsToTlp.set(String(r.observation_id), id);
      if (results[id]) return; // same analyte reported by two tests: keep the first
      results[id] = { v: value, date: date.slice(0, 10), hist: [], lab };
    });
  });

  // ── 2. History (earlier visits) → the same TLP ids, one point per visit ──
  const seen = new Set();
  (history.results || []).forEach((h) => {
    const id =
      (h.observation_id != null && obsToTlp.get(String(h.observation_id))) ||
      resolveParameter(catalog, h.parameter_name, h.test_name).id;
    if (!id || !results[id]) return;
    const d = limsDate(h.result_date).slice(0, 10);
    const key = `${id}|${h.visit_no}`;
    if (!d || seen.has(key) || clean(h.result_value) === '') return;
    seen.add(key);
    results[id].hist.push({ d, v: clean(h.result_value) });
  });

  // ── 3. Package: explicit, else a LIMS test named like a catalogue package, else reported-parameters mode ──
  let pkg = null;
  if (options.package) {
    pkg = catalog.packages[options.package] || resolvePackage(catalog, [options.package]);
    if (!pkg) throw Object.assign(new Error(`Unknown package: ${options.package}`), { status: 400 });
  } else {
    pkg = resolvePackage(catalog, tests.map((t) => t.name));
  }

  const model = evaluate(catalog, { sex, pkg, results });
  const age = parseAge(visit.age);

  return {
    generatedAt: new Date().toISOString(),
    catalog: catalog.meta,
    patient: {
      name: clean(visit.patient_name),
      age: age.text,
      ageYears: age.years,
      sex,
      uhid: clean(visit.uhid),
      mobile: maskMobile(visit.mobile),
      doctor: clean(visit.doctor),
    },
    visit: {
      visitNo: clean(visit.visit_id) || visitId,
      centre: clean(visit.centre),
      entryDate: limsDate(visit.entry_date),
      reportDate: latestApproved,
      tests: tests.filter((t) => t.approved).map((t) => t.name),
    },
    ...model,
    unmapped,
    pending,
    history: {
      points: [...seen].length,
      warning: history.warning || null,
      truncated: !!history.truncated,
    },
  };
}

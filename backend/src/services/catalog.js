import Parameter from '../models/Parameter.js';
import Cluster from '../models/Cluster.js';
import Package from '../models/Package.js';
import Rule from '../models/Rule.js';
import Setting from '../models/Setting.js';
import ParameterMap from '../models/ParameterMap.js';
import { norm } from '../engine/interpret.js';

// The catalogue is small (≈1.5 MB) and read on every report, so it is held in memory and
// reloaded periodically; `npm run seed` or a mapping edit takes effect within TTL_MS.
const TTL_MS = 10 * 60 * 1000;
let cache = null;
let loadedAt = 0;
let loading = null;

// Words that LIMS names add in front of an analyte without changing what it is
const PREFIXES = /^(serum|s|plasma|blood|urine|u|total|estimation of|est of)\s+/;

function nameKeys(s) {
  const keys = new Set();
  const n = norm(s);
  if (!n) return keys;
  keys.add(n);
  const noParen = norm(String(s).replace(/\(.*?\)/g, ' '));
  if (noParen) keys.add(noParen);
  keys.add(n.replace(PREFIXES, ''));
  if (noParen) keys.add(noParen.replace(PREFIXES, ''));
  return keys;
}

async function load() {
  const [params, clusters, packages, rules, catalogSetting, maps] = await Promise.all([
    Parameter.find().lean(),
    Cluster.find().lean(),
    Package.find().lean(),
    Rule.find().lean(),
    Setting.findById('catalog').lean(),
    ParameterMap.find().lean(),
  ]);
  if (!params.length) throw Object.assign(new Error('Catalogue is empty — run npm run seed'), { status: 503 });

  // Same shape the Studio engine uses: `id` fields, params keyed by TLP id, packages by name
  const P = Object.fromEntries(params.map(({ _id, ...p }) => [_id, { id: _id, ...p }]));
  const clusterList = clusters.map(({ _id, ...c }) => ({ id: _id, ...c }));
  const pkgByName = Object.fromEntries(packages.map(({ _id, ...p }) => [_id, { name: _id, ...p }]));

  // name / alias / display-name index → candidate TLP ids (a key can be shared, e.g. "RBC")
  const index = new Map();
  const add = (key, id, weight) => {
    if (!key) return;
    const list = index.get(key) || [];
    if (!list.some((c) => c.id === id)) list.push({ id, weight });
    index.set(key, list);
  };
  Object.values(P).forEach((p) => {
    nameKeys(p.name).forEach((k) => add(k, p.id, 3));
    (p.alias || '').split(',').forEach((a) => nameKeys(a).forEach((k) => add(k, p.id, 2)));
    nameKeys(p.dn).forEach((k) => add(k, p.id, 1));
  });

  return {
    params: P,
    clusters: clusterList,
    clusterById: Object.fromEntries(clusterList.map((c) => [c.id, c])),
    packages: pkgByName,
    rules: rules.map(({ _id, ...r }) => ({ id: _id, ...r })),
    meta: catalogSetting ? { built: catalogSetting.value.built, catalogue: catalogSetting.value.catalogue } : {},
    index,
    manual: new Map(maps.map((m) => [m._id, m.tlp])),
  };
}

export async function getCatalog() {
  if (cache && Date.now() - loadedAt < TTL_MS) return cache;
  if (!loading) {
    loading = load()
      .then((c) => {
        cache = c;
        loadedAt = Date.now();
        return c;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

export function invalidateCatalog() {
  loadedAt = 0;
}

/**
 * Resolve a LIMS observation name to a TLP id.
 * Manual mappings win; otherwise catalogue name > alias > display name, and where one key fits
 * several parameters (e.g. "RBC" in blood and in urine) the test's name/department decides.
 * Returns {id, via} or {id: null} — manual null means "deliberately not interpreted".
 */
export function resolveParameter(catalog, limsName, context = '') {
  const key = norm(limsName);
  if (catalog.manual.has(key)) return { id: catalog.manual.get(key), via: 'manual' };

  // an exact normalised match outranks one found only after stripping words/brackets
  const seen = new Map();
  nameKeys(limsName).forEach((k) =>
    (catalog.index.get(k) || []).forEach((c) => {
      const w = c.weight + (k === key ? 5 : 0);
      seen.set(c.id, Math.max(seen.get(c.id) || 0, w));
    }),
  );
  if (!seen.size) return { id: null, via: null };

  const ctx = norm(context);
  const ctxWords = new Set(ctx.split(' ').filter((w) => w.length > 2));
  const urineCtx = /\burine|urinalysis|\bcue\b|routine urine/.test(ctx);
  const score = (id) => {
    const p = catalog.params[id];
    const hay = norm(`${p.profile} ${p.sample}`);
    let s = seen.get(id) * 10;
    hay.split(' ').forEach((w) => {
      if (ctxWords.has(w)) s += 1;
    });
    if (/urine/.test(hay) === urineCtx) s += 5;
    return s;
  };
  const best = [...seen.keys()].sort((a, b) => score(b) - score(a))[0];
  return { id: best, via: 'auto' };
}

/** Catalogue package matching one of the LIMS test names exactly (after normalising), else null */
export function resolvePackage(catalog, names) {
  const byNorm = new Map();
  Object.keys(catalog.packages).forEach((n) => {
    byNorm.set(norm(n), n);
    byNorm.set(norm(n.replace(/^TRUST\s+/i, '')), n);
  });
  for (const name of names) {
    const hit = byNorm.get(norm(name));
    if (hit) return catalog.packages[hit];
  }
  return null;
}

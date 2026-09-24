// Parity: the ported engine must reach the same judgements as the Studio HTML's own engine.
//   STUDIO_HTML=<path to TrustLab_SmartReport_Studio_N.html> node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { evaluate } from '../src/engine/interpret.js';

const html = process.env.STUDIO_HTML;
const catalogJson = new URL('../data/studio/catalog.json', import.meta.url);

test('engine matches Studio on every package with the Studio demo patient', { skip: !html && 'set STUDIO_HTML' }, () => {
  const src = fs.readFileSync(html, 'utf8');
  const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const el = () => ({ innerHTML: '', querySelector: () => null, querySelectorAll: () => [], appendChild() {}, remove() {} });
  const ctx = vm.createContext({
    console,
    document: { getElementById: el, querySelectorAll: () => [], createElement: el, addEventListener() {}, body: el() },
    window: { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
    setTimeout,
    setInterval,
    clearInterval,
  });
  vm.runInContext(scripts.find((s) => s.trimStart().startsWith('const DB =')), ctx);
  vm.runInContext(scripts.find((s) => s.includes('===================== ENGINE')), ctx);

  const DB = JSON.parse(fs.readFileSync(catalogJson, 'utf8'));
  const catalog = {
    params: DB.params,
    clusters: DB.clusters,
    clusterById: Object.fromEntries(DB.clusters.map((c) => [c.id, c])),
    rules: DB.rules,
  };

  // The demo patient's results, read through each of the 69 packages in both engines
  let compared = 0;
  for (const pkgName of Object.keys(DB.packages)) {
    const studio = JSON.parse(
      vm.runInContext(
        `(() => { const c = normalizePayload(makeDemo(), () => {}); c.package = ${JSON.stringify(pkgName)};
           c.patient.sex = 'male';
           const M = evaluate(c);
           return JSON.stringify({
             rows: M.reported.map(r => [r.id, r.cls.b, r.cls.flag, +r.cls.frac.toFixed(4)]),
             clusters: M.clusters.map(x => [x.id, x.status]),
             fired: M.fired.map(f => f.rule.id),
             trends: M.reported.filter(r => r.trend && !r.trend.none).map(r => [r.id, r.trend.text, r.trend.dir]),
             retest: M.retest,
             results: c.results,
           }); })()`,
        ctx,
      ),
    );

    const ours = evaluate(catalog, { sex: 'male', pkg: DB.packages[pkgName], results: studio.results });
    const rows = ours.clusters
      .flatMap((c) => [...c.flagged, ...c.normal, ...c.unclassified])
      .map((r) => [r.id, r.band, r.flag, +r.frac.toFixed(4)]);
    const sortById = (a) => a.slice().sort((x, y) => x[0].localeCompare(y[0]));
    // Deliberate difference: a package that lists the same parameter twice (TRUST NUTRITIONAL
    // DERMATOSES lists Copper in a core and an add-on profile) gets two cards in the Studio; one
    // result is shown once here.
    const once = (a) => a.filter((x, i) => a.findIndex((y) => y[0] === x[0]) === i);

    assert.deepEqual(sortById(rows), sortById(once(studio.rows)), `${pkgName}: row classifications`);
    assert.deepEqual(ours.clusters.map((c) => [c.id, c.status]), studio.clusters, `${pkgName}: cluster statuses`);
    assert.deepEqual(ours.integrated.patterns.map((p) => p.id), studio.fired.slice(0, 7), `${pkgName}: top patterns`);
    assert.equal(ours.integrated.total, studio.fired.length, `${pkgName}: pattern count`);
    const ourTrends = ours.clusters.flatMap((c) => [...c.flagged, ...c.normal]).filter((r) => r.trend).map((r) => [r.id, r.trend.text, r.trend.dir]);
    assert.deepEqual(sortById(ourTrends), sortById(studio.trends), `${pkgName}: trends`);
    assert.deepEqual(ours.retest.map((r) => r.when + '|' + r.items).slice(0, -1), studio.retest.map((r) => r.when + '|' + r.items).slice(0, -1), `${pkgName}: re-test`);
    compared++;
  }
  assert.equal(compared, Object.keys(DB.packages).length);
});

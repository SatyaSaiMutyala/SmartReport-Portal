// Extracts the content of the single-file "TrustLab Smart Report Studio" HTML into JSON files
// that the seed script loads into MongoDB. Re-run whenever a new Studio build arrives.
//
//   node scripts/extract-studio.js "C:/Users/IT/Downloads/TrustLab_SmartReport_Studio_4.html"
//
// Writes:
//   data/studio/catalog.json   - DB object: meta, params, clusters, packages, rules
//   data/studio/app.json       - engine version, T&C clauses, default lab settings
//   ../frontend/public/trustlab-logo.png
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/extract-studio.js <path to TrustLab_SmartReport_Studio.html>');
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const dbScript = scripts.find((s) => s.trimStart().startsWith('const DB ='));
const logoScript = scripts.find((s) => s.trimStart().startsWith('const LOGO ='));
const appScript = scripts.find((s) => s.includes('===================== ENGINE'));
if (!dbScript || !appScript) throw new Error('Could not find the DB or app <script> blocks in ' + src);

// Minimal browser stubs so the app script can load; it only touches the DOM when rendering.
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
vm.runInContext(dbScript, ctx);
vm.runInContext(appScript, ctx);

const out = JSON.parse(
  vm.runInContext(
    `JSON.stringify({
      DB,
      VERSION,
      TC,
      DEFAULT_SETTINGS,
    })`,
    ctx,
  ),
);

const dataDir = path.join(here, '..', 'data', 'studio');
fs.mkdirSync(dataDir, { recursive: true });

fs.writeFileSync(path.join(dataDir, 'catalog.json'), JSON.stringify(out.DB));

// Credentials never leave the browser config they were typed into
const settings = structuredClone(out.DEFAULT_SETTINGS);
delete settings.lis.key;
delete settings.lis.password;
fs.writeFileSync(
  path.join(dataDir, 'app.json'),
  JSON.stringify({ engineVersion: out.VERSION, sourceFile: path.basename(src), terms: out.TC, settings }, null, 2),
);

if (logoScript) {
  const b64 = logoScript.match(/base64,([A-Za-z0-9+/=]+)/)?.[1];
  if (b64) fs.writeFileSync(path.join(here, '..', '..', 'frontend', 'public', 'trustlab-logo.png'), Buffer.from(b64, 'base64'));
}

const m = out.DB.meta;
console.log(`Extracted ${m.title} (built ${m.built}, ${m.catalogue})`);
console.log(
  `  ${Object.keys(out.DB.params).length} parameters · ${out.DB.clusters.length} clusters · ` +
    `${Object.keys(out.DB.packages).length} packages · ${out.DB.rules.length} rules · ${out.TC.length} T&C clauses`,
);

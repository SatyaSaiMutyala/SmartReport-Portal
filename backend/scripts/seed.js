// Loads the extracted Smart Report Studio content (data/studio/*.json) into MongoDB.
// Safe to re-run: catalogue collections are upserted and entries no longer in the source are removed.
// Only reference content is stored — patient results are never written to the database.
//
//   npm run seed
import 'dotenv/config';
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import Parameter from '../src/models/Parameter.js';
import Cluster from '../src/models/Cluster.js';
import Package from '../src/models/Package.js';
import Rule from '../src/models/Rule.js';
import Setting from '../src/models/Setting.js';
import { slugify } from '../src/utils/slugify.js';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'studio');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));

if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));

async function sync(Model, docs) {
  const ops = docs.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }));
  const res = await Model.bulkWrite(ops, { ordered: false });
  const removed = await Model.deleteMany({ _id: { $nin: docs.map((d) => d._id) } });
  console.log(
    `  ${Model.collection.name.padEnd(11)} ${docs.length} in source · ${res.upsertedCount} added · ` +
      `${res.modifiedCount} updated · ${removed.deletedCount} removed`,
  );
}

async function main() {
  const catalog = readJson('catalog.json');
  const app = readJson('app.json');

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected to ${mongoose.connection.db.databaseName}; seeding catalogue "${catalog.meta.built}"`);

  // Validate every document before writing anything
  const params = Object.values(catalog.params).map(({ id, ...p }) => ({ _id: id, ...p }));
  const clusters = catalog.clusters.map(({ id, ...c }) => ({ _id: id, ...c }));
  const packages = Object.values(catalog.packages).map(({ name, ...p }) => ({ _id: name, slug: slugify(name), ...p }));
  const rules = catalog.rules.map(({ id, ...r }) => ({ _id: id, ...r }));
  for (const [Model, docs] of [[Parameter, params], [Cluster, clusters], [Package, packages], [Rule, rules]]) {
    for (const d of docs) await new Model(d).validate();
  }

  await sync(Parameter, params);
  await sync(Cluster, clusters);
  await sync(Package, packages);
  await sync(Rule, rules);

  await Setting.replaceOne(
    { _id: 'catalog' },
    {
      _id: 'catalog',
      value: {
        ...catalog.meta,
        engineVersion: app.engineVersion,
        sourceFile: app.sourceFile,
        seededAt: new Date().toISOString(),
        terms: app.terms.map(([title, html]) => ({ title, html })),
      },
    },
    { upsert: true },
  );
  // Lab settings are editable in the portal, so only create them the first time
  const lab = await Setting.updateOne({ _id: 'lab' }, { $setOnInsert: { value: app.settings } }, { upsert: true });
  console.log(`  settings    catalog updated · lab ${lab.upsertedCount ? 'created' : 'kept (already exists)'}`);

  await Promise.all([Parameter, Cluster, Package, Rule].map((M) => M.syncIndexes()));

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});

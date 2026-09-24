import Parameter from '../models/Parameter.js';
import Cluster from '../models/Cluster.js';
import Package from '../models/Package.js';
import Rule from '../models/Rule.js';
import Setting from '../models/Setting.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function getCatalogInfo(req, res) {
  const [catalog, parameters, clusters, packages, rules] = await Promise.all([
    Setting.findById('catalog').lean(),
    Parameter.estimatedDocumentCount(),
    Cluster.estimatedDocumentCount(),
    Package.estimatedDocumentCount(),
    Rule.estimatedDocumentCount(),
  ]);
  if (!catalog) return res.status(404).json({ message: 'Catalogue not seeded — run npm run seed' });
  const { terms, ...meta } = catalog.value;
  res.json({ ...meta, counts: { parameters, clusters, packages, rules } });
}

export async function getTerms(req, res) {
  const catalog = await Setting.findById('catalog').lean();
  res.json(catalog?.value.terms || []);
}

// ?cl=BLOOD&type=numeric&review=true&q=haem  — list view omits the long interpretation text
export async function listParameters(req, res) {
  const { cl, type, review, q, full } = req.query;
  const filter = {};
  if (cl) filter.cl = cl;
  if (type) filter.type = type;
  if (review != null) filter.review = review === 'true';
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ _id: rx }, { name: rx }, { alias: rx }, { dn: rx }];
  }
  const projection = full === 'true' ? {} : { name: 1, dn: 1, alias: 1, cl: 1, unit: 1, type: 1, sex: 1, calc: 1, review: 1 };
  res.json(await Parameter.find(filter, projection).sort({ _id: 1 }));
}

export async function getParameter(req, res) {
  const param = await Parameter.findById(req.params.id.toUpperCase());
  if (!param) return res.status(404).json({ message: 'Parameter not found' });
  res.json(param);
}

export async function listClusters(req, res) {
  res.json(await Cluster.find().sort({ order: 1 }));
}

export async function listPackages(req, res) {
  const filter = req.query.group ? { group: req.query.group } : {};
  res.json(await Package.find(filter, { params: 0 }).sort({ group: 1, _id: 1 }));
}

export async function getPackage(req, res) {
  const pkg = await Package.findOne({ slug: req.params.slug });
  if (!pkg) return res.status(404).json({ message: 'Package not found' });
  res.json(pkg);
}

// ?package=<catalogue name> limits to rules that apply to that package
export async function listRules(req, res) {
  const filter = req.query.package ? { packages: req.query.package } : {};
  res.json(await Rule.find(filter).sort({ pri: 1, _id: 1 }));
}

export async function getLabSettings(req, res) {
  const lab = await Setting.findById('lab').lean();
  res.json(lab?.value || {});
}

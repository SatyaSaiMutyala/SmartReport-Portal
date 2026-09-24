import { buildSmartReport } from '../services/smartReport.js';
import { getCatalog, invalidateCatalog, resolveParameter } from '../services/catalog.js';
import { norm } from '../engine/interpret.js';
import ParameterMap from '../models/ParameterMap.js';

// GET /api/smart-report/:visitId[?package=<catalogue name>] — computed live, never stored
export async function getSmartReport(req, res) {
  const visitId = String(req.params.visitId || '').trim();
  if (!/^[\w\-/.]{1,40}$/.test(visitId)) return res.status(400).json({ message: 'Invalid visit number' });
  const report = await buildSmartReport(visitId, { package: req.query.package });
  res.set('Cache-Control', 'no-store');
  res.json(report);
}

export async function listMappings(req, res) {
  res.json(await ParameterMap.find().sort({ limsName: 1 }));
}

// PUT /api/mappings {limsName, tlp|null, note?}
export async function upsertMapping(req, res) {
  const { limsName, tlp = null, note } = req.body || {};
  if (!limsName || !String(limsName).trim()) return res.status(400).json({ message: 'limsName is required' });
  if (tlp) {
    const catalog = await getCatalog();
    if (!catalog.params[tlp]) return res.status(400).json({ message: `Unknown parameter ${tlp}` });
  }
  const doc = await ParameterMap.findOneAndUpdate(
    { _id: norm(limsName) },
    { limsName: String(limsName).trim(), tlp, note },
    { upsert: true, new: true, runValidators: true },
  );
  invalidateCatalog();
  res.json(doc);
}

export async function deleteMapping(req, res) {
  await ParameterMap.deleteOne({ _id: norm(req.params.limsName) });
  invalidateCatalog();
  res.status(204).end();
}

// GET /api/mappings/resolve?name=…&context=… — what the matcher would do with a LIMS name
export async function testMapping(req, res) {
  const catalog = await getCatalog();
  const { id, via } = resolveParameter(catalog, req.query.name || '', req.query.context || '');
  res.json({ name: req.query.name, id, via, parameter: id ? catalog.params[id].name : null });
}

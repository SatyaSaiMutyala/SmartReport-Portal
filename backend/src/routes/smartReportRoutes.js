import { Router } from 'express';
import {
  getSmartReport,
  listMappings,
  upsertMapping,
  deleteMapping,
  testMapping,
} from '../controllers/smartReportController.js';

export const smartReportRouter = Router();
smartReportRouter.get('/:visitId', getSmartReport);

export const mappingRouter = Router();
mappingRouter.get('/', listMappings);
mappingRouter.get('/resolve', testMapping);
mappingRouter.put('/', upsertMapping);
mappingRouter.delete('/:limsName', deleteMapping);

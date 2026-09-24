import { Router } from 'express';
import {
  getCatalogInfo,
  getTerms,
  listParameters,
  getParameter,
  listClusters,
  listPackages,
  getPackage,
  listRules,
  getLabSettings,
} from '../controllers/catalogController.js';

const router = Router();

router.get('/', getCatalogInfo);
router.get('/terms', getTerms);
router.get('/parameters', listParameters);
router.get('/parameters/:id', getParameter);
router.get('/clusters', listClusters);
router.get('/packages', listPackages);
router.get('/packages/:slug', getPackage);
router.get('/rules', listRules);
router.get('/settings/lab', getLabSettings);

export default router;

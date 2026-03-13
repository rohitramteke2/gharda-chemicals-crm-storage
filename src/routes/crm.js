import { Router } from 'express';
import ctrl from '../controllers/CRMController.js';

const router = Router();

// ── EXTRA — CRM record endpoints ───────────────────────────────────────────

/**
 * GET /records?module=Leads&page=1&per_page=50
 */
router.get('/records', (req, res, next) => ctrl.getRecords(req, res, next));

/**
 * GET /records/:module/:id
 */
router.get('/records/:module/:id', (req, res, next) => ctrl.getRecordById(req, res, next));

export default router;

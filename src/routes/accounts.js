import { Router } from 'express';
import ctrl from '../controllers/AccountController.js';

const router = Router();

// ── Accounts Module — File Upload Field Endpoints ───────────────────────────

/**
 * GET /accounts/approved
 * List all approved accounts (metadata only — no file download).
 * Use this to preview which records will be processed.
 *
 * Example: GET /api/v1/accounts/approved
 */
router.get('/approved', (req, res, next) => ctrl.listApproved(req, res, next));

/**
 * GET /accounts/:recordId/fields
 * Show File Upload field values for a single account (metadata only).
 * Use this to check what files are present before syncing.
 *
 * Example: GET /api/v1/accounts/1000823000013518007/fields
 */
router.get('/:recordId/fields', (req, res, next) => ctrl.listFields(req, res, next));

/**
 * POST /accounts/sync
 * Sync ALL approved accounts:
 *   → Fetch all accounts where Status = "Approved"
 *   → Download all 22 File Upload + Image Upload fields
 *   → Store in /storage/{SAP_ID}/{field_name}/
 *   → Return status_api_check + storage URL
 *
 * ⚠️  This can take a while if there are many approved accounts.
 *
 * Example: POST /api/v1/accounts/sync
 */
router.post('/sync', (req, res, next) => ctrl.syncAll(req, res, next));

/**
 * POST /accounts/:recordId/sync
 * Sync a SINGLE account by record ID:
 *   → Validate Status = "Approved"
 *   → Download all File Upload fields
 *   → Store in /storage/{SAP_ID}/{field_name}/
 *   → Return status_api_check + storage URL
 *
 * Example: POST /api/v1/accounts/1000823000013518007/sync
 */
router.post('/:recordId/sync', (req, res, next) => ctrl.syncOne(req, res, next));

export default router;

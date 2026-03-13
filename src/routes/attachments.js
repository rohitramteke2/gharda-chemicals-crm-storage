import { Router } from 'express';
import ctrl from '../controllers/AttachmentController.js';

const router = Router();

// ── PRIMARY — Attachment endpoints ─────────────────────────────────────────

/**
 * GET /:module/:recordId
 * List attachments (metadata only, no download).
 *
 * Example: GET /api/v1/attachments/Leads/1113843000000696206
 */
router.get('/:module/:recordId', (req, res, next) => ctrl.list(req, res, next));

/**
 * POST /:module/:recordId/download
 * Download ALL attachments for a record → save to disk → return paths.
 *
 * Example: POST /api/v1/attachments/Leads/1113843000000696206/download
 */
router.post('/:module/:recordId/download', (req, res, next) => ctrl.downloadAll(req, res, next));

/**
 * POST /:module/:recordId/download/:attachmentId
 * Download a SINGLE attachment → save to disk → return path.
 *
 * Example: POST /api/v1/attachments/Leads/1113843000000696206/download/1113843000000703001
 * Body (optional): { "fileName": "proposal.pdf" }
 */
router.post('/:module/:recordId/download/:attachmentId', (req, res, next) => ctrl.downloadOne(req, res, next));

export default router;

import { Router } from 'express';
import multer from 'multer';
import ctrl from '../controllers/AttachmentController.js';

const router = Router();

// ── Multer config — store file in memory buffer (for upload to Zoho + disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: 20 * 1024 * 1024 },   // 20 MB max
});

// ── PRIMARY — Attachment endpoints ─────────────────────────────────────────

/**
 * GET /:module/:recordId
 * List attachments (metadata only, no download).
 *
 * Example: GET /api/v1/attachments/Leads/1000823000013518007
 */
router.get('/:module/:recordId', (req, res, next) => ctrl.list(req, res, next));

/**
 * POST /:module/:recordId/download
 * Download ALL attachments for a record → save to disk → return paths.
 *
 * Example: POST /api/v1/attachments/Leads/1000823000013518007/download
 */
router.post('/:module/:recordId/download', (req, res, next) => ctrl.downloadAll(req, res, next));

/**
 * POST /:module/:recordId/download/:attachmentId
 * Download a SINGLE attachment → save to disk → return path.
 *
 * Example: POST /api/v1/attachments/Leads/1000823000013518007/download/1000823000014380029
 * Body (optional): { "fileName": "proposal.pdf" }
 */
router.post('/:module/:recordId/download/:attachmentId', (req, res, next) => ctrl.downloadOne(req, res, next));

/**
 * POST /:module/:recordId/upload
 * Upload a file → attach to Zoho CRM record + save to RDP disk.
 *
 * Multipart form-data, field name: "file"
 *
 * Example: POST /api/v1/attachments/Leads/1000823000013518007/upload
 *          Body: form-data with file field
 */
router.post('/:module/:recordId/upload', upload.single('file'), (req, res, next) => ctrl.upload(req, res, next));

export default router;

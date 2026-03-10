import { Router } from 'express';
import { strictLimiter } from '../middleware/rateLimiter.js';

/**
 * @swagger
 * tags:
 *   name: CRM
 *   description: Zoho CRM data fetching and RDP storage
 */

/**
 * @swagger
 * /api/v1/crm/records:
 *   get:
 *     summary: Fetch records live from Zoho CRM (cached 5 min)
 *     tags: [CRM]
 *     parameters:
 *       - in: query
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Leads, Contacts, Accounts, Deals, Tasks]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: per_page
 *         schema: { type: integer, default: 50, maximum: 200 }
 *       - in: query
 *         name: fields
 *         schema: { type: string }
 *         description: Comma-separated field names
 *       - in: query
 *         name: sort_by
 *         schema: { type: string }
 *       - in: query
 *         name: sort_order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Records fetched successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/crm/records/{module}/{id}:
 *   get:
 *     summary: Fetch a single CRM record by ID
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema: { type: string }
 *         example: Leads
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: "1113843000000696206"
 *     responses:
 *       200:
 *         description: Record found
 *       404:
 *         description: Record not found
 */

/**
 * @swagger
 * /api/v1/crm/sync/status:
 *   get:
 *     summary: Check which modules are currently syncing
 *     tags: [CRM]
 *     responses:
 *       200:
 *         description: Sync status returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:     { type: boolean }
 *                 activeSyncs: { type: integer }
 *                 modules:     { type: array, items: { type: string } }
 */

/**
 * @swagger
 * /api/v1/crm/sync:
 *   post:
 *     summary: Sync all records for a module to RDP storage
 *     tags: [CRM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [module]
 *             properties:
 *               module:
 *                 type: string
 *                 enum: [Leads, Contacts, Accounts, Deals]
 *                 example: Leads
 *               overwrite:
 *                 type: boolean
 *                 default: false
 *                 description: Force re-sync even if data is fresh (< 30 min old)
 *     responses:
 *       200:
 *         description: Sync complete
 *       409:
 *         description: Sync already in progress for this module
 *       429:
 *         description: Rate limit exceeded (max 10/min)
 */

/**
 * @swagger
 * /api/v1/crm/storage/{module}:
 *   get:
 *     summary: Read latest stored data (full JSON)
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema: { type: string }
 *         example: Leads
 *     responses:
 *       200:
 *         description: Stored data returned
 *       404:
 *         description: No stored data — run /sync first
 */

/**
 * @swagger
 * /api/v1/crm/storage/{module}/paged:
 *   get:
 *     summary: Read stored data with pagination (memory safe for large datasets)
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema: { type: string }
 *         example: Leads
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 50, maximum: 500 }
 *     responses:
 *       200:
 *         description: Paged records returned
 *       404:
 *         description: No chunked data — run /sync first
 */

/**
 * @swagger
 * /api/v1/crm/storage/{module}/meta:
 *   get:
 *     summary: Read storage meta (total count, chunk info) without loading records
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema: { type: string }
 *         example: Leads
 *     responses:
 *       200:
 *         description: Meta returned
 *       404:
 *         description: No meta found — run /sync first
 */

/**
 * @swagger
 * /api/v1/crm/storage/{module}/snapshots:
 *   get:
 *     summary: List all snapshots for a module
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema: { type: string }
 *         example: Leads
 *     responses:
 *       200:
 *         description: Snapshot list returned
 */

/**
 * @swagger
 * /api/v1/crm/storage/{module}/snapshots/{filename}:
 *   get:
 *     summary: Read a specific snapshot by filename
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema: { type: string }
 *         example: Leads
 *       - in: path
 *         name: filename
 *         required: true
 *         schema: { type: string }
 *         example: "2026-03-10T10-09-55.json"
 *     responses:
 *       200:
 *         description: Snapshot data returned
 *       404:
 *         description: Snapshot not found
 */

/**
 * @swagger
 * /api/v1/crm/attachments/{module}/{recordId}:
 *   get:
 *     summary: List all attachments for a CRM record
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema: { type: string }
 *         example: Leads
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema: { type: string }
 *         example: "1113843000000696206"
 *     responses:
 *       200:
 *         description: Attachment list returned
 */

/**
 * @swagger
 * /api/v1/crm/attachments/{module}/{recordId}/download:
 *   post:
 *     summary: Download all attachments for a record to RDP disk
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema: { type: string }
 *         example: Leads
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema: { type: string }
 *         example: "1113843000000696206"
 *     responses:
 *       200:
 *         description: Attachments downloaded successfully
 *       429:
 *         description: Rate limit exceeded
 */

export default function buildCrmRoutes(ctrl) {
    const router = Router();

    // Records
    router.get('/records',                                     ctrl.getRecords.bind(ctrl));
    router.get('/records/:module/:id',                         ctrl.getRecordById.bind(ctrl));

    // Sync
    router.get('/sync/status',                                 ctrl.getSyncStatus.bind(ctrl));
    router.post('/sync',                        strictLimiter,  ctrl.syncModule.bind(ctrl));

    // Storage — specific routes before param routes to avoid conflicts
    router.get('/storage/:module/paged',                       ctrl.getPagedData.bind(ctrl));
    router.get('/storage/:module/meta',                        ctrl.getStorageMeta.bind(ctrl));
    router.get('/storage/:module/snapshots/:filename',         ctrl.getSnapshot.bind(ctrl));
    router.get('/storage/:module/snapshots',                   ctrl.listSnapshots.bind(ctrl));
    router.get('/storage/:module',                             ctrl.getStoredData.bind(ctrl));

    // Attachments — download before list to avoid route conflict
    router.post('/attachments/:module/:recordId/download', strictLimiter, ctrl.downloadAttachments.bind(ctrl));
    router.get('/attachments/:module/:recordId',               ctrl.getAttachments.bind(ctrl));

    return router;
}

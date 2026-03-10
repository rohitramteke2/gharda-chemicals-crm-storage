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
 *     summary: Fetch records live from Zoho CRM
 *     tags: [CRM]
 *     parameters:
 *       - in: query
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Leads, Contacts, Accounts, Deals, Tasks]
 *         description: CRM module to fetch
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *         description: Comma-separated field names to return
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Records fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:   { type: boolean }
 *                 module:    { type: string }
 *                 page:      { type: integer }
 *                 per_page:  { type: integer }
 *                 count:     { type: integer }
 *                 info:      { type: object }
 *                 data:      { type: array, items: { type: object } }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *         schema:
 *           type: string
 *         example: Leads
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "4876893000001234567"
 *     responses:
 *       200:
 *         description: Record found
 *       404:
 *         description: Record not found
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:      { type: boolean }
 *                 module:       { type: string }
 *                 count:        { type: integer }
 *                 latestPath:   { type: string }
 *                 snapshotPath: { type: string }
 *                 syncedAt:     { type: string }
 *       429:
 *         description: Rate limit exceeded (max 10/min on sync)
 */

/**
 * @swagger
 * /api/v1/crm/storage/{module}:
 *   get:
 *     summary: Read latest stored data for a module from RDP disk
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *         example: Leads
 *     responses:
 *       200:
 *         description: Stored data returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:   { type: boolean }
 *                 module:    { type: string }
 *                 fetchedAt: { type: string }
 *                 count:     { type: integer }
 *                 records:   { type: array, items: { type: object } }
 *       404:
 *         description: No stored data found — run /sync first
 */

/**
 * @swagger
 * /api/v1/crm/storage/{module}/snapshots:
 *   get:
 *     summary: List all snapshots saved for a module
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *         example: Leads
 *     responses:
 *       200:
 *         description: Snapshot list returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:   { type: boolean }
 *                 module:    { type: string }
 *                 count:     { type: integer }
 *                 snapshots: { type: array, items: { type: string } }
 */

export default function buildCrmRoutes(ctrl) {
    const router = Router();

    router.get('/records',                   ctrl.getRecords.bind(ctrl));
    router.get('/records/:module/:id',       ctrl.getRecordById.bind(ctrl));
    router.post('/sync',       strictLimiter, ctrl.syncModule.bind(ctrl));
    router.get('/storage/:module',           ctrl.getStoredData.bind(ctrl));
    router.get('/storage/:module/snapshots', ctrl.listSnapshots.bind(ctrl));
    router.get('/attachments/:module/:recordId',      ctrl.getAttachments.bind(ctrl));
    router.post('/attachments/:module/:recordId/download', strictLimiter, ctrl.downloadAttachments.bind(ctrl));
    
    return router;
}
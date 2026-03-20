import { Router } from 'express';
import accountService from '../services/AccountFileUploadService.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';
import {
    renderDashboard,
    renderAccountFiles,
    renderSyncResult,
    renderDocs,
    renderError,
} from '../views/pages.js';

const router = Router();

// ── API Documentation ───────────────────────────────────────────────────────

/**
 * GET /pages/docs
 * Interactive API documentation page.
 */
router.get('/docs', (req, res) => {
    const baseUrl = env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.send(renderDocs(baseUrl));
});

// ── Dashboard: List all downloaded accounts ─────────────────────────────────

/**
 * GET /pages/accounts
 * Browse all synced accounts and their file counts.
 */
router.get('/accounts', async (req, res) => {
    try {
        const accounts = await accountService.listDownloadedAccounts();
        res.send(renderDashboard(accounts));
    } catch (err) {
        logger.error('Pages: dashboard error', { message: err.message });
        res.status(500).send(renderError(500, 'Server Error',
            'Something went wrong loading the accounts dashboard. Check the server logs for details.'
        ));
    }
});

// ── Account Detail: Browse files for one account ────────────────────────────

/**
 * GET /pages/accounts/:sapId
 * Browse all downloaded files for a specific account.
 */
router.get('/accounts/:sapId', async (req, res) => {
    try {
        const { sapId } = req.params;
        const data = await accountService.listDownloadedFiles(sapId);
        res.send(renderAccountFiles(sapId, data));
    } catch (err) {
        logger.error('Pages: account detail error', { sapId: req.params.sapId, message: err.message });
        res.status(500).send(renderError(500, 'Server Error',
            'Something went wrong loading the account files. Check the server logs for details.'
        ));
    }
});

// ── Sync Single Account (via browser — shows result page) ───────────────────

/**
 * POST /pages/accounts/:recordId/sync
 * Triggers sync for a single account and shows the result page.
 * This is a browser-friendly version of the API endpoint.
 */
router.post('/accounts/:recordId/sync', async (req, res) => {
    try {
        const { recordId } = req.params;

        logger.info('Pages: sync triggered from browser', { recordId });

        const result = await accountService.processSingleAccount(recordId);

        if (result.error) {
            const statusCode = result.error.code === 'NOT_FOUND' ? 404
                             : result.error.code === 'NOT_APPROVED' ? 422
                             : 400;

            return res.status(statusCode).send(renderError(
                statusCode,
                result.error.code === 'NOT_FOUND' ? 'Account Not Found' : 'Account Not Approved',
                result.error.message
            ));
        }

        res.send(renderSyncResult(result));
    } catch (err) {
        logger.error('Pages: sync error', { recordId: req.params.recordId, message: err.message });
        res.status(500).send(renderError(500, 'Sync Failed',
            `Failed to sync account: ${err.message}`
        ));
    }
});

// ── Catch-all 404 for /pages/* ──────────────────────────────────────────────

router.use((req, res) => {
    res.status(404).send(renderError(404, 'Page Not Found',
        `The page <code>${req.originalUrl}</code> doesn't exist. Try browsing from the accounts dashboard.`
    ));
});

export default router;

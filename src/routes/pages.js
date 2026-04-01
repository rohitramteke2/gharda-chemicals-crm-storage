import express, { Router } from 'express';
import accountService from '../services/AccountFileUploadService.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';
import {
    renderDashboard,
    renderAccountFiles,
    renderSyncResult,
    renderDocs,
    renderError,
    renderPaymentSuccess,
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

// ── Payment Success/Failure — ICICI Orange PG redirect page ────────────────

/**
 * GET /pages/payment/success
 * POST /pages/payment/success
 *
 * Public redirect landing page for ICICI Bank Orange PG after payment.
 * No authentication required.
 *
 * ICICI POSTs these fields to returnURL on completion:
 *   responseCode, respdescription, merchantId, merchantTxnNo,
 *   txnID, paymentID, paymentDateTime, paymentMode, paymentSubInstType,
 *   amount, currencyCode, customerName, customerEmailID, customerMobileNo,
 *   addlParam1, addlParam2, securehash
 *
 * Success: responseCode = "0000" or "0000/000"
 * Failure: any other responseCode
 *
 * Configure in Zoho Creator / ICICI PG → returnURL:
 *   https://zoho.gharda.com:14443/pages/payment/success
 */

function extractICICIParams(src) {
    return {
        responseCode:       src.responseCode       || src.responsecode       || null,
        respdescription:    src.respdescription     || src.responseDescription|| null,
        merchantId:         src.merchantId          || null,
        merchantTxnNo:      src.merchantTxnNo       || null,
        txnID:              src.txnID               || src.txnId             || null,
        paymentID:          src.paymentID           || src.paymentId         || null,
        paymentDateTime:    src.paymentDateTime     || null,
        paymentMode:        src.paymentMode         || null,
        paymentSubInstType: src.paymentSubInstType  || null,
        amount:             src.amount              || null,
        currencyCode:       src.currencyCode        || src.currency          || '356',
        customerName:       src.customerName        || null,
        customerEmailID:    src.customerEmailID     || src.email             || null,
        customerMobileNo:   src.customerMobileNo    || src.mobile            || null,
        addlParam1:         src.addlParam1          || null,
        addlParam2:         src.addlParam2          || null,
        securehash:         src.securehash          || src.secureHash        || null,
    };
}

router.get('/payment/success', (req, res) => {
    const params = extractICICIParams(req.query);

    logger.info('Pages: ICICI payment redirect (GET)', {
        ip:          req.ip,
        responseCode: params.responseCode,
        txnID:        params.txnID,
        paymentID:    params.paymentID,
        merchantTxnNo: params.merchantTxnNo,
        amount:       params.amount,
    });

    res.send(renderPaymentSuccess(params));
});

router.post('/payment/success', express.urlencoded({ extended: false }), (req, res) => {
    // body takes precedence over query string
    const raw    = { ...req.query, ...req.body };
    const params = extractICICIParams(raw);

    logger.info('Pages: ICICI payment redirect (POST)', {
        ip:           req.ip,
        responseCode: params.responseCode,
        txnID:        params.txnID,
        paymentID:    params.paymentID,
        merchantTxnNo: params.merchantTxnNo,
        amount:       params.amount,
    });

    res.send(renderPaymentSuccess(params));
});

// ── Catch-all 404 for /pages/* ──────────────────────────────────────────────

router.use((req, res) => {
    res.status(404).send(renderError(404, 'Page Not Found',
        `The page <code>${req.originalUrl}</code> doesn't exist. Try browsing from the accounts dashboard.`
    ));
});

export default router;
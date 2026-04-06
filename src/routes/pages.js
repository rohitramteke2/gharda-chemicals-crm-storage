import { Router } from 'express';
import express from 'express';
import accountService from '../services/AccountFileUploadService.js';
import creatorService from '../services/ZohoCreatorService.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';
import {
    renderDashboard,
    renderAccountFiles,
    renderSyncResult,
    renderDocs,
    renderError,
    renderPaymentSuccess,
    renderPaymentInvalid,
} from '../views/pages.js';

const router = Router();

// ── In-memory store for payment POST→GET bridge ─────────────────────────────
// ICICI POSTs data → we save it here → redirect to GET → GET reads from here
const paymentStore = new Map();
const STORE_TTL = 30 * 60 * 1000; // 30 minutes

// ── Helper: extract ICICI params from any source ────────────────────────────
function extractICICIParams(raw) {
    return {
        responseCode:   raw.responseCode   || raw.response_code   || null,
        txnID:          raw.txnID          || raw.txn_id          || null,
        paymentID:      raw.paymentID      || raw.payment_id      || null,
        merchantTxnNo:  raw.merchantTxnNo  || raw.merchant_txn_no || null,
        amount:         raw.amount         || null,
        customerName:   raw.customerName   || raw.customer_name   || null,
        customerEmail:  raw.customerEmail  || raw.customer_email  || null,
        orderId:        raw.orderId        || raw.order_id        || raw.addlParam1 || null,
        paymentMode:    raw.paymentMode    || raw.payment_mode    || null,
        currency:       raw.currency       || raw.currencyCode    || 'INR',
        recordId:       raw.recordId       || raw.record_id       || null,
    };
}

// ── Check if params contain any real transaction data ───────────────────────
function hasValidPaymentData(params) {
    return !!(params.txnID || params.paymentID || params.responseCode || params.merchantTxnNo);
}


// ═══════════════════════════════════════════════════════════════════════════
//  PAYMENT SUCCESS — public (ICICI redirects here from any IP)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /pages/payment/success
 * ICICI Bank posts transaction result here after payment.
 * Saves data in memory, updates Creator log, then redirects to GET.
 */
router.post('/payment/success', express.urlencoded({ extended: false }), async (req, res) => {
    const raw    = { ...req.query, ...req.body };
    const params = extractICICIParams(raw);

    logger.info('Pages: ICICI payment redirect (POST)', {
        ip:            req.ip,
        responseCode:  params.responseCode,
        txnID:         params.txnID,
        paymentID:     params.paymentID,
        merchantTxnNo: params.merchantTxnNo,
        amount:        params.amount,
    });

    // Save to memory store keyed by merchantTxnNo
    const ref = params.merchantTxnNo || `tmp-${Date.now()}`;
    paymentStore.set(ref, params);
    setTimeout(() => paymentStore.delete(ref), STORE_TTL);

    // Update Payment_Logs in Zoho Creator (background — don't block redirect)
    if (params.merchantTxnNo) {
        creatorService.updatePaymentLog(params.merchantTxnNo, {
            Txn_ID:           params.txnID || '',
            Payment_ID:       params.paymentID || '',
            Response_Code:    params.responseCode || '',
            Payment_Mode:     params.paymentMode || '',
            Payment_DateTime: new Date().toISOString(),
            Status:           params.responseCode === '0000' ? 'Success' : 'Failed',
        }).catch(err => logger.error('Background Creator update failed', { error: err.message }));
    }

    // Redirect to GET with just the ref key
    res.redirect(`/pages/payment/success?ref=${encodeURIComponent(ref)}`);
});

/**
 * GET /pages/payment/success
 * Shows payment confirmation ONLY if valid data exists.
 * Otherwise shows "Invalid Page" — no Thank You, no dev preview.
 */
router.get('/payment/success', (req, res) => {
    let params = null;

    // Try to load from memory store using ref key
    const ref = req.query.ref;
    if (ref && paymentStore.has(ref)) {
        params = paymentStore.get(ref);
    } else {
        // Try query params directly (e.g. from Zoho returnUrl with customerName, amount etc.)
        const fromQuery = extractICICIParams(req.query);
        if (hasValidPaymentData(fromQuery)) {
            params = fromQuery;
        }
    }

    logger.info('Pages: ICICI payment redirect (GET)', {
        ip:            req.ip,
        ref:           ref || null,
        hasData:       !!params,
        responseCode:  params?.responseCode || null,
        txnID:         params?.txnID || null,
    });

    // ── NO VALID DATA → Invalid Page ────────────────────────────────────
    if (!params) {
        return res.status(400).send(renderPaymentInvalid());
    }

    // ── VALID DATA → Thank You page ─────────────────────────────────────
    res.send(renderPaymentSuccess(params));
});


// ═══════════════════════════════════════════════════════════════════════════
//  ACCOUNTS & DOCS — IP-restricted via middleware in app.js
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /pages/docs
 */
router.get('/docs', (req, res) => {
    const baseUrl = env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.send(renderDocs(baseUrl));
});

/**
 * GET /pages/accounts
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

/**
 * GET /pages/accounts/:sapId
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

/**
 * POST /pages/accounts/:recordId/sync
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
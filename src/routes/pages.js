import express, { Router } from 'express';
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
} from '../views/pages.js';

const router = Router();

// ── In-memory payment store ──────────────────────────────────────────────────
// ICICI POSTs data first, then browser does a GET to same URL (all null).
// We save POST data here keyed by merchantTxnNo, then read it on the GET.
// Auto-expires after 30 minutes.
const paymentStore = new Map();

// ── API Documentation ────────────────────────────────────────────────────────

router.get('/docs', (req, res) => {
    const baseUrl = env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.send(renderDocs(baseUrl));
});

// ── Dashboard: List all downloaded accounts ──────────────────────────────────

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

// ── Account Detail: Browse files for one account ─────────────────────────────

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

// ── Sync Single Account ───────────────────────────────────────────────────────

router.post('/accounts/:recordId/sync', async (req, res) => {
    try {
        const { recordId } = req.params;
        logger.info('Pages: sync triggered from browser', { recordId });

        const result = await accountService.processSingleAccount(recordId);

        if (result.error) {
            const statusCode = result.error.code === 'NOT_FOUND'    ? 404
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
        res.status(500).send(renderError(500, 'Sync Failed', `Failed to sync account: ${err.message}`));
    }
});

// ── Payment Success — ICICI Orange PG redirect ───────────────────────────────
//
//  ICICI flow:
//    1. User completes payment on ICICI page
//    2. ICICI POSTs transaction data to returnURL  → our POST handler saves to store + updates Creator
//    3. Browser follows the redirect GET to same URL → our GET handler reads from store
//
//  Configure returnURL in Zoho Creator script:
//    https://zoho.gharda.com:14443/pages/payment/success

function extractICICIParams(src) {
    return {
        responseCode:       src.responseCode       || src.responsecode        || null,
        respdescription:    src.respdescription     || src.responseDescription || null,
        merchantId:         src.merchantId          || null,
        merchantTxnNo:      src.merchantTxnNo       || null,
        txnID:              src.txnID               || src.txnId              || null,
        paymentID:          src.paymentID           || src.paymentId          || null,
        paymentDateTime:    src.paymentDateTime     || null,
        paymentMode:        src.paymentMode         || null,
        paymentSubInstType: src.paymentSubInstType  || null,
        amount:             src.amount              || null,
        currencyCode:       src.currencyCode        || src.currency           || '356',
        customerName:       src.customerName        || null,
        customerEmailID:    src.customerEmailID     || src.email              || null,
        customerMobileNo:   src.customerMobileNo    || src.mobile             || null,
        addlParam1:         src.addlParam1          || null,
        addlParam2:         src.addlParam2          || null,
        securehash:         src.securehash          || src.secureHash         || null,
    };
}

// ── POST: ICICI sends transaction data here first ────────────────────────────
router.post('/payment/success', express.urlencoded({ extended: false }), (req, res) => {
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

    // ── 1. Save to in-memory store ───────────────────────────────────────
    if (params.merchantTxnNo) {
        paymentStore.set(params.merchantTxnNo, params);
        // Auto-cleanup after 30 minutes
        setTimeout(() => paymentStore.delete(params.merchantTxnNo), 30 * 60 * 1000);
    }

    // ── 2. Update Payment_Logs in Zoho Creator (background, non-blocking) ─
    creatorService.syncPaymentResult(params)
        .then(() => logger.info('Pages: Payment_Log updated in Creator', { merchantTxnNo: params.merchantTxnNo }))
        .catch(err => logger.error('Pages: Creator update failed (non-fatal)', { message: err.message }));

    // ── 3. Redirect browser to GET with ref key ──────────────────────────
    const ref = encodeURIComponent(params.merchantTxnNo || '');
    res.redirect(302, `/pages/payment/success?ref=${ref}`);
});

// ── GET: Browser lands here — read data from store ───────────────────────────
router.get('/payment/success', (req, res) => {
    let params;

    const ref = req.query.ref;

    if (ref && paymentStore.has(ref)) {
        // Load full data saved from the POST
        params = paymentStore.get(ref);
        logger.info('Pages: ICICI payment GET (from store)', {
            ip:            req.ip,
            responseCode:  params.responseCode,
            txnID:         params.txnID,
            paymentID:     params.paymentID,
            merchantTxnNo: params.merchantTxnNo,
            amount:        params.amount,
        });
    } else {
        // Fallback — direct URL access or testing
        params = extractICICIParams(req.query);
        logger.info('Pages: ICICI payment GET (no store data)', {
            ip:     req.ip,
            ref:    ref || null,
            amount: params.amount || null,
        });
    }

    res.send(renderPaymentSuccess(params));
});

// ── Catch-all 404 for /pages/* ───────────────────────────────────────────────

router.use((req, res) => {
    res.status(404).send(renderError(404, 'Page Not Found',
        `The page <code>${req.originalUrl}</code> doesn't exist. Try browsing from the accounts dashboard.`
    ));
});

export default router;
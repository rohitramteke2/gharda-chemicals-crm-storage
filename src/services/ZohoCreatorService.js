/**
 * ZohoCreatorService.js
 *
 * Handles Zoho Creator API calls for Payment_Logs module:
 *   - searchPaymentLog()  → find a log record by Merchant_Txn_No
 *   - updatePaymentLog()  → update it with ICICI response data
 *
 * Reuses the existing ZohoAuthService token (same OAuth app).
 * Zoho Creator API base: https://creator.zoho.in/api/v2/{owner}/{app}
 */

import axios from 'axios';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';
import auth from './ZohoAuthService.js';

// ── Creator API base ─────────────────────────────────────────────────────────
const CREATOR_BASE = 'https://creator.zoho.in/api/v2';
const OWNER        = env.ZOHO_CREATOR_OWNER || 'zohoadmin_gharda782';
const APP          = env.ZOHO_CREATOR_APP   || 'distributor-management-gharda-chemical';
const FORM         = 'Payment_Logs';
const REPORT       = 'All_Payment_Logs';

class ZohoCreatorService {

    // ═══════════════════════════════════════════════════════════════════════
    //  1. Search Payment_Logs by Merchant_Txn_No
    //     Returns the record ID if found, null otherwise
    // ═══════════════════════════════════════════════════════════════════════

    async searchPaymentLog(merchantTxnNo) {
        if (!merchantTxnNo) return null;

        const token = await auth.getToken();

        try {
            const url = `${CREATOR_BASE}/${OWNER}/${APP}/report/${REPORT}`;

            const { data } = await axios.get(url, {
                headers: { Authorization: `Zoho-oauthtoken ${token}` },
                params:  {
                    criteria: `Merchant_Txn_No == "${merchantTxnNo}"`,
                    limit:    1,
                },
                timeout: 15_000,
            });

            const records = data?.data || [];

            if (records.length > 0) {
                const recordId = records[0].ID || records[0].id;
                logger.info('ZohoCreator: found Payment_Log record', {
                    merchantTxnNo,
                    recordId,
                });
                return recordId;
            }

            logger.warn('ZohoCreator: Payment_Log record not found', { merchantTxnNo });
            return null;

        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('ZohoCreator: searchPaymentLog failed', {
                merchantTxnNo,
                status:  err.response?.status,
                message: err.message,
                data:    err.response?.data,
            });
            return null;  // non-fatal — don't break the payment page
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  2. Update a Payment_Log record with ICICI response data
    // ═══════════════════════════════════════════════════════════════════════

    async updatePaymentLog(recordId, iciciParams) {
        if (!recordId) return null;

        const token = await auth.getToken();

        const isSuccess = iciciParams.responseCode === '0000' ||
                          iciciParams.responseCode?.startsWith('0000');

        const updateData = {
            data: {
                Response_Code:    iciciParams.responseCode    || '',
                Txn_ID:           iciciParams.txnID           || '',
                Payment_ID:       iciciParams.paymentID       || '',
                Payment_DateTime: iciciParams.paymentDateTime || '',
                Payment_Mode:     iciciParams.paymentMode     || '',
                Status:           isSuccess ? 'Success' : 'Failed',
                Error_Message:    isSuccess ? '' : (iciciParams.respdescription || ''),
            },
        };

        try {
            const url = `${CREATOR_BASE}/${OWNER}/${APP}/report/${REPORT}/${recordId}`;

            const { data } = await axios.patch(url, updateData, {
                headers: {
                    Authorization:  `Zoho-oauthtoken ${token}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15_000,
            });

            logger.info('ZohoCreator: Payment_Log updated', {
                recordId,
                responseCode: iciciParams.responseCode,
                txnID:        iciciParams.txnID,
                status:       isSuccess ? 'Success' : 'Failed',
                result:       data?.result,
            });

            return data;

        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('ZohoCreator: updatePaymentLog failed', {
                recordId,
                status:  err.response?.status,
                message: err.message,
                data:    err.response?.data,
            });
            return null;  // non-fatal — don't break the payment page
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  3. Combined: search + update in one call
    //     Used by the POST /pages/payment/success handler
    // ═══════════════════════════════════════════════════════════════════════

    async syncPaymentResult(iciciParams) {
        const merchantTxnNo = iciciParams.merchantTxnNo;

        if (!merchantTxnNo) {
            logger.warn('ZohoCreator: syncPaymentResult — no merchantTxnNo, skipping');
            return;
        }

        try {
            // Step 1: find the log record
            const recordId = await this.searchPaymentLog(merchantTxnNo);

            if (!recordId) {
                logger.warn('ZohoCreator: no log record found to update', { merchantTxnNo });
                return;
            }

            // Step 2: update with ICICI response
            await this.updatePaymentLog(recordId, iciciParams);

        } catch (err) {
            // Completely non-fatal — log and move on
            logger.error('ZohoCreator: syncPaymentResult failed', {
                merchantTxnNo,
                message: err.message,
            });
        }
    }
}

export default new ZohoCreatorService();
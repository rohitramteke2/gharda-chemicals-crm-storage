/**
 * services/ZohoCreatorService.js — Zoho Creator API integration.
 *
 * Used to update Payment_Logs records after ICICI Bank sends
 * transaction results back to the return URL.
 *
 * Reuses the existing ZohoAuthService for OAuth token management.
 */

import axios from 'axios';
import { env, zohoHttpsAgent } from '../config/env.js';
import auth from './ZohoAuthService.js';
import logger from '../utils/logger.js';

const OWNER = env.ZOHO_CREATOR_OWNER || 'zohoadmin_gharda782';
const APP   = env.ZOHO_CREATOR_APP   || 'distributor-management-gharda-chemical';

class ZohoCreatorService {

    /**
     * Search Payment_Logs by Merchant_Txn_No and update with ICICI response data.
     */
    async updatePaymentLog(merchantTxnNo, updateData) {
        try {
            const token = await auth.getToken();

            // Step 1: Search for the record by Merchant_Txn_No
            const searchUrl = `https://creator.zoho.in/api/v2.1/${OWNER}/${APP}/report/All_Payment_Logs`;
            const searchResp = await axios.get(searchUrl, {
                headers: { Authorization: `Zoho-oauthtoken ${token}` },
                params: { criteria: `Merchant_Txn_No == "${merchantTxnNo}"` },
                httpsAgent: zohoHttpsAgent,
                timeout: 15_000,
            });

            const records = searchResp.data?.data;
            if (!records || records.length === 0) {
                logger.warn('ZohoCreator: Payment log not found for update', { merchantTxnNo });
                return null;
            }

            const recordId = records[0].ID;

            // Step 2: Update the record with ICICI response fields
            const updateUrl = `https://creator.zoho.in/api/v2.1/${OWNER}/${APP}/report/All_Payment_Logs/${recordId}`;
            const updateResp = await axios.patch(updateUrl, {
                data: updateData,
            }, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${token}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: zohoHttpsAgent,
                timeout: 15_000,
            });

            logger.info('ZohoCreator: Payment log updated', {
                merchantTxnNo,
                recordId,
                status: updateData.Status || 'unknown',
            });

            return updateResp.data;
        } catch (err) {
            logger.error('ZohoCreator: Failed to update payment log', {
                merchantTxnNo,
                error: err.message,
                response: err.response?.data,
            });
            return null;
        }
    }
}

export default new ZohoCreatorService();
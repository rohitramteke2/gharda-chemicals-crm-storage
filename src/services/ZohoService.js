import axios from 'axios';
import { ICRMService } from '../interfaces/ICRMService.js';
import { env, zohoHttpsAgent } from '../config/env.js';
import logger from '../utils/logger.js';
import cache from '../store/CacheStore.js';

const ZOHO_TOKEN_CACHE_KEY = 'zoho:access_token';
const ZOHO_BASE_URL        = `${env.ZOHO_API_DOMAIN}/crm/v2`;
const RECORDS_CACHE_TTL    = 300; // 5 minutes — prevents hammering Zoho on repeated requests

/**
 * ZohoService — concrete implementation of ICRMService.
 *
 * S  — Only responsibility: communicate with Zoho CRM API.
 * L  — Extends ICRMService; fully substitutable wherever ICRMService is expected.
 * O  — To add a new CRM, extend ICRMService in a new class — never touch this.
 */
class ZohoService extends ICRMService {

    async getAccessToken() {
        const cached = cache.get(ZOHO_TOKEN_CACHE_KEY);
        if (cached) {
            logger.debug('Zoho: using cached access token');
            return cached;
        }
        return this._refreshAccessToken();
    }

    async _refreshAccessToken() {
        logger.info('Zoho: refreshing access token', {
            accountsUrl:  env.ZOHO_ACCOUNTS_URL,
            clientId:     env.ZOHO_CLIENT_ID ? `${env.ZOHO_CLIENT_ID.slice(0, 8)}...` : 'MISSING',
            redirectUri:  env.ZOHO_REDIRECT_URI,
            hasRefreshToken: !!env.ZOHO_REFRESH_TOKEN,
            sslBypass:    !!zohoHttpsAgent,
        });

        // ── Guard: catch placeholder / empty credentials early ──────────
        if (!env.ZOHO_CLIENT_ID || env.ZOHO_CLIENT_ID.startsWith('<')) {
            throw new Error(
                'ZOHO_CLIENT_ID is missing or still a placeholder. ' +
                'Check your .env file and ensure real credentials are set.'
            );
        }
        if (!env.ZOHO_REFRESH_TOKEN || env.ZOHO_REFRESH_TOKEN.startsWith('<')) {
            throw new Error(
                'ZOHO_REFRESH_TOKEN is missing or still a placeholder. ' +
                'Generate a fresh refresh token from the Zoho API Console.'
            );
        }

        const params = new URLSearchParams({
            refresh_token: env.ZOHO_REFRESH_TOKEN,
            client_id:     env.ZOHO_CLIENT_ID,
            client_secret: env.ZOHO_CLIENT_SECRET,
            redirect_uri:  env.ZOHO_REDIRECT_URI,
            grant_type:    'refresh_token',
        });

        try {
            const { data } = await axios.post(env.ZOHO_ACCOUNTS_URL, params.toString(), {
                headers:    { 'Content-Type': 'application/x-www-form-urlencoded' },
                httpsAgent: zohoHttpsAgent,
                timeout:    10_000,
            });

            if (!data.access_token) {
                // Log the FULL Zoho error response for debugging
                logger.error('Zoho: token response has no access_token', {
                    zohoResponse: data,
                    accountsUrl:  env.ZOHO_ACCOUNTS_URL,
                    clientId:     env.ZOHO_CLIENT_ID ? `${env.ZOHO_CLIENT_ID.slice(0, 8)}...` : 'MISSING',
                    redirectUri:  env.ZOHO_REDIRECT_URI,
                });
                throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);
            }

            const ttl = (data.expires_in || 3600) - 120;
            cache.set(ZOHO_TOKEN_CACHE_KEY, data.access_token, ttl);
            logger.info('Zoho: access token refreshed', { expiresIn: data.expires_in });
            return data.access_token;

        } catch (err) {
            // Enhanced error logging — capture Zoho's response body when available
            const errDetail = {
                message:     err.message,
                status:      err.response?.status,
                zohoError:   err.response?.data,
                accountsUrl: env.ZOHO_ACCOUNTS_URL,
                code:        err.code,  // e.g. ECONNREFUSED, UNABLE_TO_VERIFY_LEAF_SIGNATURE
            };
            logger.error('Zoho: token refresh error', errDetail);
            throw err;
        }
    }

    async fetchRecords({ module, page = 1, per_page = 50, fields, sort_by, sort_order = 'desc' }) {
        // Cache key includes all params — different queries never collide
        const cacheKey = `zoho:records:${module}:${page}:${per_page}:${fields || ''}:${sort_by || ''}:${sort_order}`;
        const cached   = cache.get(cacheKey);

        if (cached) {
            logger.debug('Zoho: returning cached records', { module, page, cacheKey });
            return cached;
        }

        const token  = await this.getAccessToken();
        const params = { page, per_page };

        if (fields)     params.fields     = fields;
        if (sort_by)    params.sort_by    = sort_by;
        if (sort_order) params.sort_order = sort_order;

        logger.info('Zoho: fetching records from API', { module, page, per_page });

        try {
            const { data: response } = await axios.get(`${ZOHO_BASE_URL}/${module}`, {
                headers:    { Authorization: `Zoho-oauthtoken ${token}` },
                httpsAgent: zohoHttpsAgent,
                params,
                timeout:    30_000,
            });

            const result = {
                data: response.data || [],
                info: response.info || {},
            };

            // Cache the result for 5 minutes
            cache.set(cacheKey, result, RECORDS_CACHE_TTL);

            return result;

        } catch (err) {
            if (err.response?.status === 401) cache.del(ZOHO_TOKEN_CACHE_KEY);
            logger.error('Zoho: fetchRecords error', {
                module,
                status:  err.response?.status,
                message: err.message,
                code:    err.code,
            });
            throw err;
        }
    }

    async fetchRecordById(module, id) {
        const token = await this.getAccessToken();
        logger.info('Zoho: fetching single record', { module, id });

        try {
            const { data: response } = await axios.get(`${ZOHO_BASE_URL}/${module}/${id}`, {
                headers:    { Authorization: `Zoho-oauthtoken ${token}` },
                httpsAgent: zohoHttpsAgent,
                timeout:    15_000,
            });
            return response.data?.[0] || null;

        } catch (err) {
            if (err.response?.status === 401) cache.del(ZOHO_TOKEN_CACHE_KEY);
            logger.error('Zoho: fetchRecordById error', { module, id, message: err.message, code: err.code });
            throw err;
        }
    }

    async fetchAllRecords(module, opts = {}) {
        let page    = 1;
        let hasMore = true;
        const all   = [];

        logger.info('Zoho: fetching all records (auto-paginate)', { module });

        while (hasMore) {
            const { data, info } = await this.fetchRecords({ ...opts, module, page, per_page: 200 });
            all.push(...data);
            hasMore = info.more_records === true;
            page++;
        }

        logger.info('Zoho: finished fetching all records', { module, total: all.length });
        return all;
    }
}

export default new ZohoService();

import axios from 'axios';
import { ICRMService } from '../interfaces/ICRMService.js';
import { env, zohoHttpsAgent } from '../config/env.js';
import logger from '../utils/logger.js';
import cache from '../store/CacheStore.js';
import auth from './ZohoAuthService.js';

const ZOHO_BASE_URL        = `${env.ZOHO_API_DOMAIN}/crm/v2`;
const RECORDS_CACHE_TTL    = 300; // 5 minutes — prevents hammering Zoho on repeated requests

/**
 * ZohoService — concrete implementation of ICRMService.
 *
 * Uses shared ZohoAuthService for token management (single cache, no duplicates).
 */
class ZohoService extends ICRMService {

    async getAccessToken() {
        return auth.getToken();
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
            if (err.response?.status === 401) auth.clearToken();
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
            if (err.response?.status === 401) auth.clearToken();
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

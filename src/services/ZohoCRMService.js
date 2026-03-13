import axios from 'axios';
import { env, zohoHttpsAgent } from '../config/env.js';
import logger from '../utils/logger.js';
import cache from '../utils/cache.js';
import auth from './ZohoAuthService.js';

const BASE = `${env.ZOHO_API_DOMAIN}/crm/v2`;
const RECORD_CACHE_TTL = 300;   // 5 min

class ZohoCRMService {

    async fetchRecords({ module, page = 1, per_page = 50, fields, sort_by, sort_order = 'desc' }) {
        const cacheKey = `crm:${module}:${page}:${per_page}:${fields || ''}:${sort_by || ''}:${sort_order}`;
        const hit = cache.get(cacheKey);
        if (hit) return hit;

        const token  = await auth.getToken();
        const params = { page, per_page };
        if (fields)     params.fields     = fields;
        if (sort_by)    params.sort_by    = sort_by;
        if (sort_order) params.sort_order = sort_order;

        logger.info('CRM: fetching records', { module, page, per_page });

        try {
            const { data: res } = await axios.get(`${BASE}/${module}`, {
                headers:    { Authorization: `Zoho-oauthtoken ${token}` },
                httpsAgent: zohoHttpsAgent,
                params,
                timeout:    30_000,
            });

            const result = { data: res.data || [], info: res.info || {} };
            cache.set(cacheKey, result, RECORD_CACHE_TTL);
            return result;

        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('CRM: fetchRecords failed', {
                module, status: err.response?.status, message: err.message, code: err.code,
            });
            throw err;
        }
    }

    async fetchRecordById(module, id) {
        const token = await auth.getToken();
        logger.info('CRM: fetching record', { module, id });

        try {
            const { data: res } = await axios.get(`${BASE}/${module}/${id}`, {
                headers:    { Authorization: `Zoho-oauthtoken ${token}` },
                httpsAgent: zohoHttpsAgent,
                timeout:    15_000,
            });
            return res.data?.[0] || null;

        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('CRM: fetchRecordById failed', { module, id, message: err.message, code: err.code });
            throw err;
        }
    }
}

export default new ZohoCRMService();

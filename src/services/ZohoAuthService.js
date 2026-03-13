import axios from 'axios';
import { env, zohoHttpsAgent } from '../config/env.js';
import logger from '../utils/logger.js';
import cache from '../utils/cache.js';

const CACHE_KEY = 'zoho:access_token';

class ZohoAuthService {

    /**
     * Returns a valid access token — from cache if fresh, otherwise refreshes.
     */
    async getToken() {
        const cached = cache.get(CACHE_KEY);
        if (cached) return cached;
        return this.#refresh();
    }

    /**
     * Exchanges the long-lived refresh token for a short-lived access token.
     * Called automatically when the cached token expires.
     */
    async #refresh() {
        // ── Guard: catch placeholder / empty credentials before hitting Zoho ──
        this.#assertCredential('ZOHO_CLIENT_ID',     env.ZOHO_CLIENT_ID);
        this.#assertCredential('ZOHO_CLIENT_SECRET',  env.ZOHO_CLIENT_SECRET);
        this.#assertCredential('ZOHO_REFRESH_TOKEN',  env.ZOHO_REFRESH_TOKEN);
        this.#assertCredential('ZOHO_REDIRECT_URI',   env.ZOHO_REDIRECT_URI);

        logger.info('ZohoAuth: refreshing access token', {
            accountsUrl: env.ZOHO_ACCOUNTS_URL,
            clientId:    env.ZOHO_CLIENT_ID.slice(0, 10) + '…',
            redirectUri: env.ZOHO_REDIRECT_URI,
            sslBypass:   !!zohoHttpsAgent,
        });

        const body = new URLSearchParams({
            grant_type:    'refresh_token',
            refresh_token: env.ZOHO_REFRESH_TOKEN,
            client_id:     env.ZOHO_CLIENT_ID,
            client_secret: env.ZOHO_CLIENT_SECRET,
            redirect_uri:  env.ZOHO_REDIRECT_URI,
        });

        try {
            const { data } = await axios.post(env.ZOHO_ACCOUNTS_URL, body.toString(), {
                headers:    { 'Content-Type': 'application/x-www-form-urlencoded' },
                httpsAgent: zohoHttpsAgent,
                timeout:    10_000,
            });

            if (!data.access_token) {
                logger.error('ZohoAuth: response missing access_token', { response: data });
                throw new Error(`Token refresh failed — Zoho replied: ${JSON.stringify(data)}`);
            }

            // Cache 2 min before actual expiry to avoid edge-case 401s
            const ttl = (data.expires_in || 3600) - 120;
            cache.set(CACHE_KEY, data.access_token, ttl);

            logger.info('ZohoAuth: token refreshed', { expiresIn: data.expires_in });
            return data.access_token;

        } catch (err) {
            logger.error('ZohoAuth: refresh failed', {
                message:   err.message,
                code:      err.code,               // ECONNREFUSED, UNABLE_TO_VERIFY_LEAF_SIGNATURE …
                status:    err.response?.status,
                zohoError: err.response?.data,
            });
            throw err;
        }
    }

    /**
     * Wipes the cached token — call after a 401 so the next request re-authenticates.
     */
    clearToken() {
        cache.del(CACHE_KEY);
    }

    // ── Private helpers ────────────────────────────────────────────────────
    #assertCredential(name, value) {
        if (!value || value.startsWith('<') || value === 'undefined') {
            throw new Error(
                `${name} is missing or still a placeholder in your .env file. ` +
                `Current value: "${value || '(empty)'}"`
            );
        }
    }
}

export default new ZohoAuthService();

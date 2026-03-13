import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

import { env, zohoHttpsAgent } from './config/env.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter, apiKeyAuth } from './middleware/auth.js';
import auth from './services/ZohoAuthService.js';

import attachmentRoutes from './routes/attachments.js';
import crmRoutes from './routes/crm.js';

export function createApp() {
    const app = express();
    const prefix = `/api/${env.API_VERSION}`;

    // ── Security ────────────────────────────────────────────────────────
    app.use(helmet());
    app.use(cors({ origin: env.isProd() ? [] : '*', methods: ['GET', 'POST'] }));
    app.use(compression());

    // ── Body parsing ────────────────────────────────────────────────────
    app.use(express.json({ limit: '2mb' }));

    // ── Request ID ──────────────────────────────────────────────────────
    app.use((req, _res, next) => { req.id = uuidv4(); next(); });

    // ── HTTP access log ─────────────────────────────────────────────────
    app.use(morgan('short', { stream: { write: (m) => logger.http(m.trim()) } }));

    // ════════════════════════════════════════════════════════════════════
    //  PUBLIC ROUTES (no auth)
    // ════════════════════════════════════════════════════════════════════

    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok', version: env.API_VERSION,
            env: env.NODE_ENV, timestamp: new Date().toISOString(),
        });
    });

    app.get('/debug/zoho', async (_req, res) => {
        const checks = {
            timestamp: new Date().toISOString(),
            config: {
                nodeEnv:      env.NODE_ENV,
                sslBypassed:  !!zohoHttpsAgent,
                accountsUrl:  env.ZOHO_ACCOUNTS_URL,
                apiDomain:    env.ZOHO_API_DOMAIN,
                redirectUri:  env.ZOHO_REDIRECT_URI,
                clientId:     maskVal('ZOHO_CLIENT_ID', env.ZOHO_CLIENT_ID),
                clientSecret: maskVal('ZOHO_CLIENT_SECRET', env.ZOHO_CLIENT_SECRET),
                refreshToken: maskVal('ZOHO_REFRESH_TOKEN', env.ZOHO_REFRESH_TOKEN),
            },
            tests: {},
        };

        // Test 1: accounts URL reachable?
        checks.tests.accounts = await probe(
            env.ZOHO_ACCOUNTS_URL.replace('/oauth/v2/token', '')
        );

        // Test 2: API domain reachable?
        checks.tests.apiDomain = await probe(
            `${env.ZOHO_API_DOMAIN}/crm/v2`
        );

        // Test 3: actual token refresh
        try {
            const token = await auth.getToken();
            checks.tests.tokenRefresh = { ok: true, tokenPrefix: token.slice(0, 12) + '…' };
        } catch (err) {
            checks.tests.tokenRefresh = {
                ok: false, error: err.message,
                code: err.code, zoho: err.response?.data || null,
            };
        }

        const allOk = Object.values(checks.tests).every(t => t.ok);
        res.status(allOk ? 200 : 503).json(checks);
    });

    // ════════════════════════════════════════════════════════════════════
    //  PROTECTED ROUTES (rate limit + API key)
    // ════════════════════════════════════════════════════════════════════

    app.use(prefix, apiLimiter);
    app.use(prefix, apiKeyAuth);

    // PRIMARY — Attachments (the whole point of this API)
    app.use(`${prefix}/attachments`, attachmentRoutes);

    // EXTRA — CRM records
    app.use(`${prefix}/crm`, crmRoutes);

    // ── 404 ─────────────────────────────────────────────────────────────
    app.use((_req, res) => {
        res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Route not found.' },
        });
    });

    // ── Global error handler (must be last) ─────────────────────────────
    app.use(errorHandler);

    return app;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function maskVal(name, val) {
    if (!val) return 'MISSING';
    if (val.startsWith('<')) return 'PLACEHOLDER';
    return val.slice(0, 10) + '…';
}

async function probe(url) {
    try {
        const t = Date.now();
        await axios.get(url, {
            httpsAgent: zohoHttpsAgent, timeout: 5_000, validateStatus: () => true,
        });
        return { ok: true, ms: Date.now() - t };
    } catch (err) {
        return { ok: false, error: err.message, code: err.code };
    }
}

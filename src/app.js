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

import path from 'path';
import attachmentRoutes from './routes/attachments.js';
import crmRoutes from './routes/crm.js';
import accountRoutes from './routes/accounts.js';
import pageRoutes from './routes/pages.js';
import { renderError } from './views/pages.js';

export function createApp() {
    const app = express();
    app.set("trust proxy", 1);
    const prefix = `/api/${env.API_VERSION}`;

    // ── Security ────────────────────────────────────────────────────────
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                'style-src': ["'self'", "'unsafe-inline'"],
            },
        },
    }));
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

    // ── Root redirect → File Manager dashboard ──────────────────────────
    app.get('/', (_req, res) => res.redirect('/pages/accounts'));

    // ── Cache for debug probes (avoid hammering Zoho) ──────────────────
    let _probeCache = { result: null, expires: 0 };
    const PROBE_CACHE_TTL = 60_000; // 1 minute

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

        // Use cached probe results if fresh (prevents rate limiting)
        if (_probeCache.result && Date.now() < _probeCache.expires) {
            checks.tests = _probeCache.result;
            checks._cached = true;
        } else {
            // Test 1: accounts URL reachable?
            checks.tests.accounts = await probe(
                env.ZOHO_ACCOUNTS_URL.replace('/oauth/v2/token', '')
            );

            // Test 2: API domain reachable?
            checks.tests.apiDomain = await probe(
                `${env.ZOHO_API_DOMAIN}/crm/v2`
            );

            // Test 3: actual token refresh (uses cache — only hits Zoho if expired)
            try {
                const token = await auth.getToken();
                checks.tests.tokenRefresh = { ok: true, tokenPrefix: token.slice(0, 12) + '…' };
            } catch (err) {
                checks.tests.tokenRefresh = {
                    ok: false, error: err.message,
                    code: err.code, zoho: err.response?.data || null,
                };
            }

            // Cache the results for 1 minute
            _probeCache = { result: { ...checks.tests }, expires: Date.now() + PROBE_CACHE_TTL };
        }

        const allOk = Object.values(checks.tests).every(t => t.ok);
        res.status(allOk ? 200 : 503).json(checks);
    });

    // ── Serve downloaded files publicly via /storage/{module}/{SAP_ID}/ ─
    const storageDir = path.resolve(env.ATTACHMENT_DIR);
    app.use('/storage', express.static(storageDir, {
        dotfiles: 'deny',
        index:    false,
    }));

    // ── HTML Pages — File browser UI (public, no auth) ──────────────────
    app.use('/pages', pageRoutes);

    // ════════════════════════════════════════════════════════════════════
    //  PROTECTED ROUTES (rate limit + API key)
    // ════════════════════════════════════════════════════════════════════

    app.use(prefix, apiLimiter);
    app.use(prefix, apiKeyAuth);

    // PRIMARY — Attachments (the whole point of this API)
    app.use(`${prefix}/attachments`, attachmentRoutes);

    // ACCOUNTS — File Upload field sync (Distributor layout)
    app.use(`${prefix}/accounts`, accountRoutes);

    // EXTRA — CRM records
    app.use(`${prefix}/crm`, crmRoutes);

    // ── 404 ─────────────────────────────────────────────────────────────
    app.use((req, res) => {
        // Return HTML for browser requests, JSON for API requests
        const wantsHtml = req.headers.accept?.includes('text/html');

        if (wantsHtml) {
            return res.status(404).send(renderError(404, 'Page Not Found',
                `The URL <code>${req.originalUrl}</code> doesn't exist on this server.`
            ));
        }

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

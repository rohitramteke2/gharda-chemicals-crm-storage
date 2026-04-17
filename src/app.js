import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import path from 'path';

import { env, zohoHttpsAgent } from './config/env.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter, apiKeyAuth } from './middleware/auth.js';
import { ipWhitelist } from './middleware/ipWhitelist.js';
import auth from './services/ZohoAuthService.js';

import accountRoutes from './routes/accounts.js';
import farmerRoutes from './routes/farmers.js';
import pageRoutes from './routes/pages.js';
import logRoutes from './routes/logs.js';
import { renderError } from './views/pages.js';

export function createApp() {
    const app = express();
    app.set('trust proxy', true);
    const prefix = `/api/${env.API_VERSION}`;

    // ── Security ────────────────────────────────────────────────────────────
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                'style-src':     ["'self'", "'unsafe-inline'"],
                // Allow Zoho CRM to embed pages in iframe
                'frame-ancestors': ["*"],
            },
        },
        // Also disable the legacy X-Frame-Options header
        // (helmet sets it to SAMEORIGIN by default which also blocks iframes)
        frameguard: false,
    }));
    
    // note: blocks everything in pt
    // app.use(cors({ origin: env.isProd() ? [] : '*', methods: ['GET', 'POST'] }));

    // ── CORS ─────────────────────────────────────────────────────────────────
    // Allowed origins:
    //   - *.zoho.in / *.zoho.com     → Zoho CRM widgets (production)
    //   - 127.0.0.1:*                → Zoho CRM widget local dev server
    //   - localhost:*                → local development
    //   - no origin                  → Postman, Deluge invokeurl, server-to-server
    const corsOptions = {
        origin: (origin, callback) => {
            // No origin = Postman / server-to-server / Deluge — always allow
            if (!origin) return callback(null, true);

            // Zoho production domains
            if (origin.endsWith('.zoho.in') || origin.endsWith('.zoho.com')) return callback(null, true);

            // Zoho widget local dev server (runs on 127.0.0.1 with any port)
            if (origin.startsWith('https://127.0.0.1') || origin.startsWith('http://127.0.0.1')) return callback(null, true);

            // Zoho widget CDN
            if (origin.endsWith('.zwidgets.com')) return callback(null, true);

            // for zoho widget
            if (origin.endsWith('.zappsusercontent.in')) return callback(null, true);

            // Localhost dev
            if (origin.startsWith('http://localhost') || origin.startsWith('https://localhost')) return callback(null, true);

            logger.warn('CORS blocked', { origin });
            callback(new Error('CORS: origin not allowed'));
        },
        methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
        credentials: true,
    };

    app.options('*', cors(corsOptions));  // handle preflight OPTIONS first
    app.use(cors(corsOptions));           // apply to all routes

    app.use(compression());

    // ── Body parsing ─────────────────────────────────────────────────────────
    app.use(express.json({ limit: '2mb' }));

    // ── Request ID ───────────────────────────────────────────────────────────
    app.use((req, _res, next) => { req.id = uuidv4(); next(); });

    // ── HTTP access log ──────────────────────────────────────────────────────
    app.use(morgan('short', { stream: { write: (m) => logger.http(m.trim()) } }));

    // ════════════════════════════════════════════════════════════════════════
    //  PUBLIC ROUTES (no auth required)
    // ════════════════════════════════════════════════════════════════════════

    // Health check
    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            version: env.API_VERSION,
            env: env.NODE_ENV,
            timestamp: new Date().toISOString(),
        });
    });

    // Root → File Manager dashboard
    app.get('/', (_req, res) => res.redirect('/pages/accounts'));

    // ── Debug probe (cached — won't hammer Zoho) ────────────────────────────
    let _probeCache = { result: null, expires: 0 };
    const PROBE_CACHE_TTL = 60_000;

    app.get('/debug/zoho', async (_req, res) => {
        const checks = {
            timestamp: new Date().toISOString(),
            config: {
                nodeEnv: env.NODE_ENV,
                sslBypassed: !!zohoHttpsAgent,
                accountsUrl: env.ZOHO_ACCOUNTS_URL,
                apiDomain: env.ZOHO_API_DOMAIN,
                redirectUri: env.ZOHO_REDIRECT_URI,
                clientId: maskVal('ZOHO_CLIENT_ID', env.ZOHO_CLIENT_ID),
                clientSecret: maskVal('ZOHO_CLIENT_SECRET', env.ZOHO_CLIENT_SECRET),
                refreshToken: maskVal('ZOHO_REFRESH_TOKEN', env.ZOHO_REFRESH_TOKEN),
            },
            tests: {},
        };

        if (_probeCache.result && Date.now() < _probeCache.expires) {
            checks.tests = _probeCache.result;
            checks._cached = true;
        } else {
            checks.tests.accounts = await probe(
                env.ZOHO_ACCOUNTS_URL.replace('/oauth/v2/token', '')
            );
            checks.tests.apiDomain = await probe(`${env.ZOHO_API_DOMAIN}/crm/v2`);

            try {
                const token = await auth.getToken();
                checks.tests.tokenRefresh = { ok: true, tokenPrefix: token.slice(0, 12) + '…' };
            } catch (err) {
                checks.tests.tokenRefresh = {
                    ok: false, error: err.message,
                    code: err.code, zoho: err.response?.data || null,
                };
            }

            _probeCache = { result: { ...checks.tests }, expires: Date.now() + PROBE_CACHE_TTL };
        }

        const allOk = Object.values(checks.tests).every(t => t.ok);
        res.status(allOk ? 200 : 503).json(checks);
    });

    // /storage files are served via token-gated route in pages.js
    // express.static removed — direct /storage URLs now return 404
    // Files only accessible via /pages/storage?path=...&token=... (signed, expires 15 min)

    // ── HTML Pages ──────────────────────────────────────────────────────────
    //
    // IMPORTANT: IP whitelist is applied ONLY to /pages/accounts and /pages/docs.
    // Payment pages (/pages/payment/*) must stay public because ICICI Bank
    // redirects customers there from any IP after payment.
    //
    // The page routes are registered in this order inside routes/pages.js:
    //   1. /pages/payment/success  (POST + GET)  — matched BEFORE the middleware below
    //   2. /pages/docs             — matched AFTER middleware
    //   3. /pages/accounts         — matched AFTER middleware
    //   4. /pages/accounts/:sapId  — matched AFTER middleware
    //
    // Since Express matches routes in registration order, the payment routes
    // in pageRoutes fire first. The ipWhitelist middleware below is applied
    // specifically to /pages/accounts and /pages/docs paths.

    // Payment pages — public (no IP restriction)
    // These are handled first by the router since they're registered first in pages.js

    // Accounts & Docs — IP restricted
    app.use('/pages/accounts', ipWhitelist);
    app.use('/pages/docs', ipWhitelist);

    // Mount all page routes
    app.use('/pages', pageRoutes);

    // ── Logs dashboard — API key protected ─────────────────────────────────
    app.use('/logs', logRoutes);

    // ════════════════════════════════════════════════════════════════════════
    //  PROTECTED ROUTES (rate limit + API key)
    // ════════════════════════════════════════════════════════════════════════

    app.use(prefix, apiLimiter);
    app.use(prefix, apiKeyAuth);

    // ── Accounts — all endpoints ─────────────────────────────────────────────
    app.use(`${prefix}/accounts`, accountRoutes);
    app.use(`${prefix}/farmers`, farmerRoutes);

    // ── 404 ──────────────────────────────────────────────────────────────────
    app.use((req, res) => {
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

    // ── Global error handler (must be last) ──────────────────────────────────
    app.use(errorHandler);

    return app;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
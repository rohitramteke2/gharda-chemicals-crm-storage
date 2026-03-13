import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// ── Rate limiter ───────────────────────────────────────────────────────────
export const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max:      env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders:   false,
    message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' },
    },
});

// ── API key auth ───────────────────────────────────────────────────────────
export function apiKeyAuth(req, res, next) {
    // Skip auth if no key is configured (dev convenience)
    if (!env.API_KEY) return next();

    const key = req.headers['x-api-key'];
    if (key === env.API_KEY) return next();

    res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid X-API-Key header.' },
    });
}

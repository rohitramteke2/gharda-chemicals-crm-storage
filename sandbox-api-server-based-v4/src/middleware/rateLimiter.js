import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

export const apiLimiter = rateLimit({
    windowMs:        env.RATE_LIMIT_WINDOW_MS,
    max:             env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders:   false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', { ip: req.ip, url: req.originalUrl });
        res.status(429).json({
            success: false,
            error: {
                code:    'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests. Please try again later.',
            },
        });
    },
});

export const strictLimiter = rateLimit({
    windowMs:        60_000,
    max:             10,
    standardHeaders: true,
    legacyHeaders:   false,
    handler: (req, res) => {
        logger.warn('Strict rate limit exceeded', { ip: req.ip, url: req.originalUrl });
        res.status(429).json({
            success: false,
            error: {
                code:    'RATE_LIMIT_EXCEEDED',
                message: 'Sync endpoint rate limit exceeded. Max 10 requests/min.',
            },
        });
    },
});

export const apiKeyAuth = (req, res, next) => {
    if (!env.API_KEY) return next();

    const key = req.headers['x-api-key'];
    if (!key || key !== env.API_KEY) {
        logger.warn('Unauthorized API access attempt', { ip: req.ip, url: req.originalUrl });
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key.' },
        });
    }
    next();
};

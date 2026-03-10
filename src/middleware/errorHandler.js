import logger from '../utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    const statusCode = err.statusCode || err.status || 500;
    const requestId  = req.id || 'unknown';

    const logPayload = {
        requestId,
        method:     req.method,
        url:        req.originalUrl,
        statusCode,
        message:    err.message,
        ...(env.isDev() && { stack: err.stack }),
    };

    if (statusCode >= 500) {
        logger.error('Server error', logPayload);
    } else {
        logger.warn('Client error', logPayload);
    }

    const body = {
        success:   false,
        requestId,
        error: {
            code:    err.code    || 'INTERNAL_ERROR',
            message: err.expose  ? err.message : 'An unexpected error occurred',
        },
    };

    if (env.isDev()) body.error.stack = err.stack;

    res.status(statusCode).json(body);
};

export class AppError extends Error {
    constructor(message, statusCode = 500, code = 'APP_ERROR') {
        super(message);
        this.name       = 'AppError';
        this.statusCode = statusCode;
        this.code       = code;
        this.expose     = statusCode < 500;
    }
}

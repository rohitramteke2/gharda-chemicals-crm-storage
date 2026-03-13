import logger from '../utils/logger.js';

/**
 * Express error-handling middleware (must have 4 params).
 * Catches anything thrown or passed to next(err) in controllers/services.
 */
export function errorHandler(err, req, res, _next) {
    // Pull status from Axios errors or from a custom .statusCode property
    const status = err.response?.status || err.statusCode || 500;

    const payload = {
        success: false,
        error: {
            code:    err.code || 'INTERNAL_ERROR',
            message: err.message || 'Something went wrong.',
        },
    };

    // Attach Zoho's error body when available (helps debugging)
    if (err.response?.data) {
        payload.error.zoho = err.response.data;
    }

    logger.error(err.message, {
        method:    req.method,
        url:       req.originalUrl,
        requestId: req.id,
        statusCode: status,
        stack:     err.stack,
    });

    res.status(status).json(payload);
}

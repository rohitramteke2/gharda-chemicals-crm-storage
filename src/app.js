import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import { env } from './config/env.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter, apiKeyAuth } from './middleware/rateLimiter.js';

// ── Concrete implementations (only imported here — composition root) ───────
import attachmentService from './services/AttachmentService.js';
import zohoService     from './services/ZohoService.js';
import storageService  from './services/StorageService.js';
import freshnessPolicy from './services/SyncFreshnessPolicy.js';

// ── Controllers — receive injected dependencies, never import them directly ─
import CRMController from './controllers/CRMController.js';

// ── Route factories ────────────────────────────────────────────────────────
import buildCrmRoutes from './routes/crm.js';

export async function createApp() {
    const app = express();

    // ── Security (must be first) ──────────────────────────────────────────
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc:  ["'self'"],
                scriptSrc:   ["'self'", "'unsafe-inline'"],  // required for Swagger UI
                styleSrc:    ["'self'", "'unsafe-inline'"],  // required for Swagger UI
                imgSrc:      ["'self'", "data:"],            // required for Swagger UI
                connectSrc:  ["'self'"],
            },
        },
    }));

    // ── Swagger UI (public, no auth) ──────────────────────────────────────
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

    // ── CORS ──────────────────────────────────────────────────────────────
    app.use(cors({
        origin:         env.isProd() ? [] : '*',
        methods:        ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'X-API-Key'],
    }));

    // ── Compression ───────────────────────────────────────────────────────
    app.use(compression());

    // ── Body parsing ──────────────────────────────────────────────────────
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // ── Request ID ────────────────────────────────────────────────────────
    app.use((req, _res, next) => {
        req.id = uuidv4();
        next();
    });

    // ── HTTP access log ───────────────────────────────────────────────────
    app.use(morgan('combined', {
        stream: { write: (msg) => logger.http(msg.trim()) },
    }));

    // ── Public health check (no auth required) ────────────────────────────
    app.get('/health', (_req, res) => {
        res.json({
            status:    'ok',
            version:   env.API_VERSION,
            env:       env.NODE_ENV,
            timestamp: new Date().toISOString(),
        });
    });

    // ── Inject dependencies into controllers ──────────────────────────────
    const crmController = new CRMController(zohoService, storageService, freshnessPolicy, attachmentService);
    
    // ── Rate limit + API key auth on all /api/v1/* routes ─────────────────
    app.use(`/api/${env.API_VERSION}`, apiLimiter);
    app.use(`/api/${env.API_VERSION}`, apiKeyAuth);

    // ── Mount routes ──────────────────────────────────────────────────────
    app.use(`/api/${env.API_VERSION}/crm`, buildCrmRoutes(crmController));

    // ── 404 ───────────────────────────────────────────────────────────────
    app.use((_req, res) => {
        res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Route not found.' },
        });
    });

    // ── Global error handler (must be last) ───────────────────────────────
    app.use(errorHandler);

    return app;
}
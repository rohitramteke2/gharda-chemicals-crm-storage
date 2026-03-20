// ── Step 1: Load the right .env file BEFORE anything else imports env.js ───
import { config } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';

// Priority order: .env.{NODE_ENV} > .env
const candidates = [`.env.${nodeEnv}`, '.env'];
let envFile = null;

for (const file of candidates) {
    const full = path.resolve(file);
    if (existsSync(full)) {
        config({ path: full });
        envFile = full;
        break;
    }
}

console.log(
    envFile
        ? `\n  ENV loaded from: ${envFile}  (NODE_ENV=${nodeEnv})\n`
        : `\n  WARNING: No .env file found — using process.env only\n`
);

// ── Step 2: Now import everything that depends on env ──────────────────────
import cluster from 'cluster';
import os from 'os';
import { createApp } from './src/app.js';
import { env, zohoHttpsAgent } from './src/config/env.js';
import logger from './src/utils/logger.js';

const PORT    = env.PORT;
// const WORKERS = env.CLUSTER_WORKERS
//     ? parseInt(env.CLUSTER_WORKERS, 10)
//     : Math.min(os.cpus().length, 4);   // cap at 4 by default

const WORKERS = 1;


// ── Primary process ────────────────────────────────────────────────────────
if (cluster.isPrimary) {
    logger.info('Primary started', {
        pid:     process.pid,
        workers: WORKERS,
        env:     env.NODE_ENV,
        ssl:     !!zohoHttpsAgent ? 'bypassed' : 'default',
    });

    for (let i = 0; i < WORKERS; i++) cluster.fork();

    cluster.on('exit', (worker, code, signal) => {
        logger.warn(`Worker ${worker.process.pid} died (${signal || code}). Restarting.`);
        cluster.fork();
    });

// ── Worker process ─────────────────────────────────────────────────────────
} else {
    const app    = createApp();
    const server = app.listen(PORT, () => {
        logger.info('Worker listening', {
            pid:  process.pid,
            port: PORT,
            env:  env.NODE_ENV,
        });
    });

    server.keepAliveTimeout = 65_000;
    server.headersTimeout   = 66_000;

    const shutdown = (sig) => {
        logger.warn(`Worker ${process.pid} received ${sig}. Shutting down.`);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
        logger.error('Uncaught exception', { error: err.message, stack: err.stack });
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection', { reason });
        process.exit(1);
    });
}

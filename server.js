import 'dotenv/config';
import cluster from 'cluster';
import os from 'os';
import { createApp } from './src/app.js';
import { env } from './src/config/env.js';
import logger from './src/utils/logger.js';

const PORT    = env.PORT || 3000;
const WORKERS = env.CLUSTER_WORKERS
    ? parseInt(env.CLUSTER_WORKERS, 10)
    : os.cpus().length;

// ── Cluster primary process ────────────────────────────────────────────────
if (cluster.isPrimary) {
    logger.info(`🧠 Primary process started`, { pid: process.pid, workers: WORKERS });

    // Fork one worker per CPU core (or CLUSTER_WORKERS override)
    for (let i = 0; i < WORKERS; i++) {
        cluster.fork();
    }

    // Auto-restart any worker that crashes
    cluster.on('exit', (worker, code, signal) => {
        logger.warn(`Worker ${worker.process.pid} died (${signal || code}). Restarting…`);
        cluster.fork();
    });

    cluster.on('online', (worker) => {
        logger.info(`Worker online`, { pid: worker.process.pid });
    });

// ── Worker process ─────────────────────────────────────────────────────────
} else {
    async function bootstrap() {
        try {
            const app = await createApp();

            const server = app.listen(PORT, () => {
                logger.info(`🚀 Worker listening`, {
                    pid:     process.pid,
                    port:    PORT,
                    env:     env.NODE_ENV,
                    version: env.API_VERSION,
                });
            });

            // Keep-alive tuning for high throughput
            server.keepAliveTimeout  = 65_000; // must be > load balancer idle timeout
            server.headersTimeout    = 66_000; // must be > keepAliveTimeout
            server.maxHeadersCount   = 100;

            const shutdown = (signal) => {
                logger.warn(`Worker ${process.pid} received ${signal}. Shutting down…`);
                server.close(() => {
                    logger.info(`Worker ${process.pid} HTTP server closed.`);
                    process.exit(0);
                });
                setTimeout(() => {
                    logger.error('Worker forcing exit after timeout.');
                    process.exit(1);
                }, 10_000);
            };

            process.on('SIGTERM', () => shutdown('SIGTERM'));
            process.on('SIGINT',  () => shutdown('SIGINT'));

            process.on('uncaughtException', (err) => {
                logger.error('Uncaught Exception', { pid: process.pid, error: err.message, stack: err.stack });
                process.exit(1);
            });

            process.on('unhandledRejection', (reason) => {
                logger.error('Unhandled Rejection', { pid: process.pid, reason });
                process.exit(1);
            });

        } catch (err) {
            logger.error('Worker failed to start', { pid: process.pid, error: err.message });
            process.exit(1);
        }
    }

    bootstrap();
}

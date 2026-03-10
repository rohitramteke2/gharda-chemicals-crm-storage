import 'dotenv/config';
import { createApp } from './src/app.js';
import { env } from './src/config/env.js';
import logger from './src/utils/logger.js';

const PORT = env.PORT || 3000;

async function bootstrap() {
    try {
        const app = await createApp();

        const server = app.listen(PORT, () => {
            logger.info('🚀 Server running', {
                port: PORT,
                env: env.NODE_ENV,
                version: env.API_VERSION,
            });
        });

        const shutdown = (signal) => {
            logger.warn(`Received ${signal}. Shutting down gracefully…`);
            server.close(() => {
                logger.info('HTTP server closed.');
                process.exit(0);
            });
            setTimeout(() => {
                logger.error('Forcing exit after timeout.');
                process.exit(1);
            }, 10_000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        process.on('uncaughtException', (err) => {
            logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
            process.exit(1);
        });

        process.on('unhandledRejection', (reason) => {
            logger.error('Unhandled Rejection', { reason });
            process.exit(1);
        });

    } catch (err) {
        logger.error('Failed to start server', { error: err.message });
        process.exit(1);
    }
}

bootstrap();

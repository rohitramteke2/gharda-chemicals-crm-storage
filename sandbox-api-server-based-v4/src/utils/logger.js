import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR   = path.resolve(env.LOG_DIR);

const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
);

const consoleFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
);

const dailyRotateError = new DailyRotateFile({
    filename:      path.join(LOG_DIR, 'error-%DATE%.log'),
    datePattern:   'YYYY-MM-DD',
    level:         'error',
    maxFiles:      '30d',
    maxSize:       '20m',
    zippedArchive: true,
    format:        logFormat,
});

const dailyRotateCombined = new DailyRotateFile({
    filename:      path.join(LOG_DIR, 'combined-%DATE%.log'),
    datePattern:   'YYYY-MM-DD',
    maxFiles:      '30d',
    maxSize:       '50m',
    zippedArchive: true,
    format:        logFormat,
});

const dailyRotateHttp = new DailyRotateFile({
    filename:      path.join(LOG_DIR, 'http-%DATE%.log'),
    datePattern:   'YYYY-MM-DD',
    level:         'http',
    maxFiles:      '14d',
    maxSize:       '50m',
    zippedArchive: true,
    format:        logFormat,
});

const logger = createLogger({
    level:       env.LOG_LEVEL,
    exitOnError: false,
    transports:  [dailyRotateError, dailyRotateCombined, dailyRotateHttp],
});

if (!env.isProd()) {
    logger.add(new transports.Console({ format: consoleFormat }));
}

dailyRotateCombined.on('rotate', (oldFile, newFile) => {
    logger.info('Log rotated', { oldFile, newFile });
});

export default logger;

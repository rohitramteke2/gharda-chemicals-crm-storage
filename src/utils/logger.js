import winston from 'winston';
import DailyRotate from 'winston-daily-rotate-file';
import path from 'path';
import { env } from '../config/env.js';

const logDir = path.resolve(env.LOG_DIR);

const fmt = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
);

const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: fmt,
    transports: [
        // Console — always on
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...rest }) => {
                    const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
                    return `${timestamp} ${level}: ${message}${extra}`;
                }),
            ),
        }),

        // Combined log — rotated daily, kept 30 days
        new DailyRotate({
            dirname:      logDir,
            filename:     'combined-%DATE%.log',
            datePattern:  'YYYY-MM-DD',
            maxFiles:     '30d',
            zippedArchive: true,
        }),

        // Error log — rotated daily, kept 30 days
        new DailyRotate({
            dirname:      logDir,
            filename:     'error-%DATE%.log',
            datePattern:  'YYYY-MM-DD',
            level:        'error',
            maxFiles:     '30d',
            zippedArchive: true,
        }),

        // HTTP access log — rotated daily, kept 14 days
        new DailyRotate({
            dirname:      logDir,
            filename:     'http-%DATE%.log',
            datePattern:  'YYYY-MM-DD',
            level:        'http',
            maxFiles:     '14d',
            zippedArchive: true,
        }),
    ],
});

export default logger;

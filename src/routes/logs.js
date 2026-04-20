/**
 * routes/logs.js — Logs dashboard
 *
 * GET /logs          → HTML dashboard (with ?key= or x-api-key header)
 * GET /logs/data     → JSON log data for auto-refresh
 *
 * Protection: API key required (same key used for /api/v1/* endpoints).
 */

import { Router }  from 'express';
import fs          from 'fs';
import path        from 'path';
import readline    from 'readline';
import { env }     from '../config/env.js';
import logger      from '../utils/logger.js';
import { renderLogsPage } from '../views/pages.js';

const router = Router();

// ── Auth: accept key from query param OR header ──────────────────────────────
function logsAuth(req, res, next) {
    if (!env.API_KEY) return next();
    const key = req.headers['x-api-key']
             || req.query?.key
             || req.query?.['x-api-key'];
    if (key === env.API_KEY) return next();
    return res.status(401).send(`<!DOCTYPE html>
<html><head><title>Unauthorized</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#0f1117;color:#e4e6ef;min-height:100vh;display:flex;align-items:center;justify-content:center}
.w{text-align:center;padding:40px}.icon{font-size:48px;margin-bottom:16px}.h{font-size:22px;font-weight:700;margin-bottom:8px}.p{color:#8b8fa3;font-size:14px}
</style></head><body><div class="w"><div class="icon">🔒</div><div class="h">Unauthorized</div>
<p class="p">Pass your API key as <code>?key=YOUR_KEY</code> or <code>x-api-key</code> header.</p></div></body></html>`);
}

// ── Parse a single log file into an array of objects ────────────────────────
async function parseLogFile(filePath, maxLines = 2000) {
    return new Promise((resolve) => {
        if (!fs.existsSync(filePath)) return resolve([]);
        const entries = [];
        const rl = readline.createInterface({
            input: fs.createReadStream(filePath, { encoding: 'utf8' }),
            crlfDelay: Infinity,
        });
        rl.on('line', (line) => {
            if (!line.trim()) return;
            try {
                entries.push(JSON.parse(line));
            } catch {
                // skip malformed lines
            }
        });
        rl.on('close', () => {
            // Keep only last maxLines
            resolve(entries.slice(-maxLines));
        });
        rl.on('error', () => resolve([]));
    });
}

// ── Build analytics summary from log entries ─────────────────────────────────
function buildAnalytics(combined, http, errors) {
    const all = [...combined, ...http];

    // Counts by level
    const byLevel = { error: 0, warn: 0, info: 0, http: 0 };
    for (const e of all) {
        const lvl = (e.level || '').toLowerCase();
        if (byLevel[lvl] !== undefined) byLevel[lvl]++;
    }

    // Daily stats (last 14 days)
    const dailyMap = {};
    for (const e of all) {
        const day = (e.timestamp || '').slice(0, 10);
        if (!day) continue;
        if (!dailyMap[day]) dailyMap[day] = { requests: 0, errors: 0 };
        if ((e.level || '') === 'http') dailyMap[day].requests++;
        if ((e.level || '') === 'error') dailyMap[day].errors++;
    }
    const daily = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, v]) => ({ date, ...v }));

    // Top endpoints from HTTP logs
    const endpointMap = {};
    for (const e of all) {
        if (e.level !== 'http') continue;
        const m = (e.message || '').match(/(?:GET|POST|PATCH|PUT|DELETE)\s+(\/[^\s?]*)/);
        if (m) {
            const ep = m[1];
            endpointMap[ep] = (endpointMap[ep] || 0) + 1;
        }
    }
    const topEndpoints = Object.entries(endpointMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([path, count]) => ({ path, count }));

    // Recent errors (last 15)
    const recentErrors = [...combined, ...errors]
        .filter(e => e.level === 'error')
        .slice(-15)
        .reverse();

    // Last activity
    const lastEntry = all.at(-1);
    const lastActivity = lastEntry?.timestamp || null;

    return {
        totals: {
            requests:  byLevel.http,
            errors:    byLevel.error,
            warnings:  byLevel.warn,
            info:      byLevel.info,
            allLines:  all.length,
        },
        daily,
        topEndpoints,
        recentErrors,
        lastActivity,
    };
}

// ── Load log data ────────────────────────────────────────────────────────────
async function loadLogData(days = 3) {
    // Normalize LOG_DIR path — handles Windows backslashes from .env
    const rawDir = env.LOG_DIR || './logs';
    const logDir = path.resolve(rawDir.replace(/\\/g, path.sep).replace(/\//g, path.sep));

    const today = new Date();
    const combined = [];
    const http     = [];
    const errors   = [];

    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        // Format date as YYYY-MM-DD using local time (not UTC) to match log filenames
        const year  = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day   = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const [c, h, e] = await Promise.all([
            parseLogFile(path.join(logDir, `combined-${dateStr}.log`)),
            parseLogFile(path.join(logDir, `http-${dateStr}.log`)),
            parseLogFile(path.join(logDir, `error-${dateStr}.log`)),
        ]);
        combined.push(...c);
        http.push(...h);
        errors.push(...e);
    }

    return { combined, http, errors };
}

// ── GET /logs/debug — check what files exist ────────────────────────────────
router.get('/debug', logsAuth, async (req, res) => {
    const rawDir = env.LOG_DIR || './logs';
    const logDir = path.resolve(rawDir.replace(/\\/g, path.sep).replace(/\//g, path.sep));
    const exists = fs.existsSync(logDir);
    let files = [];
    if (exists) {
        try { files = fs.readdirSync(logDir).filter(f => f.endsWith('.log')).sort().reverse().slice(0, 20); }
        catch(e) { files = ['error: ' + e.message]; }
    }
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    res.json({
        LOG_DIR_raw:  rawDir,
        LOG_DIR_resolved: logDir,
        dirExists:    exists,
        todayDate:    dateStr,
        files,
    });
});

// ── GET /logs — HTML dashboard ───────────────────────────────────────────────
router.get('/', logsAuth, async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days || '3', 10), 14);
        const { combined, http, errors } = await loadLogData(days);
        const analytics = buildAnalytics(combined, http, errors);

        // Most recent entries for the log viewer (last 500, newest first)
        const allEntries = [...combined, ...http]
            .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))
            .slice(-500)
            .reverse();

        res.send(renderLogsPage({
            analytics,
            entries:    allEntries,
            days,
            apiKey:     req.headers['x-api-key'] || req.query.key || '',
        }));
    } catch (err) {
        logger.error('Logs dashboard error', { message: err.message });
        res.status(500).send('<pre>Error loading logs: ' + err.message + '</pre>');
    }
});

// ── GET /logs/data — JSON for auto-refresh ───────────────────────────────────
router.get('/data', logsAuth, async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days || '1', 10), 14);
        const { combined, http, errors } = await loadLogData(days);
        const analytics = buildAnalytics(combined, http, errors);

        const allEntries = [...combined, ...http]
            .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))
            .slice(-200)
            .reverse();

        res.json({ analytics, entries: allEntries });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Alias routes — older dashboard calls these endpoints ────────────────────
router.get('/api/summary', logsAuth, async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days || '7', 10), 14);
        const { combined, http, errors } = await loadLogData(days);
        const analytics = buildAnalytics(combined, http, errors);
        res.json({ success: true, data: {
            period:        `Last ${days} days`,
            totalRequests: analytics.totals.requests,
            totalErrors:   analytics.totals.errors,
            totalLogs:     analytics.totals.allLines,
            errorRate:     analytics.totals.requests > 0
                ? ((analytics.totals.errors / analytics.totals.requests) * 100).toFixed(2) + '%'
                : '0%',
            lastActivity:  analytics.lastActivity,
            dailyCounts:   Object.fromEntries(analytics.daily.map(d => [d.date, d.requests])),
            dailyErrors:   Object.fromEntries(analytics.daily.map(d => [d.date, d.errors])),
            topUrls:       analytics.topEndpoints.map(e => ({ url: e.path, count: e.count })),
            levelCounts:   {
                error: analytics.totals.errors,
                warn:  analytics.totals.warnings,
                info:  analytics.totals.info,
                http:  analytics.totals.requests,
            },
            recentErrors:  analytics.recentErrors.slice(0, 10).map(e => ({
                timestamp: e.timestamp, message: e.message, stack: null,
            })),
        }});
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/api/entries', logsAuth, async (req, res) => {
    try {
        const days  = Math.min(parseInt(req.query.days  || '1',   10), 14);
        const limit = Math.min(parseInt(req.query.limit || '200', 10), 500);
        const page  = Math.max(parseInt(req.query.page  || '1',   10), 1);
        const level  = req.query.level  || '';
        const search = req.query.search || '';

        const { combined, http } = await loadLogData(days);
        let entries = [...combined, ...http]
            .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

        if (level)  entries = entries.filter(e => e.level === level);
        if (search) entries = entries.filter(e =>
            JSON.stringify(e).toLowerCase().includes(search.toLowerCase()));

        const total  = entries.length;
        const offset = (page - 1) * limit;
        res.json({ success: true, data: {
            total, page, limit,
            pages:   Math.ceil(total / limit),
            entries: entries.slice(offset, offset + limit),
        }});
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
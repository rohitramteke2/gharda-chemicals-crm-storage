/**
 * middleware/ipWhitelist.js — IP-based access restriction.
 *
 * Only allows whitelisted IPs through. Applied to specific route groups in app.js.
 *
 * Configuration:
 *   ALLOWED_IPS=27.107.69.106,203.0.113.50   (comma-separated in .env)
 *   Falls back to hardcoded default if env var is missing.
 */

import logger from '../utils/logger.js';

// ── Load allowed IPs ────────────────────────────────────────────────────────
const DEFAULT_IPS = ['27.107.69.106', '152.58.16.163.252'];

function loadAllowedIps() {
    const raw = process.env.ALLOWED_IPS || '';
    if (raw.trim()) {
        return raw.split(',').map(ip => ip.trim()).filter(Boolean);
    }
    return DEFAULT_IPS;
}

const ALLOWED = new Set(loadAllowedIps());

// ── Extract real client IP (handles proxies, IIS ARR, etc.) ─────────────────
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        let ip = forwarded.split(',')[0].trim();
        // Strip port if present e.g. "27.107.69.106:63635" → "27.107.69.106"
        if (ip.includes(':') && !ip.startsWith('[')) ip = ip.split(':')[0];
        return ip;
    }
    let ip = req.ip || req.connection?.remoteAddress || '';
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);
    // Strip port if present
    if (ip.includes(':') && !ip.startsWith('[')) ip = ip.split(':')[0];
    return ip;
}

// ── Blocked page HTML ───────────────────────────────────────────────────────
function renderBlocked(clientIp) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Restricted</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0f1117; color: #e4e6ef;
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
        }
        .wrap { text-align: center; max-width: 480px; padding: 40px 24px; }
        .icon {
            width: 72px; height: 72px; margin: 0 auto 24px;
            background: rgba(248, 113, 113, 0.12); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 32px;
        }
        h1 { font-size: 22px; font-weight: 700; margin-bottom: 12px; }
        p { color: #8b8fa3; font-size: 14px; line-height: 1.6; margin-bottom: 8px; }
        .ip {
            display: inline-block; margin-top: 16px; padding: 6px 16px;
            background: #1a1d27; border: 1px solid #2e3346; border-radius: 6px;
            font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
            font-size: 13px; color: #f87171;
        }
        .footer { margin-top: 40px; font-size: 11px; color: #4a4e63; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="icon">&#128274;</div>
        <h1>Access Restricted</h1>
        <p>This page is only accessible from authorized network locations.</p>
        <p>If you believe this is an error, contact your system administrator.</p>
        <div class="ip">${clientIp}</div>
        <div class="footer">Gharda Chemicals &mdash; Zoho CRM Integration</div>
    </div>
</body>
</html>`;
}

// ── Middleware ───────────────────────────────────────────────────────────────
export function ipWhitelist(req, res, next) {
    const clientIp = getClientIp(req);

    // Allow localhost for internal health probes / dev
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost' || clientIp == "27.107.69.106") {
        return next();
    }

    if (ALLOWED.has(clientIp)) {
        return next();
    }

    logger.warn('IP blocked', {
        ip: clientIp,
        path: req.originalUrl,
        method: req.method,
    });

    return res.status(403).send(renderBlocked(clientIp));
}
import TokenService   from '../services/TokenService.js';
import { renderError } from '../views/pages.js';
import logger          from '../utils/logger.js';

/**
 * tokenGate middleware
 * ────────────────────
 * Validates a short-lived signed token passed as ?token= in the URL.
 * Decrypts the encryptedId from the URL path to get the real CRM record ID.
 *
 * URL format:
 *   /pages/docs/{encryptedId}?token={signedToken}
 *
 * On success  → calls next(), attaches req.tokenPayload = { recordId, exp }
 * On failure  → renders a friendly "Link Expired" HTML page
 */
export function tokenGate(req, res, next) {
    const { token }       = req.query;
    const { encryptedId } = req.params;

    // ── No token at all ───────────────────────────────────────────────────
    if (!token) {
        logger.warn('tokenGate: no token in URL', { path: req.originalUrl });
        return res.status(401).send(renderTokenError(
            'Link Missing',
            'This link is incomplete. Please go back to Zoho CRM and click the button again.'
        ));
    }

    // ── Validate token + decrypt record ID ───────────────────────────────
    const payload = TokenService.validate(token, encryptedId);

    if (!payload) {
        logger.warn('tokenGate: invalid or expired token', { path: req.originalUrl });
        return res.status(401).send(renderTokenError(
            'Link Expired',
            'This secure link has expired or is invalid. Links are valid for 15 minutes only. Please go back to Zoho CRM and click the button again to get a fresh link.'
        ));
    }

    // ── Attach decrypted record ID for the route handler ─────────────────
    req.tokenPayload = payload;   // { recordId, exp }
    next();
}

// ── Friendly HTML error page ──────────────────────────────────────────────
function renderTokenError(title, message) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — Gharda CRM</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f0f2f5; color: #1a1a2e;
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
        }
        .wrap {
            text-align: center; max-width: 460px; padding: 48px 32px;
            background: #fff; border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .icon {
            width: 72px; height: 72px; margin: 0 auto 24px;
            background: #fff3cd; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 34px;
        }
        h1  { font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #1a1a2e; }
        p   { color: #666; font-size: 14px; line-height: 1.6; }
        .footer { margin-top: 32px; font-size: 11px; color: #aaa; }
        .btn {
            display: inline-block; margin-top: 24px; padding: 10px 24px;
            background: #1E3A5F; color: #fff; border-radius: 8px;
            text-decoration: none; font-size: 14px; font-weight: 600;
            cursor: pointer; border: none;
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="icon">⏳</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <button class="btn" onclick="window.close()">Close Window</button>
        <div class="footer">Gharda Chemicals — Zoho CRM Integration</div>
    </div>
</body>
</html>`;
}
/**
 * middleware/ipWhitelist.js
 *
 * Restricts access to /pages/accounts (file browser) to whitelisted IPs only.
 * /pages/payment/success remains fully public (ICICI redirect must reach it).
 *
 * Add IPs to ALLOWED_IPS in .env.production:
 *   ALLOWED_IPS=27.107.69.106,10.0.0.5
 *
 * Or hardcode them below as fallback.
 */

import logger from "../utils/logger.js";
import { renderError } from "../views/pages.js";

// ── Whitelisted IPs ──────────────────────────────────────────────────────────
// Read from env (comma-separated) or use hardcoded fallback
function getAllowedIPs() {
    const fromEnv = process.env.ALLOWED_IPS || "";
    const envList = fromEnv
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean);

    const hardcoded = [
        "27.107.69.106", // Gharda office
        "127.0.0.1", // localhost (VM internal access)
        "::1", // localhost IPv6
        "::ffff:127.0.0.1", // localhost mapped IPv4
    ];

    // Merge env list with hardcoded — env takes priority / extends the list
    return [...new Set([...hardcoded, ...envList])];
}

// ── Extract real client IP ────────────────────────────────────────────────────
// Handles proxies (IIS ARR) which may set X-Forwarded-For
function getClientIP(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
        // X-Forwarded-For can be a comma-separated list — first one is the real client
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "";
}

// ── Middleware ────────────────────────────────────────────────────────────────
export function ipWhitelist(req, res, next) {
    // Always allow payment success page — ICICI redirect must reach it
    if (req.path.startsWith("/payment/")) {
        return next();
    }

    const clientIP = getClientIP(req);
    const allowedIPs = getAllowedIPs();
    const isAllowed = allowedIPs.includes(clientIP);

    if (isAllowed) {
        return next();
    }

    logger.warn("IP whitelist: access denied", {
        ip: clientIP,
        path: req.originalUrl,
        allowed: allowedIPs,
    });

    // Return a clean HTML blocked page
    return res.status(403).send(
        renderError(
            403,
            "Access Restricted",
            `This page is only accessible from authorised network locations.<br>
         Your IP <code>${clientIP}</code> is not on the access list.<br><br>
         Please contact your system administrator.`,
        ),
    );
}

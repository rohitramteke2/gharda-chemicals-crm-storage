import https from 'https';

// ── Helpers ────────────────────────────────────────────────────────────────
const get = (key, fallback = '') => process.env[key] || fallback;

// ── Exported config object ─────────────────────────────────────────────────
export const env = {
    NODE_ENV:    get('NODE_ENV', 'development'),
    PORT:        parseInt(get('PORT', '3000'), 10),
    API_VERSION: get('API_VERSION', 'v1'),

    // Security
    API_KEY:              get('API_KEY'),
    RATE_LIMIT_WINDOW_MS: parseInt(get('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    RATE_LIMIT_MAX:       parseInt(get('RATE_LIMIT_MAX_REQUESTS', '100'), 10),

    // Zoho OAuth
    ZOHO_CLIENT_ID:     get('ZOHO_CLIENT_ID'),
    ZOHO_CLIENT_SECRET: get('ZOHO_CLIENT_SECRET'),
    ZOHO_REFRESH_TOKEN: get('ZOHO_REFRESH_TOKEN'),
    ZOHO_REDIRECT_URI:  get('ZOHO_REDIRECT_URI'),
    ZOHO_ACCOUNTS_URL:  get('ZOHO_ACCOUNTS_URL', 'https://accounts.zoho.in/oauth/v2/token'),
    ZOHO_API_DOMAIN:    get('ZOHO_API_DOMAIN', 'https://www.zohoapis.in'),

    // SSL — explicit opt-in to bypass certificate verification
    ZOHO_SKIP_SSL_VERIFY: get('ZOHO_SKIP_SSL_VERIFY', 'false'),

    // Storage on RDP / VM
    ATTACHMENT_DIR: get('ATTACHMENT_DIR', './storage/attachments'),

    // Public base URL for serving downloaded files
    PUBLIC_BASE_URL: get('PUBLIC_BASE_URL', 'https://zoho.gharda.com:14443/production'),

    // Logging
    LOG_LEVEL: get('LOG_LEVEL', 'info'),
    LOG_DIR:   get('LOG_DIR', './logs'),

    // Cluster
    CLUSTER_WORKERS: get('CLUSTER_WORKERS', ''),

    // Shortcuts
    isDev:  () => env.NODE_ENV === 'development',
    isProd: () => env.NODE_ENV === 'production',

};

// ── Shared HTTPS agent ─────────────────────────────────────────────────────
// Bypasses SSL when:
//   1. ZOHO_SKIP_SSL_VERIFY=true   (explicit, recommended for self-signed certs)
//   2. ZOHO_API_DOMAIN is a private / non-standard host
const isPrivateDomain = (() => {
    try {
        const host = new URL(env.ZOHO_API_DOMAIN).hostname;
        return (
            !host.endsWith('.zohoapis.in') &&
            !host.endsWith('.zohoapis.com') &&
            !host.endsWith('.zoho.in') &&
            !host.endsWith('.zoho.com')
        );
    } catch {
        return false;
    }
})();

const skipSSL = env.ZOHO_SKIP_SSL_VERIFY === 'true' || isPrivateDomain;

export const zohoHttpsAgent = skipSSL
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

const optional = (key, fallback = '') => process.env[key] || fallback;

export const env = {
    // Server
    NODE_ENV:        optional('NODE_ENV', 'development'),
    PORT:            parseInt(optional('PORT', '3000'), 10),
    API_VERSION:     optional('API_VERSION', 'v1'),
    CLUSTER_WORKERS: optional('CLUSTER_WORKERS', ''),  // blank = use os.cpus().length

    // Security
    API_KEY:              optional('API_KEY', ''),
    RATE_LIMIT_WINDOW_MS: parseInt(optional('RATE_LIMIT_WINDOW_MS', '1000'),  10), // 1-second window
    RATE_LIMIT_MAX:       parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '200'), 10), // 200 req/sec

    // Zoho CRM
    ZOHO_CLIENT_ID:     optional('ZOHO_CLIENT_ID'),
    ZOHO_CLIENT_SECRET: optional('ZOHO_CLIENT_SECRET'),
    ZOHO_REFRESH_TOKEN: optional('ZOHO_REFRESH_TOKEN'),
    ZOHO_REDIRECT_URI:  optional('ZOHO_REDIRECT_URI', 'https://www.zohoapis.in/crm/v2'),
    ZOHO_ACCOUNTS_URL:  optional('ZOHO_ACCOUNTS_URL', 'https://accounts.zoho.in/oauth/v2/token'),

    // Storage
    STORAGE_BASE_PATH: optional('STORAGE_BASE_PATH', './storage/crm-data'),

    // Logging
    LOG_LEVEL: optional('LOG_LEVEL', 'info'),
    LOG_DIR:   optional('LOG_DIR', './logs'),

    // Helpers
    isDev:  () => env.NODE_ENV === 'development',
    isProd: () => env.NODE_ENV === 'production',

    // Storage
    ATTACHMENT_STORAGE_PATH: optional('ATTACHMENT_STORAGE_PATH', './storage/attachments'),

};

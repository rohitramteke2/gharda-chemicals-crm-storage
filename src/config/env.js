import https from "https";
import fs from "fs";

// ── Helpers ────────────────────────────────────────────────────────────────
const get = (key, fallback = "") => process.env[key] || fallback;

// ── Exported config object ─────────────────────────────────────────────────
export const env = {
    NODE_ENV: get("NODE_ENV", "development"),
    PORT: parseInt(get("PORT", "3000"), 10),
    API_VERSION: get("API_VERSION", "v1"),

    // Security
    API_KEY: get("API_KEY"),
    RATE_LIMIT_WINDOW_MS: parseInt(get("RATE_LIMIT_WINDOW_MS", "60000"), 10),
    RATE_LIMIT_MAX: parseInt(get("RATE_LIMIT_MAX_REQUESTS", "100"), 10),

    // Zoho OAuth
    ZOHO_CLIENT_ID: get("ZOHO_CLIENT_ID"),
    ZOHO_CLIENT_SECRET: get("ZOHO_CLIENT_SECRET"),
    ZOHO_REFRESH_TOKEN: get("ZOHO_REFRESH_TOKEN"),
    ZOHO_REDIRECT_URI: get("ZOHO_REDIRECT_URI"),
    ZOHO_ACCOUNTS_URL: get(
        "ZOHO_ACCOUNTS_URL",
        "https://accounts.zoho.in/oauth/v2/token",
    ),
    ZOHO_API_DOMAIN: get("ZOHO_API_DOMAIN", "https://www.zohoapis.in"),

    // Zoho Creator
    ZOHO_CREATOR_OWNER: get("ZOHO_CREATOR_OWNER", "zohoadmin_gharda782"),
    ZOHO_CREATOR_APP: get(
        "ZOHO_CREATOR_APP",
        "distributor-management-gharda-chemical",
    ),

    // Storage on RDP / VM
    ATTACHMENT_DIR: get("ATTACHMENT_DIR", "./storage/attachments"),

    // Public base URL for serving downloaded files
    PUBLIC_BASE_URL: get(
        "PUBLIC_BASE_URL",
        "https://zoho.gharda.com:14443/production",
    ),

    // Logging
    LOG_LEVEL: get("LOG_LEVEL", "info"),
    LOG_DIR: get("LOG_DIR", "./logs"),

    // Cluster
    CLUSTER_WORKERS: get("CLUSTER_WORKERS", ""),

    // Shortcuts
    isDev: () => env.NODE_ENV === "development",
    isProd: () => env.NODE_ENV === "production",
};

// ── Shared HTTPS agent ─────────────────────────────────────────────────────
const isProd = env.NODE_ENV === "production";

export const zohoHttpsAgent = isProd
    ? new https.Agent({
          ca: fs.readFileSync(
              "D:/Software/SSL GHARDA/2555645900/certs/usertrust.pem",
          ),
      })
    : new https.Agent({
          rejectUnauthorized: false,
      });

// ─────────────────────────────────────────────────────────────────────────────
//  cron.js  —  Zoho Accounts Auto-Sync Cron Job
//
//  Strategy:
//    Every 30 min  → Poll GET /accounts/approved
//                  → For each account NOT seen before → POST /accounts/:id/sync
//
//    Every day 2AM → POST /accounts/sync  (full bulk re-sync, catches updates)
//
//  State:
//    ./synced-accounts.json  — tracks which record IDs have already been synced
//                              so we never re-download the same account twice
//                              unless it's the daily full re-sync.
//
//  Run:
//    node cron.js
//    pm2 start cron.js --name zoho-cron
// ─────────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import cron from "node-cron";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.CRON_BASE_URL || "http://localhost:3000/api/v1";
const API_KEY = process.env.API_KEY || "";
const STATE_FILE = path.join(__dirname, "synced-accounts.json");

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(level, msg, data = {}) {
    const ts = new Date().toISOString();
    const extra = Object.keys(data).length ? "  " + JSON.stringify(data) : "";
    console.log(`[${ts}] [${level.toUpperCase()}] ${msg}${extra}`);
}

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
        }
    } catch (e) {
        log("warn", "Could not read state file, starting fresh", {
            error: e.message,
        });
    }
    return { syncedIds: [], lastFullSync: null };
}

function saveState(state) {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
        log("error", "Could not save state file", { error: e.message });
    }
}

const headers = () => ({
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
});

// ── Core operations ───────────────────────────────────────────────────────────

/**
 * Fetch the list of all approved accounts from the API.
 * Returns an array of { id, accountName, sapId } objects.
 */
async function fetchApprovedAccounts() {
    const { data } = await axios.get(`${BASE_URL}/accounts/approved`, {
        headers: headers(),
        timeout: 30_000,
    });

    if (!data.success) {
        throw new Error(
            `API returned success=false: ${JSON.stringify(data.error)}`,
        );
    }

    return data.data.accounts || [];
}

/**
 * Sync a single account by record ID.
 * Returns { status_api_check, summary } or throws on HTTP error.
 */
async function syncAccount(recordId, accountName) {
    log("info", `Syncing account`, { recordId, accountName });

    const { data } = await axios.post(
        `${BASE_URL}/accounts/${recordId}/sync`,
        {},
        { headers: headers(), timeout: 300_000 }, // 5 min timeout — 22 files
    );

    if (data.status_api_check) {
        log("info", `Sync complete`, {
            recordId,
            accountName,
            downloaded: data.data?.summary?.downloaded,
            failed: data.data?.summary?.failed,
            empty: data.data?.summary?.fields_empty,
        });
    } else {
        log("warn", `Sync partial or failed`, {
            recordId,
            accountName,
            summary: data.data?.summary,
            error: data.error,
        });
    }

    return data;
}

/**
 * Trigger a full bulk sync of all approved accounts.
 * Called once daily at 2 AM.
 *
 * Instead of calling POST /accounts/sync (which hammers Zoho with all accounts
 * back-to-back), we fetch the approved list and sync each account individually
 * with a 1-minute gap between each one to stay within Zoho rate limits.
 */
async function syncAll() {
    log("info", "Starting full bulk sync of all approved accounts...");

    let approved;
    try {
        approved = await fetchApprovedAccounts();
    } catch (err) {
        log("error", "Full sync: failed to fetch approved accounts", {
            error: err.message,
        });
        return;
    }

    log("info", `Full sync: processing accounts`, { total: approved.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < approved.length; i++) {
        const account = approved[i];

        try {
            const result = await syncAccount(account.id, account.accountName);
            if (result.status_api_check) successCount++;
            else failCount++;
        } catch (err) {
            log("error", "Full sync: account failed", {
                recordId: account.id,
                accountName: account.accountName,
                error: err.response?.data || err.message,
            });
            failCount++;
        }

        // Wait 1 minute between accounts to respect Zoho rate limits
        // Skip the wait after the last account
        if (i < approved.length - 1) {
            log(
                "info",
                `Full sync: waiting 60s before next account (${i + 1}/${approved.length} done)...`,
            );
            await new Promise((r) => setTimeout(r, 60_000));
        }
    }

    log("info", "Full bulk sync complete", {
        total: approved.length,
        successful: successCount,
        failed: failCount,
    });
}

// ── Poll job — runs every 30 minutes ─────────────────────────────────────────

async function pollAndSyncNew() {
    log("info", "Polling for newly approved accounts...");

    const state = loadState();
    const syncedSet = new Set(state.syncedIds);

    let approved;
    try {
        approved = await fetchApprovedAccounts();
    } catch (err) {
        log("error", "Failed to fetch approved accounts", {
            error: err.message,
        });
        return;
    }

    log("info", `Found approved accounts`, {
        total: approved.length,
        alreadySynced: syncedSet.size,
    });

    // Filter to only accounts we haven't synced yet
    const newAccounts = approved.filter((a) => !syncedSet.has(a.id));

    if (newAccounts.length === 0) {
        log("info", "No new approved accounts to sync.");
        return;
    }

    log("info", `New accounts to sync`, {
        count: newAccounts.length,
        accounts: newAccounts.map((a) => a.sapId || a.id),
    });

    // Sync each new account one by one
    for (const account of newAccounts) {
        try {
            await syncAccount(account.id, account.accountName);
            // Mark as synced regardless of partial success
            syncedSet.add(account.id);
            saveState({ ...state, syncedIds: [...syncedSet] });
        } catch (err) {
            log("error", `Failed to sync account`, {
                recordId: account.id,
                accountName: account.accountName,
                error: err.response?.data || err.message,
            });
            // Don't add to syncedSet — will retry next poll
        }

        // Small delay between accounts to avoid hammering the API
        if (newAccounts.indexOf(account) < newAccounts.length - 1) {
            await new Promise((r) => setTimeout(r, 5000));
        }
    }

    log("info", "Poll cycle complete.");
}

// ── Daily full re-sync — runs at 2:00 AM ─────────────────────────────────────

async function dailyFullSync() {
    log("info", "Daily full sync triggered (2:00 AM)");

    try {
        await syncAll();

        // After a full sync, reset the state so everything is treated as synced
        const state = loadState();

        let approved;
        try {
            approved = await fetchApprovedAccounts();
            saveState({
                ...state,
                syncedIds: approved.map((a) => a.id),
                lastFullSync: new Date().toISOString(),
            });
        } catch {
            // Not critical if we can't update state after full sync
        }
    } catch (err) {
        log("error", "Daily full sync failed", {
            error: err.response?.data || err.message,
        });
    }
}

// ── Schedule ──────────────────────────────────────────────────────────────────

log("info", "=== Zoho Cron Job Starting ===", {
    baseUrl: BASE_URL,
    authKey: API_KEY ? `${API_KEY.slice(0, 8)}...` : "NOT SET",
    stateFile: STATE_FILE,
});

if (!API_KEY) {
    log(
        "warn",
        "API_KEY is not set — requests will fail in production unless auth is disabled",
    );
}

// Every 30 minutes — poll for new approved accounts
cron.schedule("*/30 * * * *", () => {
    pollAndSyncNew().catch((err) => {
        log("error", "Unhandled error in poll job", { error: err.message });
    });
});

// Every day at 2:00 AM — full bulk sync
cron.schedule("0 2 * * *", () => {
    dailyFullSync().catch((err) => {
        log("error", "Unhandled error in daily sync job", {
            error: err.message,
        });
    });
});

// Run once immediately on startup so we don't wait 30 min for the first check
log("info", "Running initial poll on startup...");
pollAndSyncNew().catch((err) => {
    log("error", "Startup poll failed", { error: err.message });
});

log(
    "info",
    "Cron job scheduled. Running every 30 min (poll) + daily at 2 AM (full sync).",
);

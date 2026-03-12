import NodeCache from 'node-cache';
import logger from '../utils/logger.js';

/**
 * CacheStore — singleton in-memory TTL cache.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  IMPORTANT — PER-WORKER BEHAVIOUR UNDER CLUSTER MODE            │
 * │                                                                 │
 * │  Each Node.js worker process has its OWN copy of this cache.    │
 * │  There is NO shared memory between workers.                     │
 * │                                                                 │
 * │  What this means:                                               │
 * │  • Token refreshes: each worker refreshes independently.        │
 * │    Zoho allows multiple valid tokens per refresh_token, so      │
 * │    this is safe — just slightly more Zoho token calls.          │
 * │  • Records cache: each worker warms up on its first miss.       │
 * │    After warm-up, each worker serves from its own cache.        │
 * │  • Storage cache: same as records — per-worker warm-up.         │
 * │                                                                 │
 * │  GET /api/v1/crm/cache/stats shows THIS WORKER's cache only.   │
 * │  DELETE /api/v1/crm/cache/flush flushes THIS WORKER's cache.   │
 * │                                                                 │
 * │  To flush all workers, call /cache/flush once per worker        │
 * │  (or restart the server for a full reset).                      │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Keys in use:
 *   zoho:access_token                            — Zoho OAuth2 token   TTL: ~3480s
 *   zoho:records:{module}:{page}:{per_page}:...  — Zoho API responses  TTL: 300s
 *   storage:latest:{module}                      — latest.json reads   TTL: 30s
 */
class CacheStore {
    constructor() {
        this._cache = new NodeCache({
            stdTTL:      300,  // default TTL in seconds (overridden per key where needed)
            checkperiod: 60,   // scan for expired keys every 60s
            useClones:   false, // don't clone objects on get/set — better performance
        });

        this._cache.on('expired', (key) => {
            logger.debug('CacheStore: key expired', { key, pid: process.pid });
        });

        this._cache.on('set', (key) => {
            logger.debug('CacheStore: key set', { key, pid: process.pid });
        });
    }

    // ── Core operations ─────────────────────────────────────────────────────

    set(key, value, ttl) {
        const success = ttl !== undefined
            ? this._cache.set(key, value, ttl)
            : this._cache.set(key, value);
        if (!success) logger.warn('CacheStore: failed to set key', { key, pid: process.pid });
        return success;
    }

    get(key)  { return this._cache.get(key);  }
    has(key)  { return this._cache.has(key);  }
    del(key)  { this._cache.del(key);          }

    flush() {
        this._cache.flushAll();
        logger.info('CacheStore: all keys flushed', { pid: process.pid });
    }

    // ── Observability ────────────────────────────────────────────────────────

    /**
     * Returns raw node-cache stats: hits, misses, keys, ksize, vsize.
     */
    stats() {
        return this._cache.getStats();
    }

    /**
     * Returns all active keys with their remaining TTL in seconds.
     * TTL of 0 means the key has no expiry.
     *
     * @returns {{ key: string, ttl: number }[]}
     */
    keys() {
        return this._cache.keys().map(key => ({
            key,
            ttlSeconds: this._cache.getTtl(key)
                ? Math.max(0, Math.round((this._cache.getTtl(key) - Date.now()) / 1000))
                : 0,
        }));
    }

    /**
     * Returns a full diagnostics snapshot for the /cache/stats endpoint.
     *
     * @returns {object}
     */
    diagnostics() {
        const raw   = this._cache.getStats();
        const keys  = this.keys();

        const hitRate = (raw.hits + raw.misses) > 0
            ? ((raw.hits / (raw.hits + raw.misses)) * 100).toFixed(1)
            : '0.0';

        return {
            pid:          process.pid,
            keyCount:     raw.keys,
            hits:         raw.hits,
            misses:       raw.misses,
            hitRatePct:   parseFloat(hitRate),
            ksize:        raw.ksize,   // bytes used by keys
            vsize:        raw.vsize,   // bytes used by values
            keys,
        };
    }
}

export default new CacheStore();

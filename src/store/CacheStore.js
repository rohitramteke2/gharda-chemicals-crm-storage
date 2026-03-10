import NodeCache from 'node-cache';
import logger from '../utils/logger.js';

/**
 * CacheStore — singleton in-memory TTL cache.
 * Used to cache Zoho OAuth2 tokens and hot CRM data.
 */
class CacheStore {
    constructor() {
        this._cache = new NodeCache({
            stdTTL:      300,
            checkperiod: 60,
            useClones:   false,
        });

        this._cache.on('expired', (key) => {
            logger.debug('Cache key expired', { key });
        });
    }

    set(key, value, ttl) {
        const success = ttl !== undefined
            ? this._cache.set(key, value, ttl)
            : this._cache.set(key, value);
        if (!success) logger.warn('CacheStore: failed to set key', { key });
        return success;
    }

    get(key)   { return this._cache.get(key); }
    has(key)   { return this._cache.has(key); }
    del(key)   { this._cache.del(key); }

    flush() {
        this._cache.flushAll();
        logger.info('CacheStore: flushed all keys');
    }

    stats() { return this._cache.getStats(); }
}

export default new CacheStore();

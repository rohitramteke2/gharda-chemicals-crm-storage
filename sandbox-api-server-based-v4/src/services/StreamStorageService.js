import fse from 'fs-extra';
import path from 'path';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

const CHUNK_SIZE = 500; // records per chunk file

/**
 * StreamStorageService — memory-safe chunked storage for large CRM datasets.
 *
 * Instead of loading all records into one JSON file, it:
 *   - Writes records in chunks of 500 to separate files
 *   - Reads only the chunk needed for a given page request
 *   - Never loads the full dataset into memory
 *   - Keeps a lightweight meta.json for quick stats
 *
 * S  — Only responsibility: chunked read/write of large JSON datasets.
 *
 * Directory layout:
 *   storage/crm-data/{Module}/
 *     ├── meta.json          ← total count, chunk count, fetchedAt (always tiny)
 *     ├── chunk_001.json     ← records 1–500
 *     ├── chunk_002.json     ← records 501–1000
 *     └── snapshots/
 *         └── 2026-03-10T10-00-00/
 *             ├── meta.json
 *             ├── chunk_001.json
 *             └── chunk_002.json
 */
class StreamStorageService {
    constructor() {
        this._base = path.resolve(env.STORAGE_BASE_PATH);
    }

    _moduleDir(module)        { return path.join(this._base, module); }
    _snapshotDir(module)      { return path.join(this._moduleDir(module), 'snapshots'); }
    _snapshotPath(module, ts) { return path.join(this._snapshotDir(module), ts); }
    _chunkName(i)             { return `chunk_${String(i).padStart(3, '0')}.json`; }
    _timestamp()              { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); }

    /**
     * Save records in chunks.
     * Processes one chunk at a time — never holds the full array beyond slicing.
     *
     * @param {string}   module
     * @param {object[]} records
     * @returns {Promise<{ metaPath, chunkCount, timestamp }>}
     */
    async saveChunked(module, records) {
        const dir      = this._moduleDir(module);
        const ts       = this._timestamp();
        const snapDir  = this._snapshotPath(module, ts);

        await fse.ensureDir(dir);
        await fse.ensureDir(this._snapshotDir(module));
        await fse.ensureDir(snapDir);

        const chunkCount = Math.ceil(records.length / CHUNK_SIZE);
        const fetchedAt  = new Date().toISOString();

        // Write one chunk at a time — keeps memory usage flat
        for (let i = 0; i < chunkCount; i++) {
            const chunk     = records.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            const chunkName = this._chunkName(i + 1);

            await fse.writeJson(path.join(dir, chunkName),     chunk, { spaces: 2 });
            await fse.writeJson(path.join(snapDir, chunkName), chunk, { spaces: 2 });
        }

        // Meta is always tiny — safe to load any time
        const meta = {
            module,
            fetchedAt,
            totalCount: records.length,
            chunkCount,
            chunkSize:  CHUNK_SIZE,
        };

        const metaPath = path.join(dir, 'meta.json');
        await fse.writeJson(metaPath,                         meta, { spaces: 2 });
        await fse.writeJson(path.join(snapDir, 'meta.json'), meta, { spaces: 2 });

        logger.info('StreamStorageService: saved chunked records', {
            module,
            totalCount: records.length,
            chunkCount,
        });

        return { metaPath, chunkCount, timestamp: ts };
    }

    /**
     * Read a single page of records.
     * Loads only ONE chunk file — never the full dataset.
     *
     * @param {string} module
     * @param {number} page     — 1-based
     * @param {number} pageSize — records per page (max CHUNK_SIZE)
     * @returns {Promise<object|null>}
     */
    async readPage(module, page = 1, pageSize = 50) {
        const dir      = this._moduleDir(module);
        const metaPath = path.join(dir, 'meta.json');

        if (!(await fse.pathExists(metaPath))) return null;

        const meta       = await fse.readJson(metaPath);
        const totalPages = Math.ceil(meta.totalCount / pageSize);
        const offset     = (page - 1) * pageSize;

        // Which chunk file does this offset fall in?
        const chunkIndex = Math.floor(offset / CHUNK_SIZE);
        const chunkPath  = path.join(dir, this._chunkName(chunkIndex + 1));

        if (!(await fse.pathExists(chunkPath))) {
            return {
                records:    [],
                page,
                pageSize,
                totalCount: meta.totalCount,
                totalPages,
                hasMore:    false,
                fetchedAt:  meta.fetchedAt,
            };
        }

        // Load only this one chunk
        const chunk         = await fse.readJson(chunkPath);
        const offsetInChunk = offset % CHUNK_SIZE;
        const records       = chunk.slice(offsetInChunk, offsetInChunk + pageSize);

        return {
            records,
            page,
            pageSize,
            totalCount: meta.totalCount,
            totalPages,
            hasMore:    page < totalPages,
            fetchedAt:  meta.fetchedAt,
        };
    }

    /**
     * Read meta only — never loads any records into memory.
     *
     * @param {string} module
     * @returns {Promise<object|null>}
     */
    async readMeta(module) {
        const metaPath = path.join(this._moduleDir(module), 'meta.json');
        if (!(await fse.pathExists(metaPath))) return null;
        return fse.readJson(metaPath);
    }

    /**
     * List snapshot directory names.
     *
     * @param {string} module
     * @returns {Promise<string[]>}
     */
    async listSnapshots(module) {
        const dir = this._snapshotDir(module);
        if (!(await fse.pathExists(dir))) return [];
        const entries = await fse.readdir(dir, { withFileTypes: true });
        return entries
            .filter(e => e.isDirectory())
            .map(e => e.name)
            .sort()
            .reverse();
    }

    /**
     * Prune snapshot directories older than N days.
     *
     * @param {string} module
     * @param {number} days
     * @returns {Promise<number>} number removed
     */
    async pruneSnapshots(module, days = 30) {
        const dir    = this._snapshotDir(module);
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const dirs   = await fse.readdir(dir).catch(() => []);
        let removed  = 0;

        for (const entry of dirs) {
            const entryPath = path.join(dir, entry);
            const stat      = await fse.stat(entryPath);
            if (stat.mtimeMs < cutoff) {
                await fse.remove(entryPath);
                removed++;
            }
        }

        logger.info('StreamStorageService: pruned old snapshots', { module, removed });
        return removed;
    }
}

export default new StreamStorageService();

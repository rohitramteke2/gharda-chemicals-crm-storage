import fse from 'fs-extra';
import path from 'path';
import { IStorageService } from '../interfaces/IStorageService.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * StorageService — concrete implementation of IStorageService.
 * Persists CRM records as JSON files on the RDP server disk.
 *
 * S  — Only responsibility: read/write JSON files on disk.
 * L  — Extends IStorageService; can be replaced with S3StorageService, etc.
 *
 * Directory layout:
 *   storage/crm-data/
 *     └── {Module}/
 *         ├── latest.json          ← overwritten on every sync
 *         └── snapshots/
 *             └── YYYY-MM-DDTHH-mm-ss.json   ← immutable, pruned after 30d
 */
class StorageService extends IStorageService {
    constructor() {
        super();
        this._base = path.resolve(env.STORAGE_BASE_PATH || env.ATTACHMENT_DIR || './storage');
    }

    _moduleDir(module)   { return path.join(this._base, module); }
    _snapshotDir(module) { return path.join(this._moduleDir(module), 'snapshots'); }
    _timestamp()         { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); }

    async _ensureDirs(module) {
        await fse.ensureDir(this._moduleDir(module));
        await fse.ensureDir(this._snapshotDir(module));
    }

    async save(module, records) {
        await this._ensureDirs(module);

        const payload = {
            module,
            fetchedAt: new Date().toISOString(),
            count:     records.length,
            records,
        };

        const latestPath   = path.join(this._moduleDir(module), 'latest.json');
        const snapshotPath = path.join(this._snapshotDir(module), `${this._timestamp()}.json`);

        await Promise.all([
            fse.writeJson(latestPath,   payload, { spaces: 2 }),
            fse.writeJson(snapshotPath, payload, { spaces: 2 }),
        ]);

        logger.info('StorageService: saved records', {
            module,
            count: records.length,
            latestPath,
            snapshotPath,
        });

        return { latestPath, snapshotPath };
    }

    async readLatest(module) {
        const latestPath = path.join(this._moduleDir(module), 'latest.json');

        if (!(await fse.pathExists(latestPath))) {
            logger.warn('StorageService: no latest.json found', { module });
            return null;
        }

        return fse.readJson(latestPath);
    }

    async listSnapshots(module) {
        const dir = this._snapshotDir(module);
        if (!(await fse.pathExists(dir))) return [];

        const files = await fse.readdir(dir);
        return files.filter(f => f.endsWith('.json')).sort().reverse();
    }

    async readSnapshot(module, filename) {
        const snapshotPath = path.join(this._snapshotDir(module), filename);

        if (!(await fse.pathExists(snapshotPath))) {
            logger.warn('StorageService: snapshot not found', { module, filename });
            return null;
        }

        return fse.readJson(snapshotPath);
    }

    async pruneSnapshots(module, days = 30) {
        const dir    = this._snapshotDir(module);
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const files  = await fse.readdir(dir).catch(() => []);
        let removed  = 0;

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat     = await fse.stat(filePath);
            if (stat.mtimeMs < cutoff) {
                await fse.remove(filePath);
                removed++;
            }
        }

        logger.info('StorageService: pruned old snapshots', { module, removed });
        return removed;
    }
}

export default new StorageService();
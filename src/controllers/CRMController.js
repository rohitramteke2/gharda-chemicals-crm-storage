import { validate, schemas } from '../utils/validator.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import syncQueue from '../store/SyncQueue.js';
import streamStorage from '../services/StreamStorageService.js';

/**
 * CRMController — handles HTTP requests for all CRM endpoints.
 *
 * S  — Only responsibility: validate input, call service, shape HTTP response.
 * D  — Depends on abstractions injected via constructor. No concrete imports.
 * O  — Freshness logic in SyncFreshnessPolicy, chunking in StreamStorageService.
 */
class CRMController {
    constructor(crmService, storageService, freshnessPolicy, attachmentService) {
        this._crm        = crmService;
        this._storage    = storageService;
        this._freshness  = freshnessPolicy;
        this._attachment = attachmentService;
    }

    // GET /crm/records
    async getRecords(req, res, next) {
        try {
            const { error, value } = validate(schemas.crmFetch, req.query);
            if (error) throw new AppError(error.details.map(d => d.message).join('; '), 400, 'VALIDATION_ERROR');

            const { data, info } = await this._crm.fetchRecords(value);

            res.json({
                success:  true,
                module:   value.module,
                page:     value.page,
                per_page: value.per_page,
                info,
                count:    data.length,
                data,
            });

        } catch (err) { next(err); }
    }

    // GET /crm/records/:module/:id
    async getRecordById(req, res, next) {
        try {
            const { module, id } = req.params;
            if (!module || !id) throw new AppError('module and id are required', 400, 'VALIDATION_ERROR');

            const record = await this._crm.fetchRecordById(module, id);
            if (!record) throw new AppError(`Record ${id} not found in ${module}`, 404, 'NOT_FOUND');

            res.json({ success: true, module, data: record });

        } catch (err) { next(err); }
    }

    // GET /crm/sync/status
    async getSyncStatus(req, res, next) {
        try {
            const active = syncQueue.activeModules();
            res.json({
                success:     true,
                activeSyncs: active.length,
                modules:     active,
            });
        } catch (err) { next(err); }
    }

    // POST /crm/sync
    async syncModule(req, res, next) {
        try {
            const { error, value } = validate(schemas.crmSync, req.body);
            if (error) throw new AppError(error.details.map(d => d.message).join('; '), 400, 'VALIDATION_ERROR');

            const { module, overwrite } = value;

            // Sync queue — reject if already running for this module
            if (syncQueue.isRunning(module)) {
                const status = syncQueue.getStatus(module);
                return res.status(409).json({
                    success:   false,
                    message:   `Sync for ${module} is already in progress.`,
                    startedAt: status.startedAt,
                });
            }

            if (!overwrite) {
                const existing              = await this._storage.readLatest(module);
                const { fresh, ageMinutes } = this._freshness.isFresh(existing);

                if (fresh) {
                    return res.json({
                        success:   true,
                        message:   `Data already fresh (fetched ${ageMinutes} min ago). Use overwrite=true to force.`,
                        module,
                        count:     existing.count,
                        fetchedAt: existing.fetchedAt,
                    });
                }
            }

            syncQueue.start(module);

            try {
                logger.info('CRM sync started', { module });
                const records = await this._crm.fetchAllRecords(module);

                const [storage, chunked] = await Promise.all([
                    this._storage.save(module, records),
                    streamStorage.saveChunked(module, records),
                ]);

                res.json({
                    success:    true,
                    message:    `Sync complete for ${module}`,
                    module,
                    count:      records.length,
                    chunkCount: chunked.chunkCount,
                    latestPath: storage.latestPath,
                    syncedAt:   new Date().toISOString(),
                });

            } finally {
                syncQueue.finish(module);
            }

        } catch (err) { next(err); }
    }

    // GET /crm/storage/:module
    async getStoredData(req, res, next) {
        try {
            const { module } = req.params;
            const data = await this._storage.readLatest(module);
            if (!data) throw new AppError(`No stored data for module: ${module}. Run /sync first.`, 404, 'NOT_FOUND');

            res.json({ success: true, ...data });

        } catch (err) { next(err); }
    }

    // GET /crm/storage/:module/paged?page=1&pageSize=50
    async getPagedData(req, res, next) {
        try {
            const { module } = req.params;
            const page       = parseInt(req.query.page     || '1',  10);
            const pageSize   = parseInt(req.query.pageSize || '50', 10);

            if (page < 1)       throw new AppError('page must be >= 1',       400, 'VALIDATION_ERROR');
            if (pageSize < 1)   throw new AppError('pageSize must be >= 1',   400, 'VALIDATION_ERROR');
            if (pageSize > 500) throw new AppError('pageSize must be <= 500', 400, 'VALIDATION_ERROR');

            const result = await streamStorage.readPage(module, page, pageSize);
            if (!result) throw new AppError(`No chunked data for module: ${module}. Run /sync first.`, 404, 'NOT_FOUND');

            res.json({ success: true, module, ...result });

        } catch (err) { next(err); }
    }

    // GET /crm/storage/:module/meta
    async getStorageMeta(req, res, next) {
        try {
            const { module } = req.params;
            const meta = await streamStorage.readMeta(module);
            if (!meta) throw new AppError(`No meta found for module: ${module}. Run /sync first.`, 404, 'NOT_FOUND');

            res.json({ success: true, module, ...meta });

        } catch (err) { next(err); }
    }

    // GET /crm/storage/:module/snapshots
    async listSnapshots(req, res, next) {
        try {
            const { module } = req.params;
            const snapshots  = await this._storage.listSnapshots(module);

            res.json({ success: true, module, count: snapshots.length, snapshots });

        } catch (err) { next(err); }
    }

    // GET /crm/storage/:module/snapshots/:filename
    async getSnapshot(req, res, next) {
        try {
            const { module, filename } = req.params;

            const data = await this._storage.readSnapshot(module, filename);
            if (!data) throw new AppError(`Snapshot not found: ${filename}`, 404, 'NOT_FOUND');

            res.json({ success: true, ...data });

        } catch (err) { next(err); }
    }

    // GET /crm/attachments/:module/:recordId
    async getAttachments(req, res, next) {
        try {
            const { module, recordId } = req.params;
            if (!module || !recordId) {
                throw new AppError('module and recordId are required', 400, 'VALIDATION_ERROR');
            }

            const attachments = await this._attachment.fetchAttachmentList(module, recordId);

            res.json({
                success:     true,
                module,
                recordId,
                count:       attachments.length,
                attachments,
            });

        } catch (err) { next(err); }
    }

    // POST /crm/attachments/:module/:recordId/download
    async downloadAttachments(req, res, next) {
        try {
            const { module, recordId } = req.params;
            if (!module || !recordId) {
                throw new AppError('module and recordId are required', 400, 'VALIDATION_ERROR');
            }

            const result = await this._attachment.downloadAllAttachments(module, recordId);

            res.json({ success: true, ...result });

        } catch (err) { next(err); }
    }
}

export default CRMController;

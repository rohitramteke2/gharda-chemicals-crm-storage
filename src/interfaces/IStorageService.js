/**
 * IStorageService — Abstract interface for CRM data persistence.
 *
 * Default implementation writes JSON to RDP disk (StorageService).
 * Could be swapped for S3, Redis, or any other store
 * without touching any controller or route.
 */
export class IStorageService {
    async save(module, records)          { throw new Error('save() must be implemented'); }
    async readLatest(module)             { throw new Error('readLatest() must be implemented'); }
    async listSnapshots(module)          { throw new Error('listSnapshots() must be implemented'); }
    async readSnapshot(module, filename) { throw new Error('readSnapshot() must be implemented'); }
    async pruneSnapshots(module, days)   { throw new Error('pruneSnapshots() must be implemented'); }
}

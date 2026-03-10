/**
 * SyncQueue — in-memory lock map to prevent concurrent syncs per module.
 *
 * S  — Single responsibility: track which modules are currently syncing.
 *
 * If a sync for "Leads" is already running and another request comes in,
 * the second request gets a 409 instead of hammering Zoho twice and
 * causing a race condition on disk writes.
 */
class SyncQueue {
    constructor() {
        this._active = new Map();
    }

    isRunning(module) {
        return this._active.has(module);
    }

    start(module) {
        this._active.set(module, { startedAt: new Date().toISOString() });
    }

    finish(module) {
        this._active.delete(module);
    }

    getStatus(module) {
        return this._active.get(module) || null;
    }

    activeModules() {
        return Array.from(this._active.keys());
    }
}

export default new SyncQueue();

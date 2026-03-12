/**
 * SyncFreshnessPolicy — encapsulates the "is stored data fresh?" decision.
 *
 * S  — Single responsibility: own the staleness business rule.
 * O  — Subclass or replace to change strategy (time-based, count-based, hash-based)
 *      without touching CRMController.
 */
export class SyncFreshnessPolicy {
    /**
     * @param {number} maxAgeMinutes — How old data can be before re-sync is needed. Default: 30.
     */
    constructor(maxAgeMinutes = 30) {
        this._maxAgeMs = maxAgeMinutes * 60 * 1000;
    }

    /**
     * Returns whether the stored data is still fresh.
     *
     * @param {{ fetchedAt: string } | null} storedMeta
     * @returns {{ fresh: boolean, ageMinutes: number }}
     */
    isFresh(storedMeta) {
        if (!storedMeta?.fetchedAt) return { fresh: false, ageMinutes: Infinity };

        const ageMs      = Date.now() - new Date(storedMeta.fetchedAt).getTime();
        const ageMinutes = Math.round(ageMs / 60_000);
        const fresh      = ageMs < this._maxAgeMs;

        return { fresh, ageMinutes };
    }
}

export default new SyncFreshnessPolicy(30);

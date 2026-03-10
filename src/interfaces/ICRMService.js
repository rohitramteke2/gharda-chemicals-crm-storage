/**
 * ICRMService — Abstract interface for any CRM provider.
 *
 * D  — Controllers depend on this abstraction, not on ZohoService directly.
 * L  — Any subclass can replace ZohoService without breaking callers.
 * O  — Add new CRM providers by extending — never modify controllers.
 */
export class ICRMService {
    async fetchRecords(opts) {
        throw new Error('fetchRecords() must be implemented');
    }

    async fetchRecordById(module, id) {
        throw new Error('fetchRecordById() must be implemented');
    }

    async fetchAllRecords(module, opts) {
        throw new Error('fetchAllRecords() must be implemented');
    }
}

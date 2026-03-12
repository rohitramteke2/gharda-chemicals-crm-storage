/**
 * IAttachmentService — Abstract interface for attachment operations.
 *
 * D  — Controllers depend on this abstraction, not AttachmentService directly.
 * L  — Any subclass can replace AttachmentService without breaking callers.
 * O  — Add new storage strategies by extending — never modify controllers.
 */
export class IAttachmentService {
    async fetchAttachmentList(module, recordId) {
        throw new Error('fetchAttachmentList() must be implemented');
    }

    async downloadAttachment(module, recordId, attachmentId, fileName) {
        throw new Error('downloadAttachment() must be implemented');
    }

    async downloadAllAttachments(module, recordId) {
        throw new Error('downloadAllAttachments() must be implemented');
    }
}
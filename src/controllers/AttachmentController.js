import attachmentService from '../services/ZohoAttachmentService.js';
import logger from '../utils/logger.js';

class AttachmentController {

    /**
     * GET /attachments/:module/:recordId
     * List all attachments for a Zoho CRM record (without downloading).
     */
    async list(req, res, next) {
        try {
            const { module, recordId } = req.params;
            const attachments = await attachmentService.listAttachments(module, recordId);

            res.json({
                success: true,
                data: { module, recordId, count: attachments.length, attachments },
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /attachments/:module/:recordId/download
     * Download ALL attachments for a record → save to RDP disk → return paths.
     */
    async downloadAll(req, res, next) {
        try {
            const { module, recordId } = req.params;
            const result = await attachmentService.downloadAll(module, recordId);

            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /attachments/:module/:recordId/download/:attachmentId
     * Download a SINGLE attachment by ID → save to RDP disk → return path.
     *
     * Body (optional): { "fileName": "report.pdf" }
     * If fileName is omitted, we fetch the attachment list first to find it.
     */
    async downloadOne(req, res, next) {
        try {
            const { module, recordId, attachmentId } = req.params;
            let { fileName } = req.body || {};

            // If caller didn't provide fileName, look it up from Zoho
            if (!fileName) {
                const list = await attachmentService.listAttachments(module, recordId);
                const match = list.find(a => a.id === attachmentId);
                if (!match) {
                    return res.status(404).json({
                        success: false,
                        error: { code: 'ATTACHMENT_NOT_FOUND', message: `Attachment ${attachmentId} not found on record ${recordId}` },
                    });
                }
                fileName = match.fileName;
            }

            const result = await attachmentService.downloadOne(module, recordId, attachmentId, fileName);

            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /attachments/:module/:recordId/upload
     * Upload a file → attach to Zoho CRM record + save to RDP disk → return both.
     *
     * Multipart form-data with field name "file".
     */
    async upload(req, res, next) {
        try {
            const { module, recordId } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'NO_FILE', message: 'No file provided. Send a file with field name "file".' },
                });
            }

            const result = await attachmentService.uploadAttachment(module, recordId, req.file);

            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }
}

export default new AttachmentController();
